// Главный запуск: проходит по папкам моделей и делает по две карточки на каждую.
// Ничего не спрашивает и никуда не ходит в интернет — только читает папки и пишет файлы.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderCard1, renderCard2 } from './render.js';
import { parseData, TEMPLATE_TXT } from './parse.js';
import { collectPhotos } from './photos.js';
import { loadImage, registerFonts } from './draw.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const IN_DIR = path.join(ROOT, 'модели');
const OUT_DIR = path.join(ROOT, 'готово');
const ASSET_DIR = path.join(ROOT, 'шаблон', 'ассеты');

const DATA_FILES = ['данные.txt', 'data.txt', 'данные.TXT'];

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function loadAssets() {
  const names = { logo: 'логотип.png', bottomPanel: 'нижняя-панель.png', tgBlock: 'телеграм.png', mountains: 'фон.png' };
  const out = {};
  for (const [key, file] of Object.entries(names)) {
    const p = path.join(ASSET_DIR, file);
    if (await exists(p)) {
      try { out[key] = await loadImage(p); } catch { /* битый файл — рисуем запасным вариантом */ }
    }
  }
  return out;
}

async function readData(dir) {
  for (const name of DATA_FILES) {
    const p = path.join(dir, name);
    if (await exists(p)) return parseData(await fs.readFile(p, 'utf8'));
  }
  return null;
}

// Имя файла без запрещённых в Windows символов.
function safeName(s) {
  return String(s).replace(/[<>:"/\\|?*]+/g, '-').replace(/\s+/g, ' ').trim() || 'card';
}

async function processModel(dirName, assets) {
  const dir = path.join(IN_DIR, dirName);
  const log = [`\n📁 ${dirName}`];

  const data = await readData(dir);
  if (!data) {
    await fs.writeFile(path.join(dir, 'данные.txt'), TEMPLATE_TXT, 'utf8');
    log.push('  ⚠ не было файла данные.txt — создал заготовку, заполни её и запусти снова');
    return { ok: false, log };
  }
  if (!data.model && !data.brand) {
    log.push('  ⚠ в данные.txt не заполнены Бренд и Модель — пропускаю');
    return { ok: false, log };
  }

  const { photos, report, total, unused } = await collectPhotos(dir, data.kit, { removeBg: data.removeBg });
  log.push(`  фото найдено: ${total}${unused ? `, лишних: ${unused}` : ''}`);
  log.push(...report);

  if (!photos.front && !photos.rear) {
    log.push('  ⚠ нет ни одного общего фото — карточки будут пустыми, проверь имена файлов');
  }

  const full = { ...data, photos };
  const card1 = renderCard1(full, assets);
  const card2 = renderCard2(full, assets);

  const outName = safeName([data.brand, data.model, data.version].filter(Boolean).join(' '));
  const outDir = path.join(OUT_DIR, outName);
  await fs.mkdir(outDir, { recursive: true });

  // PNG без потерь: на карточке много мелкого текста и тонких линий, JPEG их мылит.
  // (Осторожно: у toBuffer шкала качества 0–100, а не 0–1 — на 0.95 картинка убивается в кашу.)
  await fs.writeFile(path.join(outDir, `${outName} — 1 главная.png`), card1.toBuffer('image/png'));
  await fs.writeFile(path.join(outDir, `${outName} — 2 комплектация.png`), card2.toBuffer('image/png'));

  log.push(`  ✓ готово → готово/${outName}/`);
  return { ok: true, log };
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   ГЕНЕРАТОР КАРТОЧЕК · ПОГНАЛИ РФ        ║');
  console.log('╚══════════════════════════════════════════╝');

  registerFonts();
  await fs.mkdir(IN_DIR, { recursive: true });
  await fs.mkdir(OUT_DIR, { recursive: true });

  const assets = await loadAssets();
  if (!assets.logo) {
    console.log('\n⚠ Логотип не нарезан (шаблон/ассеты/логотип.png).');
    console.log('  Положи образцы в папку «референсы» и запусти «НАРЕЗАТЬ ШАБЛОН.bat».');
    console.log('  Пока карточки рисуются запасным вариантом логотипа.');
  }

  const entries = await fs.readdir(IN_DIR, { withFileTypes: true });
  const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);

  if (!dirs.length) {
    const demo = path.join(IN_DIR, 'WENBOX W33 PRO');
    await fs.mkdir(demo, { recursive: true });
    await fs.writeFile(path.join(demo, 'данные.txt'), TEMPLATE_TXT, 'utf8');
    console.log('\nПапка «модели» была пустой — создал пример: модели/WENBOX W33 PRO/');
    console.log('Положи туда фото (перед.jpg, зад.jpg, зеркала.jpg, фара.jpg …), заполни данные.txt и запусти снова.');
    return;
  }

  let ok = 0, failed = 0;
  for (const d of dirs) {
    try {
      const res = await processModel(d, assets);
      console.log(res.log.join('\n'));
      res.ok ? ok++ : failed++;
    } catch (e) {
      console.log(`\n📁 ${d}\n  ✗ ОШИБКА: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n──────────────────────────────────────────`);
  console.log(`Готово: ${ok} ${ok === 1 ? 'модель' : 'моделей'}${failed ? `, пропущено: ${failed}` : ''}`);
  console.log(`Результат в папке «готово».`);
}

main().catch(e => {
  console.error('\n✗ Не получилось:', e.message);
  process.exitCode = 1;
});
