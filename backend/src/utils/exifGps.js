const fs = require('fs');
const exifr = require('exifr');

/**
 * Extract GPS and capture metadata from DJI / camera EXIF (post-capture workflow).
 */
async function extractGpsFromImage(imagePath) {
  try {
    const buffer = await fs.promises.readFile(imagePath);
    const exif = await exifr.parse(buffer, {
      gps: true,
      tiff: true,
      exif: true,
      mergeOutput: true,
    });

    if (!exif) return null;

    const lat = exif.latitude ?? exif.GPSLatitude;
    const lng = exif.longitude ?? exif.GPSLongitude;
    if (lat == null || lng == null) return null;

    return {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      altitude: exif.GPSAltitude != null ? parseFloat(exif.GPSAltitude) : null,
      capturedAt: exif.DateTimeOriginal || exif.CreateDate || null,
      cameraMake: exif.Make || null,
      cameraModel: exif.Model || null,
      bearing: exif.GPSImgDirection != null ? parseFloat(exif.GPSImgDirection) : null,
    };
  } catch (err) {
    console.warn('[EXIF] Could not read GPS:', err.message);
    return null;
  }
}

module.exports = { extractGpsFromImage };
