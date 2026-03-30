import * as d3 from 'd3-geo';
import { create } from 'zustand';

export interface HeritageSite {
  id: string;
  name: string;
  country: string;
  continent: string;
  year: string;
  coords: [number, number, number]; // [x, y, z] for sphere
  flatCoords: [number, number, number]; // [x, y, z] for flat map
  image: string;
  category: 'Cultural' | 'Natural' | 'Mixed';
  description: string;
}

interface AppState {
  viewMode: 'sphere' | 'flat';
  selectedContinent: string | null;
  selectedCountry: string | null;
  selectedSiteId: string | null;
  hoveredSiteId: string | null;
  dismissedSiteId: string | null;
  sites: HeritageSite[];
  isRotating: boolean;
  isPointerOverGlobe: boolean;
  wasRotatingBeforeGlobeHover: boolean;
  isSitesHydrated: boolean;
  setViewMode: (mode: 'sphere' | 'flat') => void;
  setSelectedContinent: (continent: string | null) => void;
  setSelectedCountry: (country: string | null) => void;
  setSelectedSiteId: (id: string | null) => void;
  setHoveredSiteId: (id: string | null) => void;
  setPointerOverGlobe: (isOver: boolean) => void;
  dismissActiveCard: () => void;
  setRotating: (rotating: boolean) => void;
  initializeSites: () => Promise<void>;
}

// Helper to convert Lat/Lon to 3D Sphere coordinates
const latLonToSphere = (lat: number, lon: number, radius: number): [number, number, number] => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return [x, y, z];
};

// Helper to convert Lat/Lon to Flat map coordinates
const latLonToFlat = (lat: number, lon: number): [number, number, number] => {
  const x = (lon / 180) * 10;
  const y = (lat / 90) * 5;
  return [x, y, 0];
};

const REAL_SITES: Partial<HeritageSite>[] = [
  { name: 'Great Wall of China', country: 'China', continent: 'Asia', year: '1987', category: 'Cultural', coords: [40.4319, 116.5704, 0] as any, description: 'A series of fortifications built across the historical northern borders of ancient Chinese states.' },
  { name: 'Pyramids of Giza', country: 'Egypt', continent: 'Africa', year: '1979', category: 'Cultural', coords: [29.9792, 31.1342, 0] as any, description: 'The oldest of the Seven Wonders of the Ancient World, and the only one to remain largely intact.' },
  { name: 'Machu Picchu', country: 'Peru', continent: 'S.America', year: '1983', category: 'Mixed', coords: [-13.1631, -72.5450, 0] as any, description: 'A 15th-century Inca citadel located in the Eastern Cordillera of southern Peru.' },
  { name: 'Taj Mahal', country: 'India', continent: 'Asia', year: '1983', category: 'Cultural', coords: [27.1751, 78.0421, 0] as any, description: 'An ivory-white marble mausoleum on the right bank of the river Yamuna.' },
  { name: 'Colosseum', country: 'Italy', continent: 'Europe', year: '1980', category: 'Cultural', coords: [41.8902, 12.4922, 0] as any, description: 'An oval amphitheatre in the centre of the city of Rome, Italy.' },
  { name: 'Statue of Liberty', country: 'USA', continent: 'N.America', year: '1984', category: 'Cultural', coords: [40.6892, -74.0445, 0] as any, description: 'A colossal neoclassical sculpture on Liberty Island in New York Harbor.' },
  { name: 'Great Barrier Reef', country: 'Australia', continent: 'Oceania', year: '1981', category: 'Natural', coords: [-18.2871, 147.6992, 0] as any, description: 'The world\'s largest coral reef system composed of over 2,900 individual reefs.' },
  { name: 'Petra', country: 'Jordan', continent: 'Asia', year: '1985', category: 'Cultural', coords: [30.3285, 35.4444, 0] as any, description: 'A historical and archaeological city in southern Jordan.' },
  { name: 'Acropolis of Athens', country: 'Greece', continent: 'Europe', year: '1987', category: 'Cultural', coords: [37.9715, 23.7257, 0] as any, description: 'An ancient citadel located on a rocky outcrop above the city of Athens.' },
  { name: 'Angkor Wat', country: 'Cambodia', continent: 'Asia', year: '1992', category: 'Cultural', coords: [13.4125, 103.8670, 0] as any, description: 'A temple complex in Cambodia and the largest religious monument in the world.' },
  { name: 'Chichen Itza', country: 'Mexico', continent: 'N.America', year: '1988', category: 'Cultural', coords: [20.6843, -88.5678, 0] as any, description: 'A large pre-Columbian city built by the Maya people of the Terminal Classic period.' },
  { name: 'Stonehenge', country: 'UK', continent: 'Europe', year: '1986', category: 'Cultural', coords: [51.1789, -1.8262, 0] as any, description: 'A prehistoric monument in Wiltshire, England.' },
  { name: 'Galápagos Islands', country: 'Ecuador', continent: 'S.America', year: '1978', category: 'Natural', coords: [-0.8293, -90.9821, 0] as any, description: 'An archipelago of volcanic islands distributed on either side of the equator.' },
  { name: 'Serengeti National Park', country: 'Tanzania', continent: 'Africa', year: '1981', category: 'Natural', coords: [-2.3333, 34.8333, 0] as any, description: 'A Tanzanian national park in the Serengeti ecosystem in the Mara and Simiyu regions.' },
  { name: 'Mount Fuji', country: 'Japan', continent: 'Asia', year: '2013', category: 'Cultural', coords: [35.3606, 138.7274, 0] as any, description: 'An active stratovolcano that last erupted in 1707–1708.' },
];

