// Логика окна: форма, раскладка фото, живое превью, сохранение.

import { renderCard1, renderCard2, canvasToDataUrl } from './render.js';
import { assignPhotos } from './photos.js';
import { parseData, stringifyData, emptyData } from './parse.js';
import { PHOTO_SLOTS, CARD_W, CARD_H } from './layout.js';
import { ICON_NAMES, loadImage, fontsReady, cutBackground } from './draw.js';

const $ = (id) => document.getElementById(id);

let data = emptyData();
let files = [];            // [{ name, base, dataUrl }]
let photos = {};           // slot → Image/Canvas
let slotOfFile = {};       // имя файла → слот (для подписей в галерее)
let activeSlot = 'front';
let folder = null;
let logo = null;
let redrawTimer = null;

// ── Утилиты интерфейса ───────────────────────────────────────────────────────
function toast(text, kind = '') {
  const el = $('toast');
  el.textContent = text;
  el.className = `toast show ${kind}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = 'toast'; }, 3200);
}

function busy(on, text = 'Работаю…') {
  $('overlay').classList.toggle('hidden', !on);
  $('overlay-text').textContent = text;
}

// ── Построение формы ─────────────────────────────────────────────────────────
function buildSpecs() {
  const box = $('specs');
  box.innerHTML = '';
  data.specs.forEach((sp, i) => {
    const row = document.createElement('div');
    row.className = 'spec-row';

    const sel = document.createElement('select');
    ICON_NAMES.forEach(n => {
      const o = document.createElement('option');
      o.value = n; o.textContent = n;
      if (n === sp.icon) o.selected = true;
      sel.append(o);
    });
    sel.onchange = () => { sp.icon = sel.value; scheduleRedraw(); };

    const val = document.createElement('input');
    val.value = sp.value || ''; val.placeholder = 'значение';
    val.oninput = () => { sp.value = val.value; scheduleRedraw(); };

    const unit = document.createElement('input');
    unit.value = sp.unit || ''; unit.placeholder = 'ед.';
    unit.oninput = () => { sp.unit = unit.value; scheduleRedraw(); };

    const label = document.createElement('input');
    label.value = sp.label || ''; label.placeholder = 'подпись';
    label.oninput = () => { sp.label = label.value; scheduleRedraw(); };

    row.append(sel, val, unit, label);
    box.append(row);
  });
}

function buildKit() {
  const box = $('kit');
  box.innerHTML = '';
  data.kit.forEach((k, i) => {
    const row = document.createElement('div');
    row.className = 'kit-row';

    const num = document.createElement('div');
    num.className = 'kit-num';
    num.textContent = i + 1;

    const title = document.createElement('input');
    title.value = k.title || ''; title.placeholder = `Блок ${i + 1}`;
    title.oninput = () => { k.title = title.value; scheduleRedraw(); };

    const note = document.createElement('input');
    note.value = k.note || ''; note.placeholder = 'пояснение';
    note.oninput = () => { k.note = note.value; scheduleRedraw(); };

    row.append(num, title, note);
    box.append(row);
  });
}

function buildSlots() {
  const box = $('slots');
  box.innerHTML = '';
  PHOTO_SLOTS.forEach(s => {
    const b = document.createElement('button');
    b.className = 'slot' + (photos[s.id] ? ' filled' : '') + (activeSlot === s.id ? ' active' : '');
    b.textContent = s.label + (photos[s.id] ? ' ✓' : '');
    b.onclick = () => { activeSlot = s.id; buildSlots(); };
    box.append(b);
  });
}

function buildGallery() {
  const box = $('gallery');
  box.innerHTML = '';
  files.forEach(f => {
    const d = document.createElement('div');
    d.className = 'thumb' + (slotOfFile[f.name] ? ' used' : '');
    const img = document.createElement('img');
    img.src = f.dataUrl;
    d.append(img);
    if (slotOfFile[f.name]) {
      const tag = document.createElement('div');
      tag.className = 'tag';
      tag.textContent = slotOfFile[f.name];
      d.append(tag);
    }
    d.title = f.name;
    d.onclick = () => putInSlot(f, activeSlot);
    box.append(d);
  });
}

async function putInSlot(file, slot) {
  busy(true, 'Готовлю фото…');
  let img = await loadImage(file.dataUrl);
  if (img && data.removeBg && (slot === 'front' || slot === 'rear')) img = cutBackground(img, data.tolerance);
  photos[slot] = img;

  // Обновляем подписи: файл теперь занимает этот слот.
  for (const [name, s] of Object.entries(slotOfFile)) if (s === slot) delete slotOfFile[name];
  slotOfFile[file.name] = slot;

  buildSlots(); buildGallery();
  busy(false);
  scheduleRedraw();
}

function syncFormFromData() {
  $('f-brand').value = data.brand || '';
  $('f-model').value = data.model || '';
  $('f-version').value = data.version || '';
  $('f-accent').value = data.accent || '#f97316';
  $('f-removebg').checked = !!data.removeBg;
  $('f-corners').checked = data.corners !== false;
  $('f-logo2').checked = !!data.logoOnSecond;
  $('f-dark').checked = data.theme === 'dark';
  $('f-tol').value = data.tolerance ?? 38;
  $('tol-val').textContent = data.tolerance ?? 38;
  buildSpecs(); buildKit(); buildSlots(); buildGallery();
}

// ── Отрисовка ────────────────────────────────────────────────────────────────
function scheduleRedraw() {
  clearTimeout(redrawTimer);
  redrawTimer = setTimeout(redraw, 120);
}

function redraw() {
  const payload = { ...data, photos };
  renderCard1($('c1'), payload, { logo });
  renderCard2($('c2'), payload, { logo });
  $('btn-save').disabled = !(data.brand || data.model);
}

// ── Папка с фото ─────────────────────────────────────────────────────────────
async function openFolder() {
  const dir = await window.api.chooseFolder();
  if (!dir) return;
  await loadFolder(dir);
}

async function loadFolder(dir) {
  busy(true, 'Читаю папку…');
  folder = dir;
  $('folder-name').textContent = dir;

  files = await window.api.readFolder(dir);

  // Если рядом лежит данные.txt — берём оттуда, иначе оставляем текущие поля.
  const txt = await window.api.readDataFile(dir);
  if (txt) {
    const parsed = parseData(txt);
    data = { ...data, ...parsed, corners: data.corners };
  } else {
    // Имя папки обычно и есть «БРЕНД МОДЕЛЬ ВЕРСИЯ».
    const parts = dir.split(/[\\/]/).pop().split(/\s+/).filter(Boolean);
    if (parts.length && !data.brand) {
      data.brand = (parts[0] || '').toUpperCase();
      data.model = (parts[1] || '').toUpperCase();
      data.version = (parts.slice(2).join(' ') || '').toUpperCase();
    }
  }

  busy(true, 'Раскладываю фото…');
  const res = await assignPhotos(files, data.kit, { removeBg: data.removeBg, tolerance: data.tolerance });
  photos = res.photos;
  slotOfFile = {};
  res.report.forEach(r => { if (r.name) slotOfFile[r.name] = r.slot; });

  syncFormFromData();
  redraw();
  busy(false);

  const named = res.report.filter(r => r.status === 'по имени').length;
  toast(`Фото: ${files.length}. Разложено по именам: ${named}`, 'ok');
}

// ── Сохранение ───────────────────────────────────────────────────────────────
async function saveCards(targetDir = null, silent = false) {
  const name = [data.brand, data.model, data.version].filter(Boolean).join(' ') || 'Карточки';
  const cards = [
    { filename: `${name} — 1 главная.png`, dataUrl: canvasToDataUrl($('c1')) },
    { filename: `${name} — 2 комплектация.png`, dataUrl: canvasToDataUrl($('c2')) },
  ];
  const res = await window.api.saveCards({ name, cards, targetDir });
  if (!res) return null;

  if (folder) await window.api.writeDataFile(folder, stringifyData(data));
  if (!silent) {
    toast('Готово: ' + res.dir, 'ok');
    window.api.openFolder(res.dir);
  }
  return res;
}

// ── Пакетный режим ───────────────────────────────────────────────────────────
async function batch() {
  const root = await window.api.chooseFolder();
  if (!root) return;

  const dirs = await window.api.listModelFolders(root);
  if (!dirs.length) { toast('В этой папке нет вложенных папок с моделями', 'err'); return; }

  const out = await window.api.saveCards({ name: '.', cards: [], targetDir: null });
  if (!out) return;
  const targetRoot = out.dir.replace(/[\\/]\.$/, '');

  let ok = 0, skipped = 0;
  for (let i = 0; i < dirs.length; i++) {
    const d = dirs[i];
    busy(true, `Обрабатываю ${i + 1} из ${dirs.length}: ${d.name}`);
    try {
      const txt = await window.api.readDataFile(d.path);
      const base = emptyData();
      const parsed = txt ? parseData(txt) : {};
      const parts = d.name.split(/\s+/).filter(Boolean);
      data = {
        ...base, ...parsed,
        brand: parsed.brand || (parts[0] || '').toUpperCase(),
        model: parsed.model || (parts[1] || '').toUpperCase(),
        version: parsed.version || (parts.slice(2).join(' ') || '').toUpperCase(),
      };

      files = await window.api.readFolder(d.path);
      if (!files.length) { skipped++; continue; }

      const res = await assignPhotos(files, data.kit, { removeBg: data.removeBg, tolerance: data.tolerance });
      photos = res.photos;
      redraw();
      await new Promise(r => setTimeout(r, 30));  // даём кадру дорисоваться
      await saveCards(targetRoot, true);
      ok++;
    } catch (e) {
      console.error(d.name, e);
      skipped++;
    }
  }

  busy(false);
  syncFormFromData();
  toast(`Готово: ${ok}${skipped ? `, пропущено: ${skipped}` : ''}`, 'ok');
  window.api.openFolder(targetRoot);
}

// ── Привязка полей ───────────────────────────────────────────────────────────
function bindField(id, key, transform = (v) => v) {
  $(id).addEventListener('input', (e) => {
    data[key] = transform(e.target.type === 'checkbox' ? e.target.checked : e.target.value);
    scheduleRedraw();
  });
}

bindField('f-brand', 'brand', v => v.toUpperCase());
bindField('f-model', 'model', v => v.toUpperCase());
bindField('f-version', 'version', v => v.toUpperCase());
bindField('f-accent', 'accent');
bindField('f-corners', 'corners');
bindField('f-logo2', 'logoOnSecond');

$('f-dark').addEventListener('change', (e) => {
  data.theme = e.target.checked ? 'dark' : 'light';
  scheduleRedraw();
});

$('f-removebg').addEventListener('change', async (e) => {
  data.removeBg = e.target.checked;
  if (files.length) {
    busy(true, 'Пересобираю фото…');
    const res = await assignPhotos(files, data.kit, { removeBg: data.removeBg, tolerance: data.tolerance });
    photos = res.photos;
    busy(false);
  }
  scheduleRedraw();
});

// Ползунок силы вырезания: пересобираем фото только когда отпустили,
// иначе каждое движение запускает тяжёлый пересчёт всех картинок.
$('f-tol').addEventListener('input', (e) => {
  data.tolerance = Number(e.target.value);
  $('tol-val').textContent = e.target.value;
});
$('f-tol').addEventListener('change', async () => {
  if (!files.length || !data.removeBg) return;
  busy(true, 'Пересобираю фото…');
  const res = await assignPhotos(files, data.kit, { removeBg: data.removeBg, tolerance: data.tolerance });
  photos = res.photos;
  busy(false);
  scheduleRedraw();
});

$('btn-folder').onclick = openFolder;
$('btn-batch').onclick = batch;
$('btn-save').onclick = () => saveCards();

// ── Старт ────────────────────────────────────────────────────────────────────
(async function init() {
  $('size-label').textContent = `${CARD_W} × ${CARD_H}`;
  await fontsReady();
  logo = await loadImage('../шаблон/ассеты/логотип.png');
  syncFormFromData();
  redraw();
})();
