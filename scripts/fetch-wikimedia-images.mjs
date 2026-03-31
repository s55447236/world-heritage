import { access, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SPARQL_URL = 'https://query.wikidata.org/sparql';
const IMAGE_DIR_RELATIVE = path.join('public', 'images', 'sites');
const IMAGE_MAP_RELATIVE = path.join('src', 'data', 'unesco-image-map.json');
const UNESCO_DATA_RELATIVE = path.join('src', 'data', 'unesco-world-heritage.json');
const THUMBNAIL_WIDTH = 800;
const DEFAULT_DELAY_MS = 1200;
const DEFAULT_LIMIT = 40;
const MAX_RETRIES = 4;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const IMAGE_DIR = path.join(ROOT_DIR, IMAGE_DIR_RELATIVE);
const IMAGE_MAP_PATH = path.join(ROOT_DIR, IMAGE_MAP_RELATIVE);
const UNESCO_DATA_PATH = path.join(ROOT_DIR, UNESCO_DATA_RELATIVE);

const EXTENSION_BY_CONTENT_TYPE = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
};

const SPARQL_QUERY = `
SELECT ?unescoId ?image WHERE {
  ?site wdt:P757 ?unescoId;
        wdt:P18 ?image.
}
`;

const ensureDir = (target) => mkdir(target, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fileExists = async (target) => {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
};

const extensionFromUrl = (url) => {
  const match = url.pathname.match(/\.(avif|gif|jpe?g|png|svg|webp)$/i);
  if (!match) return null;
  const ext = match[0].toLowerCase();
  return ext === '.jpeg' ? '.jpg' : ext;
};

const extensionFromContentType = (contentType) => {
  if (!contentType) return null;
  const normalized = contentType.split(';')[0].trim().toLowerCase();
  return EXTENSION_BY_CONTENT_TYPE[normalized] ?? null;
};

const fetchImageBindings = async () => {
  const url = new URL(SPARQL_URL);
  url.searchParams.set('format', 'json');
  url.searchParams.set('query', SPARQL_QUERY);

  const response = await fetch(url, {
    headers: {
      accept: 'application/sparql-results+json',
      'user-agent': 'world-heritage-image-fetcher/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Wikidata SPARQL request failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  return payload?.results?.bindings ?? [];
};

const buildThumbnailUrl = (imageUrl) => {
  const url = new URL(imageUrl.replace('http://', 'https://'));
  url.searchParams.set('width', String(THUMBNAIL_WIDTH));
  return url.toString();
};

const readJson = async (target) => JSON.parse(await readFile(target, 'utf8'));

const readExistingImages = async () => {
  if (!(await fileExists(IMAGE_DIR))) return {};

  const entries = await readdir(IMAGE_DIR);
  return Object.fromEntries(
    entries
      .map((entry) => {
        const match = entry.match(/^(\d+)\.(avif|gif|jpe?g|png|svg|webp)$/i);
        if (!match) return null;
        return [match[1], `/images/sites/${entry}`];
      })
      .filter(Boolean),
  );
};

const downloadFile = async (url, destination) => {
  let attempt = 0;
  let lastError = null;

  while (attempt < MAX_RETRIES) {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'user-agent': 'world-heritage-image-fetcher/1.0 (contact: github.com/s55447236/world-heritage)',
      },
    });

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      await writeFile(destination, new Uint8Array(arrayBuffer));
      return response.headers.get('content-type');
    }

    if (response.status !== 429) {
      throw new Error(`Image request failed: ${response.status} ${response.statusText}`);
    }

    lastError = new Error(`Image request failed: ${response.status} ${response.statusText}`);
    attempt += 1;
    await sleep(DEFAULT_DELAY_MS * (attempt + 1));
  }

  throw lastError ?? new Error('Image request failed after retries');
};

const main = async () => {
  await ensureDir(IMAGE_DIR);

  const unescoData = await readJson(UNESCO_DATA_PATH);
  const existingMap = (await fileExists(IMAGE_MAP_PATH)) ? (await readJson(IMAGE_MAP_PATH)).images ?? {} : {};
  const existingImages = await readExistingImages();
  const bindings = await fetchImageBindings();
  const limit = Number.parseInt(process.env.IMAGE_LIMIT ?? '', 10) || DEFAULT_LIMIT;
  const delayMs = Number.parseInt(process.env.IMAGE_DELAY_MS ?? '', 10) || DEFAULT_DELAY_MS;
  const countryFilter = process.env.IMAGE_COUNTRY?.trim();

  const requestedRecords = countryFilter
    ? unescoData.records.filter(
        (record) => record.country === countryFilter || (record.countries ?? []).includes(countryFilter),
      )
    : unescoData.records;

  const requestedIds = new Set(requestedRecords.map((record) => String(record.unescoId)));
  const imageBindings = bindings.filter((binding) => requestedIds.has(String(binding.unescoId?.value ?? '')));

  const imageMap = { ...existingMap, ...existingImages };
  let downloadedCount = 0;
  let skippedCount = 0;
  let attemptedDownloads = 0;

  for (const binding of imageBindings) {
    const unescoId = String(binding.unescoId.value);
    const sourceUrl = buildThumbnailUrl(binding.image.value);
    const url = new URL(sourceUrl);
    let extension = extensionFromUrl(url) ?? '.jpg';
    let destination = path.join(IMAGE_DIR, `${unescoId}${extension}`);

    if (await fileExists(destination)) {
      imageMap[unescoId] = `/images/sites/${unescoId}${extension}`;
      skippedCount += 1;
      continue;
    }

    if (attemptedDownloads >= limit) {
      continue;
    }

    try {
      attemptedDownloads += 1;
      const contentType = await downloadFile(sourceUrl, destination);
      const detectedExtension = extensionFromContentType(contentType);

      if (detectedExtension && detectedExtension !== extension) {
        const correctedDestination = path.join(IMAGE_DIR, `${unescoId}${detectedExtension}`);
        await rename(destination, correctedDestination);
        destination = correctedDestination;
        extension = detectedExtension;
      }

      imageMap[unescoId] = `/images/sites/${unescoId}${extension}`;
      downloadedCount += 1;
      await sleep(delayMs);
    } catch (error) {
      console.warn(`Failed to download image for UNESCO site ${unescoId}:`, error.message);
      await sleep(delayMs);
    }
  }

  await writeFile(
    IMAGE_MAP_PATH,
    `${JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        provider: 'Wikidata Commons media (P18)',
        total: Object.keys(imageMap).length,
        images: imageMap,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  console.log(`Mapped ${Object.keys(imageMap).length} UNESCO sites to local images.`);
  console.log(`Downloaded ${downloadedCount} new images, reused ${skippedCount} existing files.`);
  console.log(`Attempted ${attemptedDownloads} new downloads this run.`);
  if (countryFilter) {
    console.log(`Country filter: ${countryFilter} (${requestedIds.size} UNESCO sites in scope).`);
  }
  console.log(`Saved image map -> ${IMAGE_MAP_PATH}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
