import fs from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const imageMapPath = path.join(rootDir, 'src/data/unesco-image-map.json');
const unescoDataPath = path.join(rootDir, 'src/data/unesco-world-heritage.json');
const publicDir = path.join(rootDir, 'public');

const targets = JSON.parse(process.env.MANUAL_IMAGE_TARGETS ?? '[]');

const sanitizeSegment = (value) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .toLowerCase() || 'unknown';

const ua = {
  'user-agent': 'world-heritage-manual-image-fetcher/1.0',
  accept: 'application/json',
};

const fetchWikipediaSearchTitles = async (query) => {
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('list', 'search');
  url.searchParams.set('srsearch', query);
  url.searchParams.set('srlimit', '8');
  url.searchParams.set('utf8', '1');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  const response = await fetch(url, { headers: ua });
  if (!response.ok) throw new Error(`search ${response.status}`);
  const payload = await response.json();
  return (payload?.query?.search ?? []).map((entry) => entry.title).filter(Boolean);
};

const fetchWikipediaSummary = async (title) => {
  const response = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    { headers: ua },
  );

  if (!response.ok) return null;
  return response.json();
};

const chooseImageUrl = async ({ name, country, queries = [] }) => {
  const candidates = [...queries, `${name} ${country}`, name].filter(Boolean);
  const seenTitles = new Set();

  for (const candidate of candidates) {
    let titles = [];
    try {
      titles = await fetchWikipediaSearchTitles(candidate);
    } catch {
      continue;
    }

    for (const title of titles) {
      if (seenTitles.has(title)) continue;
      seenTitles.add(title);

      const summary = await fetchWikipediaSummary(title);
      const imageUrl = summary?.originalimage?.source ?? summary?.thumbnail?.source ?? null;
      if (imageUrl) {
        return { pickedTitle: title, imageUrl };
      }
    }
  }

  return null;
};

const downloadImage = async (imageUrl, outputPath) => {
  const url = new URL(String(imageUrl).replace('http://', 'https://'));
  url.searchParams.set('width', '1200');

  const response = await fetch(url, {
    headers: { 'user-agent': 'world-heritage-manual-image-fetcher/1.0' },
  });

  if (!response.ok) throw new Error(`image ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, buffer);
  return { finalUrl: url.toString(), size: buffer.length };
};

const main = async () => {
  if (!targets.length) {
    console.log('No manual targets supplied.');
    return;
  }

  const unescoData = JSON.parse(await fs.readFile(unescoDataPath, 'utf8'));
  const imageMap = JSON.parse(await fs.readFile(imageMapPath, 'utf8'));
  const recordById = new Map(unescoData.records.map((record) => [String(record.unescoId), record]));

  const results = [];

  for (const target of targets) {
    const id = String(target.id);
    const record = recordById.get(id);

    if (!record) {
      results.push({ id, ok: false, error: 'record not found' });
      continue;
    }

    try {
      const resolved = await chooseImageUrl({
        name: record.name,
        country: record.country,
        queries: target.queries ?? [],
      });

      if (!resolved) {
        results.push({ id, name: record.name, ok: false, error: 'no image found' });
        continue;
      }

      const ext = '.jpg';
      const relativePath = path.join(
        'images',
        'sites',
        sanitizeSegment(record.continent),
        sanitizeSegment(record.country),
        `${sanitizeSegment(record.name)}${ext}`,
      );
      const outputPath = path.join(publicDir, relativePath);
      const downloaded = await downloadImage(resolved.imageUrl, outputPath);
      imageMap.images[id] = `/${relativePath.split(path.sep).join('/')}`;
      results.push({
        id,
        name: record.name,
        ok: true,
        pickedTitle: resolved.pickedTitle,
        path: imageMap.images[id],
        bytes: downloaded.size,
      });
    } catch (error) {
      results.push({
        id,
        name: record.name,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  imageMap.fetchedAt = new Date().toISOString();
  await fs.writeFile(imageMapPath, `${JSON.stringify(imageMap, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify(results, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
