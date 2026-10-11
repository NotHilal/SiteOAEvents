const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT_DIR = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT_DIR, 'catalogue_images', 'manifest.json');
const TARGET_UPLOADS_DIR = path.join(ROOT_DIR, 'public', 'uploads', 'materials');
const COMPRESSED_CATALOGUE_DIR = path.join(ROOT_DIR, 'catalogue_images', 'compressed');

fs.mkdirSync(TARGET_UPLOADS_DIR, { recursive: true });
fs.mkdirSync(COMPRESSED_CATALOGUE_DIR, { recursive: true });

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  console.log(`Starting compression and installation for ${manifest.length} images...`);

  let totalOriginalBytes = 0;
  let totalCompressedBytes = 0;
  const updates = [];

  for (const item of manifest) {
    const srcRel = item.primary_image.path;
    const srcAbs = path.join(ROOT_DIR, srcRel);

    if (!fs.existsSync(srcAbs)) {
      console.error(`Missing source image: ${srcAbs}`);
      continue;
    }

    const origStat = fs.statSync(srcAbs);
    totalOriginalBytes += origStat.size;

    const webpFilename = `${item.id}.webp`;
    const targetUploadPath = path.join(TARGET_UPLOADS_DIR, webpFilename);
    const targetCataloguePath = path.join(COMPRESSED_CATALOGUE_DIR, `${String(item.order).padStart(2, '0')}_${item.slug}.webp`);

    // Compress with sharp
    const image = sharp(srcAbs);
    const metadata = await image.metadata();

    const pipeline = image
      .rotate()
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({
        quality: 82,
        effort: 6,
      });

    await pipeline.toFile(targetUploadPath);
    // Also copy to catalogue_images/compressed
    fs.copyFileSync(targetUploadPath, targetCataloguePath);

    const compStat = fs.statSync(targetUploadPath);
    totalCompressedBytes += compStat.size;

    const compMeta = await sharp(targetUploadPath).metadata();
    const ratio = (((origStat.size - compStat.size) / origStat.size) * 100).toFixed(1);

    console.log(
      `✓ [${item.order}/23] ${item.name} (${item.id}): ` +
      `${metadata.width}x${metadata.height} (${(origStat.size / 1024).toFixed(1)} KB) -> ` +
      `${compMeta.width}x${compMeta.height} (${(compStat.size / 1024).toFixed(1)} KB, -${ratio}%)`
    );

    updates.push({
      id: item.id,
      url: `/uploads/materials/${webpFilename}`,
    });
  }

  console.log('\n======================================================');
  console.log(`Original total size : ${(totalOriginalBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Compressed total size: ${(totalCompressedBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Total space saved   : ${(((totalOriginalBytes - totalCompressedBytes) / totalOriginalBytes) * 100).toFixed(1)}%`);
  console.log('======================================================\n');

  // Write a JSON file for the DB update
  const updatesPath = path.join(__dirname, 'db_updates.json');
  fs.writeFileSync(updatesPath, JSON.stringify(updates, null, 2), 'utf-8');
  console.log(`Saved DB updates map to ${updatesPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