const COUNTRY_BOUNDS: Record<string, { lat: [number, number]; lon: [number, number] }> = {
  Egypt: { lat: [22, 31.5], lon: [25, 36] },
  Tanzania: { lat: [-11.8, -1], lon: [29, 40] },
  Kenya: { lat: [-4.8, 5.2], lon: [34, 42] },
  Morocco: { lat: [28, 35.9], lon: [-13, -1] },
  'South Africa': { lat: [-34.9, -22], lon: [16, 33] },
  China: { lat: [20, 45], lon: [98, 124] },
  India: { lat: [8, 33], lon: [68, 89] },
  Japan: { lat: [31, 43], lon: [130, 142] },
  Thailand: { lat: [6, 20], lon: [98, 105] },
  Vietnam: { lat: [8, 23.5], lon: [102, 109.8] },
  Italy: { lat: [37, 46.8], lon: [7, 18.8] },
  France: { lat: [43, 50.8], lon: [-1.8, 7.8] },
  Spain: { lat: [36, 43.8], lon: [-9.5, 3.5] },
  Germany: { lat: [47, 55], lon: [6, 15.5] },
  UK: { lat: [50, 58.7], lon: [-7.8, 1.8] },
  USA: { lat: [25, 48.5], lon: [-124, -66] },
  Canada: { lat: [43, 60], lon: [-128, -60] },
  Mexico: { lat: [15, 32.5], lon: [-117, -86] },
  Brazil: { lat: [-30, 4.5], lon: [-74, -35] },
  Argentina: { lat: [-50, -22], lon: [-73, -53] },
  Peru: { lat: [-18.5, -0.1], lon: [-81.5, -68] },
  Chile: { lat: [-52, -18], lon: [-75, -66] },
  Australia: { lat: [-39, -12], lon: [113, 153] },
  'New Zealand': { lat: [-46.5, -34], lon: [166, 178.5] },
};

const COUNTRY_ALIASES: Record<string, string[]> = {
  USA: ['United States of America', 'United States', 'USA'],
  UK: ['United Kingdom', 'UK'],
};

type GeoFeature = {
  type: 'Feature';
  properties: {
    name?: string;
  };
  geometry?: GeoJSON.Geometry | null;
};

