import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATASET_URL = 'https://data.unesco.org/api/explore/v2.1/catalog/datasets/whc001/records';
const PAGE_SIZE = 100;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'src', 'data');
const RAW_OUTPUT = path.join(DATA_DIR, 'unesco-world-heritage.raw.json');
const APP_OUTPUT = path.join(DATA_DIR, 'unesco-world-heritage.json');

const NORTH_AMERICA_COUNTRIES = new Set([
  'Antigua and Barbuda',
  'Bahamas',
  'Barbados',
  'Belize',
  'Canada',
  'Costa Rica',
  'Cuba',
  'Dominica',
  'Dominican Republic',
  'El Salvador',
  'Grenada',
  'Guatemala',
  'Haiti',
  'Honduras',
  'Jamaica',
  'Mexico',
  'Nicaragua',
  'Panama',
  'Saint Kitts and Nevis',
  'Saint Lucia',
  'Saint Vincent and the Grenadines',
  'Trinidad and Tobago',
  'United States of America',
]);

const SOUTH_AMERICA_COUNTRIES = new Set([
  'Argentina',
  'Bolivia (Plurinational State of)',
  'Brazil',
  'Chile',
  'Colombia',
  'Ecuador',
  'Guyana',
  'Paraguay',
  'Peru',
  'Suriname',
  'Uruguay',
  'Venezuela (Bolivarian Republic of)',
]);

const OCEANIA_COUNTRIES = new Set([
  'Australia',
  'Cook Islands',
  'Fiji',
  'Kiribati',
  'Marshall Islands',
  'Micronesia (Federated States of)',
  'Nauru',
  'New Zealand',
  'Niue',
  'Palau',
  'Papua New Guinea',
  'Samoa',
  'Solomon Islands',
  'Tonga',
  'Tuvalu',
  'Vanuatu',
]);

const COUNTRY_LABEL_OVERRIDES = {
  'United States of America': 'USA',
  'United Kingdom of Great Britain and Northern Ireland': 'UK',
  'Russian Federation': 'Russia',
  'Iran (Islamic Republic of)': 'Iran',
  'Korea, Republic of': 'South Korea',
  "Korea, Democratic People's Republic of": 'North Korea',
  'Viet Nam': 'Vietnam',
  'Lao People\'s Democratic Republic': 'Laos',
  'Syrian Arab Republic': 'Syria',
  'Bolivia (Plurinational State of)': 'Bolivia',
  'Venezuela (Bolivarian Republic of)': 'Venezuela',
  'Moldova, Republic of': 'Moldova',
  'North Macedonia': 'North Macedonia',
  'Côte d’Ivoire': "Cote d'Ivoire",
  'Côte d\'Ivoire': "Cote d'Ivoire",
  'Czechia': 'Czechia',
  'United Republic of Tanzania': 'Tanzania',
};

const CATEGORY_MAP = {
  Cultural: 'Cultural',
  Natural: 'Natural',
  Mixed: 'Mixed',
};

const normalizeCountryLabel = (country) => COUNTRY_LABEL_OVERRIDES[country] ?? country;

const resolveContinent = (record) => {
  const primaryCountry = normalizeCountryLabel(record.states_names?.[0] ?? 'Unknown');
  const rawCountry = record.states_names?.[0] ?? 'Unknown';

  if (OCEANIA_COUNTRIES.has(rawCountry) || OCEANIA_COUNTRIES.has(primaryCountry)) return 'Oceania';
  if (SOUTH_AMERICA_COUNTRIES.has(rawCountry) || SOUTH_AMERICA_COUNTRIES.has(primaryCountry)) return 'S.America';
  if (NORTH_AMERICA_COUNTRIES.has(rawCountry) || NORTH_AMERICA_COUNTRIES.has(primaryCountry)) return 'N.America';

  switch (record.region) {
    case 'Africa':
      return 'Africa';
    case 'Arab States':
      return 'Asia';
    case 'Asia and the Pacific':
      return 'Asia';
    case 'Europe and North America':
      return 'Europe';
    case 'Latin America and the Caribbean':
      return 'S.America';
    default:
      return 'Asia';
  }
};

const toProjectRecord = (record) => {
  const lat = record.coordinates?.lat ?? null;
  const lon = record.coordinates?.lon ?? null;
  const country = normalizeCountryLabel(record.states_names?.[0] ?? 'Unknown');
  const image =
    record.main_image_url ||
    record.images_urls?.split(',')[0]?.trim() ||
    `https://picsum.photos/seed/unesco-${record.id_no}/400/300`;

  return {
    id: `unesco-${record.id_no}`,
    unescoId: String(record.id_no),
    uuid: record.uuid ?? null,
    name: record.name_en,
    country,
    countries: (record.states_names ?? []).map(normalizeCountryLabel),
    continent: resolveContinent(record),
    region: record.region,
    year: String(record.date_inscribed ?? ''),
    coords: lat !== null && lon !== null ? { lat, lon } : null,
    image,
    category: CATEGORY_MAP[record.category] ?? 'Cultural',
    description: record.short_description_en || record.description_en || 'UNESCO World Heritage site.',
    criteria: record.criteria_txt ?? null,
    transboundary: record.transboundary === 'True',
    danger: record.danger === 'True',
    areaHectares: record.area_hectares ?? null,
    isoCodes: record.iso_codes ? record.iso_codes.split(',').map((code) => code.trim()) : [],
    source: {
      provider: 'UNESCO DataHub',
      datasetId: 'whc001',
      sourceUrl: `https://whc.unesco.org/en/list/${record.id_no}/`,
      license: 'CC BY-SA 4.0',
    },
  };
};

const fetchPage = async (offset) => {
  const url = new URL(DATASET_URL);
  url.searchParams.set('limit', String(PAGE_SIZE));
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('order_by', 'id_no');

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`UNESCO API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

const main = async () => {
  const firstPage = await fetchPage(0);
  const total = Number(firstPage.total_count ?? 0);
  const results = [...(firstPage.results ?? [])];

  for (let offset = PAGE_SIZE; offset < total; offset += PAGE_SIZE) {
    const page = await fetchPage(offset);
    results.push(...(page.results ?? []));
  }

  const normalized = results
    .filter((record) => record.name_en && record.id_no)
    .map(toProjectRecord)
    .sort((a, b) => Number(a.unescoId) - Number(b.unescoId));

  const rawPayload = {
    fetchedAt: new Date().toISOString(),
    provider: 'UNESCO DataHub',
    datasetId: 'whc001',
    total: results.length,
    records: results,
  };

  const projectPayload = {
    fetchedAt: new Date().toISOString(),
    provider: 'UNESCO DataHub',
    datasetId: 'whc001',
    total: normalized.length,
    attribution: 'UNESCO DataHub / World Heritage List (CC BY-SA 4.0)',
    records: normalized,
  };

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(RAW_OUTPUT, `${JSON.stringify(rawPayload, null, 2)}\n`, 'utf8');
  await writeFile(APP_OUTPUT, `${JSON.stringify(projectPayload, null, 2)}\n`, 'utf8');

  console.log(`Saved ${results.length} raw UNESCO records -> ${RAW_OUTPUT}`);
  console.log(`Saved ${normalized.length} normalized records -> ${APP_OUTPUT}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
