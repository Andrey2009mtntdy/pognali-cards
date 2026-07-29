// Раскладка фотографий по слотам макета.
// Имя файла — это и есть команда: «зеркала.jpg» уедет в блок «ЗЕРКАЛА»,
// «перед.jpg» — на главную карточку. Порядок файлов в папке значения не имеет.

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { loadImage } from './draw.js';

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp']);

// Синонимы: слева — как деталь называется в блоке, справа — что искать в имени файла.
const DETAIL_KEYS = [
  { id: 'зеркала',      match: /зеркал|mirror/i,                          file: /зеркал|mirror/i },
  { id: 'фара',         match: /фара|фары|освещ|свет(?!оф)/i,             file: /фара|фары|свет|light|head/i },
  { id: 'дисплей',      match: /дисплей|экран|приборн|панель/i,           file: /дисплей|экран|display|панель|приборн/i },
  { id: 'аккумулятор',  match: /аккумулятор|батаре|акб|li-ion|lifepo/i,   file: /аккум|батар|battery|акб/i },
  { id: 'тормоза',      match: /тормоз|суппорт/i,                         file: /тормоз|brake|диск|суппорт/i },
  { id: 'амортизатор',  match: /амортизатор|подвеск|вилка/i,              file: /аморт|shock|пружин|вилк|подвеск/i },
  { id: 'сиденье',      match: /сиден|седло|кресл/i,                      file: /сиден|седло|seat|кресл/i },
  { id: 'багажник',     match: /багажник|корзин|кофр/i,                   file: /багажник|корзин|rack|кофр|ящик/i },
  { id: 'колесо',       match: /колес|колёс|шина|покрышк/i,               file: /колес|колёс|шина|wheel|tire|покрышк|резин/i },
  { id: 'фонарь',       match: /фонар|стоп-сигнал|задний свет/i,          file: /фонар|стоп|tail|габарит/i },
  { id: 'поворотники',  match: /поворотник|указател/i,                    file: /поворотник|turn|указател/i },
  { id: 'подножка',     match: /подножк|упор/i,                           file: /подножк|stand|лапк|упор/i },
  { id: 'управление',   match: /управлен|руль|ручк|курок/i,               file: /руль|ручк|управлен|курок|грип/i },
  { id: 'двигатель',    match: /двигател|мотор|мотор-колесо/i,            file: /двигател|мотор|motor/i },
  { id: 'рама',         match: /рама|корпус/i,                            file: /рама|корпус|frame/i },
];

const FRONT_RE = /перед|спереди|front|главн|основн|фас/i;
const REAR_RE  = /зад(?!н\w*\s*фонар)|сзади|rear|back|сбок|бок|side|профил/i;

async function listImages(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter(e => e.isFile() && IMAGE_EXT.has(path.extname(e.name).toLowerCase()))
    .map(e => ({ name: e.name, base: path.basename(e.name, path.extname(e.name)), full: path.join(dir, e.name) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru', { numeric: true }));
}

// Убираем однотонный фон по краям: заливка от границ, чтобы белые детали
// ВНУТРИ товара (шильдики, блики, спицы) остались на месте.
async function removeBackground(file, tolerance = 30) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const px = new Uint8ClampedArray(data);

  // Опорный цвет — усреднённые углы.
  let r0 = 0, g0 = 0, b0 = 0;
  const corners = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
  for (const [x, y] of corners) {
    const i = (y * width + x) * channels;
    r0 += px[i]; g0 += px[i + 1]; b0 += px[i + 2];
  }
  r0 /= 4; g0 /= 4; b0 /= 4;

  const close = (i) => Math.abs(px[i] - r0) <= tolerance
    && Math.abs(px[i + 1] - g0) <= tolerance
    && Math.abs(px[i + 2] - b0) <= tolerance;

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
    if (!close(i)) continue;
    seen[p] = 1;
    px[i + 3] = 0;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }

  // Обрезаем ставшие прозрачными поля: иначе картинка «шире» товара,
  // и контактная тень ложится не под колёса, а по краю файла.
  return sharp(Buffer.from(px.buffer), { raw: { width, height, channels } })
    .png()
    .trim({ threshold: 1 })
    .toBuffer();
}

/**
 * Разбирает папку модели и возвращает { photos, report }.
 * photos — объект слот → изображение (front, rear, kit1…kit8).
 */
export async function collectPhotos(dir, kit, { removeBg = false } = {}) {
  const files = await listImages(dir);
  const used = new Set();
  const report = [];

  const take = (re) => {
    const hit = files.find(f => !used.has(f.full) && re.test(f.base));
    if (hit) used.add(hit.full);
    return hit || null;
  };

  const slots = {};

  // 1. Общие планы.
  slots.front = take(FRONT_RE);
  slots.rear = take(REAR_RE);

  // 2. Детали — по названию блока комплектации ищем фото с подходящим именем.
  for (let i = 0; i < 8; i++) {
    const title = kit[i]?.title || '';
    const key = DETAIL_KEYS.find(k => k.match.test(title));
    slots[`kit${i + 1}`] = key ? take(key.file) : null;
  }

  // 3. Чем не хватило — добиваем оставшимися файлами по порядку.
  const leftovers = files.filter(f => !used.has(f.full));
  const order = ['front', 'rear', ...Array.from({ length: 8 }, (_, i) => `kit${i + 1}`)];
  for (const slot of order) {
    if (slots[slot]) continue;
    const next = leftovers.shift();
    if (!next) continue;
    used.add(next.full);
    slots[slot] = next;
    report.push(`  ${slot}: ${next.name} (по остатку — имя файла не распознано)`);
  }

  // 4. Грузим картинки.
  const photos = {};
  for (const [slot, file] of Object.entries(slots)) {
    if (!file) { report.push(`  ${slot}: — нет фото`); continue; }
    try {
      const needsCut = removeBg && (slot === 'front' || slot === 'rear');
      const src = needsCut ? await removeBackground(file.full) : file.full;
      photos[slot] = await loadImage(src);
      if (!report.some(r => r.includes(file.name))) report.push(`  ${slot}: ${file.name}`);
    } catch (e) {
      report.push(`  ${slot}: ОШИБКА ${file.name} — ${e.message}`);
    }
  }

  return { photos, report, total: files.length, unused: leftovers.length };
}