type GeoFeatureWithGeometry = GeoFeature & {
  geometry: GeoJSON.Geometry;
};

let sitesInitializationPromise: Promise<void> | null = null;

const randomInRange = ([min, max]: [number, number]) => min + Math.random() * (max - min);

const randomPointForCountry = (country: string): [number, number] => {
  const bounds = COUNTRY_BOUNDS[country];
  if (!bounds) {
    return [-40 + Math.random() * 80, -160 + Math.random() * 320];
  }

  // Pull away slightly from coastlines so synthetic points are more likely to land on the country mass.
  const latPadding = Math.min((bounds.lat[1] - bounds.lat[0]) * 0.12, 2);
  const lonPadding = Math.min((bounds.lon[1] - bounds.lon[0]) * 0.12, 2);
  const latRange: [number, number] = [bounds.lat[0] + latPadding, bounds.lat[1] - latPadding];
  const lonRange: [number, number] = [bounds.lon[0] + lonPadding, bounds.lon[1] - lonPadding];

  return [randomInRange(latRange), randomInRange(lonRange)];
};

const resolveFeatureNameCandidates = (country: string) => [country, ...(COUNTRY_ALIASES[country] ?? [])];

const findFeatureForCountry = (features: GeoFeature[], country: string) => {
  const candidates = resolveFeatureNameCandidates(country).map((name) => name.toLowerCase());
  return features.find((feature) => {
    const featureName = feature.properties?.name?.toLowerCase();
    return featureName ? candidates.includes(featureName) : false;
  });
};

const randomPointInFeature = (feature: GeoFeature): [number, number] | null => {
  if (!feature.geometry) return null;
  const polygonFeature = feature as GeoFeatureWithGeometry;

  const [[minLon, minLat], [maxLon, maxLat]] = d3.geoBounds(polygonFeature);
  const lonSpan = maxLon - minLon;
  const latSpan = maxLat - minLat;

  if (lonSpan <= 0 || latSpan <= 0) return null;

  const latPadding = Math.min(latSpan * 0.08, 1.5);
  const lonPadding = Math.min(lonSpan * 0.08, 1.5);
  const paddedMinLat = minLat + latPadding;
  const paddedMaxLat = maxLat - latPadding;
  const paddedMinLon = minLon + lonPadding;
  const paddedMaxLon = maxLon - lonPadding;

  for (let attempt = 0; attempt < 400; attempt += 1) {
    const lat = randomInRange([paddedMinLat, paddedMaxLat]);
    const lon = randomInRange([paddedMinLon, paddedMaxLon]);
    if (d3.geoContains(polygonFeature, [lon, lat])) {
      return [lat, lon];
    }
  }

  for (let attempt = 0; attempt < 200; attempt += 1) {
    const lat = randomInRange([minLat, maxLat]);
    const lon = randomInRange([minLon, maxLon]);
    if (d3.geoContains(polygonFeature, [lon, lat])) {
      return [lat, lon];
    }
  }

  return null;
};

