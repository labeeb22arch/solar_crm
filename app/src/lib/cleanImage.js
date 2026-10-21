// Background removal for photos of a stamp or a signature on paper. Runs fully in the browser (canvas only).
// 1. draw the photo on a canvas (longest side at most 1200 px, optional 90° turns)
// 2. estimate the paper colour from the pixels along the border
// 3. pixels close to the paper colour become transparent, with a soft edge
// 4. ink keeps its own colour (stamps are blue / violet / red) or is forced to near-black (signatures)
// 5. crop to the ink plus a small margin and export a PNG, shrunk until it fits the size budget

const MAX_SIDE = 1200;
export const MAX_DATA_URL = 200000; // ≈ 150 KB of PNG once base64 is decoded

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('This file could not be opened as a picture'));
    img.src = src;
  });
}

export function readFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Could not read the file'));
    r.readAsDataURL(file);
  });
}

function canvasOf(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
}

/** Draws the image scaled to `maxSide` and turned by `rotate` degrees (multiple of 90). */
function drawScaled(img, maxSide, rotate = 0) {
  const w0 = img.naturalWidth || img.width; const h0 = img.naturalHeight || img.height;
  const k = Math.min(1, maxSide / Math.max(w0, h0));
  const w = Math.round(w0 * k); const h = Math.round(h0 * k);
  const turn = ((rotate % 360) + 360) % 360;
  const side = turn === 90 || turn === 270;
  const c = canvasOf(side ? h : w, side ? w : h);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((turn * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  return c;
}

const median = (arr) => { const s = arr.slice().sort((a, b) => a - b); return s[s.length >> 1] || 0; };

/** Median colour of a band along the four edges (the paper). */
function paperColour(data, w, h) {
  const band = Math.max(2, Math.round(Math.min(w, h) * 0.04));
  const r = []; const g = []; const b = [];
  const step = Math.max(1, Math.round((w + h) / 600));
  const take = (x, y) => { const i = (y * w + x) * 4; if (data[i + 3] < 128) return; r.push(data[i]); g.push(data[i + 1]); b.push(data[i + 2]); };
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
    if (x < band || y < band || x >= w - band || y >= h - band) take(x, y);
  }
  if (!r.length) return [255, 255, 255];
  return [median(r), median(g), median(b)];
}

/** Bounding box of pixels with alpha above `min`; null when the image is empty. */
export function inkBounds(data, w, h, min = 40) {
  let x0 = w; let y0 = h; let x1 = -1; let y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > min) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

function cropTo(c, box, marginFrac = 0.03) {
  const m = Math.max(4, Math.round(Math.max(box.w, box.h) * marginFrac));
  const x = Math.max(0, box.x - m); const y = Math.max(0, box.y - m);
  const w = Math.min(c.width - x, box.w + 2 * m); const h = Math.min(c.height - y, box.h + 2 * m);
  const out = canvasOf(w, h);
  out.getContext('2d').drawImage(c, x, y, w, h, 0, 0, w, h);
  return out;
}

/** PNG data URL, scaled down step by step until it fits the size budget. */
export function exportPng(c, maxLen = MAX_DATA_URL) {
  let cur = c;
  let url = cur.toDataURL('image/png');
  for (let i = 0; i < 12 && url.length > maxLen; i++) {
    const k = Math.max(0.5, Math.sqrt(maxLen / url.length) * 0.95);
    const next = canvasOf(cur.width * k, cur.height * k);
    const ctx = next.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cur, 0, 0, next.width, next.height);
    cur = next;
    url = cur.toDataURL('image/png');
  }
  return { url, width: cur.width, height: cur.height };
}

/**
 * Removes the paper behind a stamp or signature.
 * @param src      data URL / object URL of the photo
 * @param strength 0..1 — higher removes more (lighter ink and shadows disappear too)
 * @param ink      'keep' keeps the ink colour, 'black' forces near-black ink
 * @param rotate   0 / 90 / 180 / 270
 * @returns { url, width, height, empty }
 */
export async function cleanImage(src, { strength = 0.5, ink = 'keep', rotate = 0, maxLen = MAX_DATA_URL } = {}) {
  const img = await loadImage(src);
  const c = drawScaled(img, MAX_SIDE, rotate);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const id = ctx.getImageData(0, 0, c.width, c.height);
  const d = id.data;
  const [pr, pg, pb] = paperColour(d, c.width, c.height);
  const paperLum = 0.299 * pr + 0.587 * pg + 0.114 * pb;
  // Distance from the paper colour below `lo` = paper (transparent); above `hi` = ink (opaque); in between = soft edge.
  const lo = 18 + strength * 70;
  const hi = lo + 45;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]; const g = d[i + 1]; const b = d[i + 2];
    const dist = Math.sqrt(((r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2) / 3) * 1.6;
    // Ink is darker or more coloured than paper; pixels lighter than the paper are glare, not ink.
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const darker = paperLum - lum;
    const score = darker < -8 ? dist * 0.4 : dist;
    let a = score <= lo ? 0 : score >= hi ? 1 : (score - lo) / (hi - lo);
    a = a * a * (3 - 2 * a); // smooth step for a soft edge
    if (ink === 'black') {
      const k = Math.min(1, Math.max(0, darker / Math.max(40, paperLum * 0.55)));
      d[i] = 18; d[i + 1] = 18; d[i + 2] = 24;
      a = Math.min(a, 0.35 + 0.65 * k) * (a > 0 ? 1 : 0);
    } else if (a > 0 && a < 1) {
      // Partly covered pixel: take the paper out of the colour so edges do not keep a pale halo.
      d[i] = Math.max(0, Math.min(255, (r - pr * (1 - a)) / a));
      d[i + 1] = Math.max(0, Math.min(255, (g - pg * (1 - a)) / a));
      d[i + 2] = Math.max(0, Math.min(255, (b - pb * (1 - a)) / a));
    }
    d[i + 3] = Math.round(a * 255);
  }
  ctx.putImageData(id, 0, 0);
  const box = inkBounds(d, c.width, c.height);
  if (!box) return { ...exportPng(c, maxLen), empty: true };
  return { ...exportPng(cropTo(c, box), maxLen), empty: false };
}

/** Crops a transparent PNG (e.g. a signature drawn on screen) to its ink plus a small margin. */
export async function trimToInk(src, { maxLen = MAX_DATA_URL } = {}) {
  const img = await loadImage(src);
  const c = canvasOf(img.naturalWidth, img.naturalHeight);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const box = inkBounds(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height, 10);
  if (!box) return { url: null, empty: true };
  return { ...exportPng(cropTo(c, box), maxLen), empty: false };
}
