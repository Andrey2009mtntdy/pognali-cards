// Иконка приложения из логотипа.
//
// Логотип широкий, примерно 4:1. Если вписать его целиком в квадрат, на панели
// задач получится нечитаемая полоска в четверть высоты. Поэтому берём из него
// эмблему — горы с молнией, — обрезаем прозрачные поля и кладём на фирменный
// тёмный фон. electron-builder сам нарежет отсюда .ico для Windows и .icns
// для macOS.
//
//    npm run icon

import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(root, 'шаблон', 'ассеты', 'логотип.png');
const outDir = path.join(root, 'build');
const out = path.join(outDir, 'icon.png');

const SIZE = 1024;
const PAD = 108;           // поля, чтобы эмблема не упиралась в края скруглённой иконки
const BACK = '#15171c';    // фон окна программы

// Доля исходника, в которой лежит эмблема: середина по горизонтали, верх по вертикали.
const CROP = { left: 0.26, right: 0.76, top: 0, bottom: 0.45 };

const meta = await sharp(src).metadata();
const box = {
  left: Math.round(meta.width * CROP.left),
  top: Math.round(meta.height * CROP.top),
  width: Math.round(meta.width * (CROP.right - CROP.left)),
  height: Math.round(meta.height * (CROP.bottom - CROP.top)),
};

const inner = SIZE - PAD * 2;
const mark = await sharp(src)
  .extract(box)
  .trim()                  // убираем прозрачные поля, чтобы эмблема заняла весь квадрат
  .resize({ width: inner, height: inner, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();

await fs.mkdir(outDir, { recursive: true });
await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: BACK } })
  .composite([{ input: mark, gravity: 'center' }])
  .png()
  .toFile(out);

console.log('Иконка готова:', path.relative(root, out));
