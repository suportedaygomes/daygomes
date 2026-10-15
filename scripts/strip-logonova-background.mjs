/**
 * Remove só o preto externo (ligado às bordas) de public/logonova.PNG.
 * Não altera cores do retrato, texto ou ícones.
 *
 * Uso: node scripts/strip-logonova-background.mjs
 */
import sharp from "sharp";

const INPUT = "public/logonova.PNG";
const OUTPUT = "public/logonova-login.png";

/** Só o preto chapado do fundo (ligado às bordas). Não inclui sombras do cabelo. */
function isBackgroundBlack(r, g, b) {
  return Math.max(r, g, b) <= 4;
}

const { data: src, info } = await sharp(INPUT)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height } = info;
const n = width * height;
const remove = new Uint8Array(n);
const queue = new Int32Array(n);
let head = 0;
let tail = 0;
const idx = (x, y) => y * width + x;

function enqueue(x, y) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const i = idx(x, y);
  if (remove[i]) return;
  const o = i * 4;
  if (!isBackgroundBlack(src[o], src[o + 1], src[o + 2])) return;
  remove[i] = 1;
  queue[tail++] = i;
}

for (let x = 0; x < width; x++) {
  enqueue(x, 0);
  enqueue(x, height - 1);
}
for (let y = 0; y < height; y++) {
  enqueue(0, y);
  enqueue(width - 1, y);
}

while (head < tail) {
  const i = queue[head++];
  const x = i % width;
  const y = (i / width) | 0;
  enqueue(x - 1, y);
  enqueue(x + 1, y);
  enqueue(x, y - 1);
  enqueue(x, y + 1);
}

const out = Buffer.from(src);

for (let i = 0; i < n; i++) {
  if (!remove[i]) continue;
  out[i * 4 + 3] = 0;
}

await sharp(out, { raw: { width, height, channels: 4 } }).png().toFile(OUTPUT);
console.log(`Wrote ${OUTPUT} (${width}×${height}), removed ${remove.reduce((a, b) => a + b, 0)} px`);
