// Готовит логотип для вставки в карточки: убирает фон, обрезает поля,
// кладёт в шаблон/ассеты/логотип.png
//
// Запуск:  node tools/подготовить-логотип.mjs "путь\к\логотипу.png"

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'шаблон', 'ассеты');

const src = process.argv[2];
if (!src) {
  console.error('Укажи файл: node tools/подготовить-логотип.mjs "логотип.png"');
  process.exit(1);
}

// Фон градиентный, поэтому заливка «от краёв» протекает сквозь мягкую тень
// внутрь логотипа и съедает чёрную плашку. Отличаем по ЦВЕТУ:
//   фон      — розовый: красного заметно больше зелёного, зелёный ≈ синему;
//   логотип  — чёрный и белый (все каналы равны) либо насыщенный красный «РФ».
async function cutBackground(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const px = new Uint8ClampedArray(data);

  for (let i = 0; i < px.length; i += channels) {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const warm = r - g;              // «розовость»
    const neutralGB = Math.abs(g - b);

    const isBrandRed = warm > 120;   // «РФ» и полоски скорости
    const isInk = warm < 22;         // чёрное и белое — каналы почти равны
    const isBackground = !isBrandRed && !isInk && neutralGB < 28 && g > 28;

    if (isBackground) {
      px[i + 3] = 0;
    } else if (!isBrandRed && warm > 14) {
      // Кромка между фоном и логотипом: гасим частично, чтобы не было розового ореола.
      px[i + 3] = Math.round(px[i + 3] * (1 - (warm - 14) / 8) * 0.5);
    }
  }

  return { buf: Buffer.from(px.buffer), width, height, channels };
}

const { buf, width, height, channels } = await cutBackground(src);
await fs.mkdir(OUT, { recursive: true });

const dest = path.join(OUT, 'логотип.png');
await sharp(buf, { raw: { width, height, channels } })
  .png()
  .trim({ threshold: 1 })   // срезаем пустые прозрачные поля
  .toFile(dest);

const meta = await sharp(dest).metadata();
console.log(`✓ логотип.png — ${meta.width}×${meta.height}`);
console.log(`  ${dest}`);
