/**
 * Compress large camera/drone photos in the browser before upload.
 * Keeps AI-usable resolution while reducing multi‑MB JPEGs for mobile networks.
 */
export async function prepareImageForUpload(file, {
  maxBytes = 12 * 1024 * 1024,
  maxDimension = 2560,
  quality = 0.82,
} = {}) {
  if (!file || !file.type?.startsWith('image/')) return file;
  if (file.size <= maxBytes) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let currentQuality = quality;
  let blob = await canvasToJpeg(canvas, currentQuality);

  // Step quality down until under target or quality floor.
  while (blob.size > maxBytes && currentQuality > 0.55) {
    currentQuality -= 0.08;
    blob = await canvasToJpeg(canvas, currentQuality);
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'drone-photo';
  return new File([blob], `${baseName}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

function canvasToJpeg(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not compress image.'))),
      'image/jpeg',
      quality,
    );
  });
}
