// Нарезает неизменяемые части шаблона из образцов карточек.
// Кладёшь в папку «референсы» файлы card1.jpg и card2.jpg (образцы WENBOX W33 PRO) —
// скрипт вырезает логотип, нижнюю панель и Telegram-блок, чтобы новые карточки
// совпадали с образцом, а не были «похожими».

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'референсы');
const OUT = path.join(ROOT, 'шаблон', 'ассеты');

const W = 1086;
const H = 1448;

// Зоны вырезки в координатах карточки 1086×1448.
const CROPS = {
  card1: {
    'логотип':        { left: 40, top: 18,   width: 1006, height: 210 },
    'нижняя-панель':  { left: 36, top: 1280, width: 1014, height: 128 },
  },
  card2: {
    'телеграм':       { left: 530, top: 1305, width: 512, height: 125 },
  },
};

// Заливка от краёв: убираем ТОЛЬКО внешний фон, внутренние белые детали
// логотипа (контуры букв, снежные шапки гор) остаются нетронутыми.
async function whiteToAlpha(buf, tolerance = 26) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const px = new Uint8ClampedArray(data);

  const isBg = (i) => {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mn >= 255 - tolerance && mx - mn <= 12;
  };

  const seen = new Uint8Array(width * height);
  const stack = [];
  for (let x = 0; x < width; x++) stack.push(x, 0, x, height - 1);
  for (let y = 0; y < height; y++) stack.push(0, y, width - 1, y);

  while (stack.length) {
    const y = stack.pop(), x = stack.pop();
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const p = y * width + x;
    if (seen[p]) continue;
    const i = p * channels;
    if (!isBg(i)) continue;
    seen[p] = 1;
    px[i + 3] = 0;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }

  return sharp(Buffer.from(px.buffer), { raw: { width, height, channels } }).png().toBuffer();
}

async function findCard(name) {
  for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
    const p = path.join(SRC, name + ext);
    try { await fs.access(p); return p; } catch {}
  }
  return null;
}

async function main() {
  console.log('Нарезка шаблона из образцов…\n');
  await fs.mkdir(OUT, { recursive: true });
  await fs.mkdir(SRC, { recursive: true });

  let done = 0;
  for (const [card, crops] of Object.entries(CROPS)) {
    const file = await findCard(card);
    if (!file) {
      console.log(`⚠ нет файла референсы/${card}.jpg — пропускаю`);
      continue;
    }
    const meta = await sharp(file).metadata();
    console.log(`${card}: ${meta.width}×${meta.height}`);

    // Приводим к эталону, чтобы координаты вырезки всегда сходились.
    const base = await sharp(file).resize(W, H, { fit: 'fill' }).toBuffer();

    for (const [key, box] of Object.entries(crops)) {
      const cropped = await sharp(base).extract(box).png().toBuffer();
      const transparent = await whiteToAlpha(cropped);
      const trimmed = await sharp(transparent).trim({ threshold: 1 }).toBuffer();
      const info = await sharp(trimmed).metadata();
      await fs.writeFile(path.join(OUT, `${key}.png`), trimmed);
      console.log(`  ✓ ${key}.png — ${info.width}×${info.height}`);
      done++;
    }
  }

  if (!done) {
    console.log('\nНичего не нарезано. Положи образцы карточек в папку «референсы»');
    console.log('под именами card1.jpg (главная) и card2.jpg (комплектация).');
  } else {
    console.log(`\nГотово: ${done} ${done === 1 ? 'файл' : 'файла'} в шаблон/ассеты/`);
  }
}

main().catch(e => { console.error('✗', e.message); process.exitCode = 1; });
