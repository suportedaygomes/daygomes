/**
 * Gera public/logonova-email.png para e-mails (Resend + Supabase Auth):
 * logo nova (mesma do login) com fundo branco sólido, sem transparência.
 *
 * Pré-requisito: public/logonova-login.png (rode strip-logonova-background.mjs antes).
 *
 * Uso: node scripts/prepare-email-logo.mjs
 */
import sharp from "sharp";

const INPUT = "public/logonova-login.png";
const OUTPUT = "public/logonova-email.png";

const PAD_X = 20;
const PAD_Y = 16;

const { data, info } = await sharp(INPUT).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: info.channels },
})
  .flatten({ background: { r: 255, g: 255, b: 255 } })
  .extend({
    top: PAD_Y,
    bottom: PAD_Y,
    left: PAD_X,
    right: PAD_X,
    background: { r: 255, g: 255, b: 255 },
  })
  .png()
  .toFile(OUTPUT);

const meta = await sharp(OUTPUT).metadata();
console.log(`OK: ${OUTPUT} (${meta.width}×${meta.height})`);