const buildHeritageSites = (features?: GeoFeature[]): HeritageSite[] => {
  const sites: HeritageSite[] = [];
  
  REAL_SITES.forEach((site, i) => {
    const [lat, lon] = site.coords as any;
    sites.push({
      id: `site-${i}`,
      name: site.name!,
      country: site.country!,
      continent: site.continent!,
      year: site.year!,
      category: site.category as any,
      description: site.description!,
      coords: latLonToSphere(lat, lon, 5.2),
      flatCoords: latLonToFlat(lat, lon),
      image: `https://picsum.photos/seed/${site.name?.replace(/\s/g, '')}/400/300`,
    });
  });

  // Add some random sites to fill the map
  const continents = ['Africa', 'Asia', 'Europe', 'N.America', 'S.America', 'Oceania'];
  const countries = {
    'Africa': ['Egypt', 'Tanzania', 'Kenya', 'Morocco', 'South Africa'],
    'Asia': ['China', 'India', 'Japan', 'Thailand', 'Vietnam'],
    'Europe': ['Italy', 'France', 'Spain', 'Germany', 'UK'],
    'N.America': ['USA', 'Canada', 'Mexico'],
    'S.America': ['Brazil', 'Argentina', 'Peru', 'Chile'],
    'Oceania': ['Australia', 'New Zealand'],
  };

  for (let i = 0; i < 200; i++) {
    const continent = continents[Math.floor(Math.random() * continents.length)];
    const countryList = (countries as any)[continent];
    const country = countryList[Math.floor(Math.random() * countryList.length)];
    const feature = features ? findFeatureForCountry(features, country) : null;
    const sampledPoint = feature ? randomPointInFeature(feature) : null;
    const [lat, lon] = sampledPoint ?? randomPointForCountry(country);

    sites.push({
      id: `random-${i}`,
      name: `Heritage Site ${i + 1}`,
      country,
      continent,
      year: `${Math.floor(Math.random() * 50 + 1970)}`,
      category: Math.random() > 0.7 ? 'Natural' : 'Cultural',
      description: 'A site of outstanding universal value to humanity.',
      coords: latLonToSphere(lat, lon, 5.2),
      flatCoords: latLonToFlat(lat, lon),
      image: `https://picsum.photos/seed/site-${i}/400/300`,
    });
  }

  return sites;
};

export const useStore = create<AppState>((set) => ({
  viewMode: 'sphere',
  selectedContinent: null,
  selectedCountry: null,
  selectedSiteId: null,
  hoveredSiteId: null,
  dismissedSiteId: null,
  sites: buildHeritageSites(),
  isRotating: true,
  isPointerOverGlobe: false,
  wasRotatingBeforeGlobeHover: true,
  isSitesHydrated: false,
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedContinent: (continent) =>
    set({ selectedContinent: continent, selectedCountry: null, selectedSiteId: null, hoveredSiteId: null }),
  setSelectedCountry: (country) => set({ selectedCountry: country, selectedSiteId: null, hoveredSiteId: null }),
  setSelectedSiteId: (id) => set({ selectedSiteId: id, dismissedSiteId: id ? null : null }),
  setHoveredSiteId: (id) =>
    set((state) => ({
      hoveredSiteId: id,
      dismissedSiteId: id && state.dismissedSiteId !== id ? null : state.dismissedSiteId,
    })),
  setPointerOverGlobe: (isOver) =>
    set((state) => ({
      isPointerOverGlobe: isOver,
      wasRotatingBeforeGlobeHover:
        isOver && !state.isPointerOverGlobe ? state.isRotating : state.wasRotatingBeforeGlobeHover,
      isRotating:
        isOver && !state.isPointerOverGlobe
          ? false
          : !isOver && state.isPointerOverGlobe
            ? state.wasRotatingBeforeGlobeHover
            : state.isRotating,
    })),
  dismissActiveCard: () =>
    set((state) => ({
      dismissedSiteId: state.hoveredSiteId ?? state.selectedSiteId,
      hoveredSiteId: null,
    })),
  setRotating: (rotating) => set((state) => ({
    isRotating: rotating,
    wasRotatingBeforeGlobeHover: state.isPointerOverGlobe ? rotating : state.wasRotatingBeforeGlobeHover,
  })),
  initializeSites: async () => {
    if (sitesInitializationPromise) {
      await sitesInitializationPromise;
      return;
    }

    sitesInitializationPromise = (async () => {
      try {
        const response = await fetch(
          'https://raw.githubusercontent.com/datasets/geo-boundaries-world-110m/master/countries.geojson',
        );
        const geoData = await response.json();
        const features = Array.isArray(geoData?.features) ? geoData.features : [];
        if (features.length > 0) {
          set({ sites: buildHeritageSites(features), isSitesHydrated: true });
          return;
        }
      } catch (error) {
        console.warn('Failed to refine site positions from country polygons.', error);
      }

      set({ isSitesHydrated: true });
    })();

    await sitesInitializationPromise;
  },
}));
