import { create } from 'zustand';
import unescoData from './data/unesco-world-heritage.json';
import unescoImageMap from './data/unesco-image-map.json';

export interface HeritageSite {
  id: string;
  name: string;
  country: string;
  continent: string;
  year: string;
  coords: [number, number, number];
  flatCoords: [number, number, number];
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
  showOcean: boolean;
  showLand: boolean;
  showBorders: boolean;
  showSites: boolean;
  showLabels: boolean;
  setViewMode: (mode: 'sphere' | 'flat') => void;
  setSelectedContinent: (continent: string | null) => void;
  setSelectedCountry: (country: string | null) => void;
  setSelectedSiteId: (id: string | null) => void;
  setHoveredSiteId: (id: string | null) => void;
  setPointerOverGlobe: (isOver: boolean) => void;
  dismissActiveCard: () => void;
  setRotating: (rotating: boolean) => void;
  toggleOcean: () => void;
  toggleLand: () => void;
  toggleBorders: () => void;
  toggleSites: () => void;
  toggleLabels: () => void;
  initializeSites: () => Promise<void>;
}

type SourceRecord = {
  id: string;
  unescoId: string;
  name: string;
  country: string;
  continent: string;
  year: string;
  coords: { lat: number; lon: number } | null;
  image: string;
  category: 'Cultural' | 'Natural' | 'Mixed';
  description: string;
};

const GLOBE_RADIUS = 5.02;

const latLonToSphere = (lat: number, lon: number, radius: number): [number, number, number] => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return [x, y, z];
};

const latLonToFlat = (lat: number, lon: number): [number, number, number] => {
  const x = (lon / 180) * 10;
  const y = (lat / 90) * 5;
  return [x, y, 0.12];
};

const buildHeritageSites = () => {
  const localImages = (unescoImageMap as { images?: Record<string, string> }).images ?? {};
  const records = ((unescoData as { records?: SourceRecord[] }).records ?? []).filter(
    (record): record is SourceRecord & { coords: { lat: number; lon: number } } =>
      Boolean(record.id && record.name && record.coords?.lat !== undefined && record.coords?.lon !== undefined),
  );

  return records.map((record) => ({
    id: record.id,
    name: record.name,
    country: record.country,
    continent: record.continent,
    year: record.year,
    category: record.category,
    description: record.description,
    coords: latLonToSphere(record.coords.lat, record.coords.lon, GLOBE_RADIUS),
    flatCoords: latLonToFlat(record.coords.lat, record.coords.lon),
    image: localImages[record.unescoId] ?? record.image,
  })) satisfies HeritageSite[];
};

const OFFICIAL_SITES = buildHeritageSites();

export const useStore = create<AppState>((set) => ({
  viewMode: 'sphere',
  selectedContinent: null,
  selectedCountry: null,
  selectedSiteId: null,
  hoveredSiteId: null,
  dismissedSiteId: null,
  sites: OFFICIAL_SITES,
  isRotating: true,
  isPointerOverGlobe: false,
  wasRotatingBeforeGlobeHover: true,
  isSitesHydrated: true,
  showOcean: true,
  showLand: true,
  showBorders: true,
  showSites: true,
  showLabels: true,
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
  setRotating: (rotating) =>
    set((state) => ({
      isRotating: rotating,
      wasRotatingBeforeGlobeHover: state.isPointerOverGlobe ? rotating : state.wasRotatingBeforeGlobeHover,
    })),
  toggleOcean: () => set((state) => ({ showOcean: !state.showOcean })),
  toggleLand: () => set((state) => ({ showLand: !state.showLand })),
  toggleBorders: () => set((state) => ({ showBorders: !state.showBorders })),
  toggleSites: () => set((state) => ({ showSites: !state.showSites })),
  toggleLabels: () => set((state) => ({ showLabels: !state.showLabels })),
  initializeSites: async () => {
    set({ sites: OFFICIAL_SITES, isSitesHydrated: true });
  },
}));
