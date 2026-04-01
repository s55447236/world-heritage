import fs from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const imageMapPath = path.join(rootDir, 'src/data/unesco-image-map.json');
const unescoDataPath = path.join(rootDir, 'src/data/unesco-world-heritage.json');
const imagesRoot = path.join(rootDir, 'public/images/sites');

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

const ensureUniqueTarget = async (targetPath, unescoId) => {
  try {
    await fs.access(targetPath);
    const parsed = path.parse(targetPath);
    return path.join(parsed.dir, `${parsed.name}-${unescoId}${parsed.ext}`);
  } catch {
    return targetPath;
  }
};

const main = async () => {
  const imageMap = JSON.parse(await fs.readFile(imageMapPath, 'utf8'));
  const unescoData = JSON.parse(await fs.readFile(unescoDataPath, 'utf8'));
  const records = unescoData.records ?? [];
  const recordByUnescoId = new Map(records.map((record) => [String(record.unescoId), record]));

  const newImages = {};
  const touchedDirs = new Set();

  for (const [unescoId, relativeSourcePath] of Object.entries(imageMap.images ?? {})) {
    const record = recordByUnescoId.get(String(unescoId));
    if (!record) {
      newImages[unescoId] = relativeSourcePath;
      continue;
    }

    const sourcePath = path.join(rootDir, 'public', relativeSourcePath.replace(/^\/+/, ''));
    const extension = path.extname(sourcePath);
    const continentSegment = sanitizeSegment(record.continent);
    const countrySegment = sanitizeSegment(record.country);
    const siteSegment = sanitizeSegment(record.name);
    const targetDir = path.join(imagesRoot, continentSegment, countrySegment);
    let targetPath = path.join(targetDir, `${siteSegment}${extension}`);

    await fs.mkdir(targetDir, { recursive: true });
    touchedDirs.add(targetDir);
    const sourceExists = await fs
      .access(sourcePath)
      .then(() => true)
      .catch(() => false);
    const targetExists = await fs
      .access(targetPath)
      .then(() => true)
      .catch(() => false);

    if (path.resolve(sourcePath) !== path.resolve(targetPath)) {
      if (sourceExists) {
        targetPath = targetExists ? await ensureUniqueTarget(targetPath, unescoId) : targetPath;
        await fs.rename(sourcePath, targetPath);
      } else if (!targetExists) {
        newImages[unescoId] = relativeSourcePath;
        continue;
      }
    }

    const targetRelativePath = path
      .relative(path.join(rootDir, 'public'), targetPath)
      .split(path.sep)
      .join('/');

    newImages[unescoId] = `/${targetRelativePath}`;
  }

  imageMap.images = newImages;
  await fs.writeFile(imageMapPath, `${JSON.stringify(imageMap, null, 2)}\n`, 'utf8');

  const rootEntries = await fs.readdir(imagesRoot, { withFileTypes: true });
  await Promise.all(
    rootEntries
      .filter((entry) => entry.isFile())
      .map((entry) => fs.rm(path.join(imagesRoot, entry.name), { force: true })),
  );

  console.log(`Renamed ${Object.keys(newImages).length} images into nested continent/country/site paths.`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
