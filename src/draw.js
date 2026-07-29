// Примитивы рисования. Работают поверх @napi-rs/canvas — это тот же Canvas 2D,
// что и в браузере, только внутри Node, поэтому программа не требует ни браузера,
// ни интернета.

import { createCanvas, GlobalFonts, loadImage as _loadImage, Path2D } from '@napi-rs/canvas';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.join(HERE, '..', 'шаблон', 'шрифты');

// Вариативный Montserrat в Node отдаёт один и тот же вес на все запросы,
// поэтому регистрируем СТАТИЧЕСКИЕ начертания под отдельными именами семейств.
const FAMILY = { 500: 'MontM', 600: 'MontSB', 700: 'MontB', 800: 'MontEB', 900: 'MontBk' };
const FILES = { 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };

let fontsReady = false;
export function registerFonts() {
  if (fontsReady) return;
  for (const [weight, family] of Object.entries(FAMILY)) {
    const file = path.join(FONT_DIR, `Montserrat-${FILES[weight]}.ttf`);
    GlobalFonts.registerFromPath(file, family);
  }
  fontsReady = true;
}

export function font(weight, size) {
  const w = FAMILY[weight] ? weight : (weight >= 850 ? 900 : weight >= 750 ? 800 : weight >= 650 ? 700 : weight >= 550 ? 600 : 500);
  return `${Math.max(1, Math.round(size))}px ${FAMILY[w]}`;
}

export const loadImage = _loadImage;

// ── Детерминированный шум ────────────────────────────────────────────────────
// Гранж должен быть одинаковым при каждом запуске, иначе повторная генерация
// той же модели даёт другой файл.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Воспринимаемая яркость цвета (0 — чёрный, 1 — белый).
export function luminance(hex) {
  const m = String(hex).replace('#', '');
  const full = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  if ([r, g, b].some(Number.isNaN)) return 0.4;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function seedFrom(str) {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ── Геометрия ────────────────────────────────────────────────────────────────
export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

export function panel(ctx, rect, { radius = 18, stroke = '#e8192c', lineWidth = 3, fill = '#ffffff', shadow = false } = {}) {
  ctx.save();
  if (shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.10)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 4;
  }
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();

  if (lineWidth > 0) {
    roundRect(ctx, rect.x + lineWidth / 2, rect.y + lineWidth / 2, rect.w - lineWidth, rect.h - lineWidth, radius);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

// ── Текст ────────────────────────────────────────────────────────────────────
// Вписывает текст в прямоугольник: подбирает кегль, затем при необходимости
// сжимает по горизонтали, но не сильнее minScale — иначе буквы становятся лапшой.
export function fitText(ctx, text, rect, opts = {}) {
  const {
    weight = 700, color = '#111111', align = 'left', valign = 'top',
    maxSize = rect.h, minSize = 8, minScale = 0.72, tracking = 0,
    lineGap = 0.06, uppercase = false, wrap = false,
  } = opts;

  const raw = String(uppercase ? String(text).toUpperCase() : text);
  const lineFactor = 1 + lineGap;

  const widthOf = (s, size) => {
    ctx.font = font(weight, size);
    return ctx.measureText(s).width + tracking * Math.max(0, s.length - 1);
  };

  // Перенос по словам: длинное название детали должно ложиться в две строки,
  // а не сжиматься по горизонтали до нечитаемого вида.
  const wrapAt = (size) => {
    const out = [];
    for (const para of raw.split('\n')) {
      const words = para.split(/\s+/).filter(Boolean);
      if (!words.length) continue;
      let line = words[0];
      for (let i = 1; i < words.length; i++) {
        const probe = `${line} ${words[i]}`;
        if (widthOf(probe, size) <= rect.w) line = probe;
        else { out.push(line); line = words[i]; }
      }
      out.push(line);
    }
    return out;
  };

  let lines;
  let size;

  if (wrap) {
    size = Math.round(Math.min(maxSize, rect.h / lineFactor / 0.74));
    for (; size > minSize; size--) {
      const test = wrapAt(size);
      const fitsH = test.length * size * lineFactor <= rect.h;
      const fitsW = test.every(l => widthOf(l, size) <= rect.w);
      if (fitsH && fitsW) break;
    }
    lines = wrapAt(size);
  } else {
    lines = raw.split('\n').filter(l => l.length > 0);
    if (!lines.length) return;
    size = Math.min(maxSize, rect.h / (lines.length * lineFactor) / 0.74);
    while (size > minSize && Math.max(...lines.map(l => widthOf(l, size))) > rect.w / minScale) size -= 1;
  }
  if (!lines.length) return;

  const measure = (s) => Math.max(...lines.map(l => widthOf(l, s)));

  const width = measure(size);
  const scaleX = width > rect.w ? Math.max(minScale, rect.w / width) : 1;

  ctx.save();
  ctx.font = font(weight, size);
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';

  const lineH = size * lineFactor;
  const blockH = lineH * lines.length;
  let y = rect.y;
  if (valign === 'middle') y = rect.y + (rect.h - blockH) / 2;
  else if (valign === 'bottom') y = rect.y + rect.h - blockH;

  lines.forEach((line, i) => {
    const lw = (ctx.measureText(line).width + tracking * Math.max(0, line.length - 1)) * scaleX;
    let x = rect.x;
    if (align === 'center') x = rect.x + (rect.w - lw) / 2;
    else if (align === 'right') x = rect.x + rect.w - lw;

    const baseline = y + lineH * i + size * 0.78;
    ctx.save();
    ctx.translate(x, baseline);
    ctx.scale(scaleX, 1);
    if (tracking) {
      let cx = 0;
      for (const ch of line) {
        ctx.fillText(ch, cx, 0);
        cx += ctx.measureText(ch).width + tracking;
      }
    } else {
      ctx.fillText(line, 0, 0);
    }
    ctx.restore();
  });

  ctx.restore();
}

// Крупный текст с гранжевыми потёртостями — как название модели в референсе.
export function grungeText(ctx, text, rect, opts = {}) {
  const { seed = 1, ...rest } = opts;
  const tmp = createCanvas(Math.ceil(rect.w) + 40, Math.ceil(rect.h) + 40);
  const t = tmp.getContext('2d');

  fitText(t, text, { x: 20, y: 20, w: rect.w, h: rect.h }, rest);

  // Потёртая краска, а не телепомехи: короткие редкие царапины и мелкая крошка.
  const rnd = mulberry32(seed);
  t.globalCompositeOperation = 'destination-out';
  t.fillStyle = '#000';

  const scratches = Math.round(tmp.height / 26);
  for (let i = 0; i < scratches; i++) {
    t.globalAlpha = 0.20 + rnd() * 0.28;
    t.fillRect(rnd() * tmp.width, rnd() * tmp.height, 12 + rnd() * (tmp.width * 0.22), 0.8 + rnd() * 1.6);
  }
  const specks = Math.round((tmp.width * tmp.height) / 26000);
  for (let i = 0; i < specks; i++) {
    t.globalAlpha = 0.18 + rnd() * 0.3;
    t.beginPath();
    t.arc(rnd() * tmp.width, rnd() * tmp.height, 0.5 + rnd() * 1.6, 0, Math.PI * 2);
    t.fill();
  }
  t.globalAlpha = 1;
  t.globalCompositeOperation = 'source-over';

  ctx.drawImage(tmp, rect.x - 20, rect.y - 20);
}

// ── Изображения ──────────────────────────────────────────────────────────────
export function drawContain(ctx, img, rect, { align = 'center', valign = 'middle' } = {}) {
  if (!img) return null;
  const scale = Math.min(rect.w / img.width, rect.h / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  let x = rect.x + (rect.w - w) / 2;
  let y = rect.y + (rect.h - h) / 2;
  if (align === 'left') x = rect.x;
  if (align === 'right') x = rect.x + rect.w - w;
  if (valign === 'top') y = rect.y;
  if (valign === 'bottom') y = rect.y + rect.h - h;
  ctx.drawImage(img, x, y, w, h);
  return { x, y, w, h };
}

export function drawCover(ctx, img, rect, radius = 0) {
  if (!img) return;
  ctx.save();
  if (radius > 0) { roundRect(ctx, rect.x, rect.y, rect.w, rect.h, radius); ctx.clip(); }
  const scale = Math.max(rect.w / img.width, rect.h / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, rect.x + (rect.w - w) / 2, rect.y + (rect.h - h) / 2, w, h);
  ctx.restore();
}

// Мягкая контактная тень — чтобы транспорт не висел в воздухе.
export function contactShadow(ctx, box, strength = 0.42) {
  if (!box) return;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h - 6; // чуть выше нижней кромки — тень «из-под» колёс
  const rx = box.w * 0.44;
  const ry = box.h * 0.05;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
  g.addColorStop(0, `rgba(0,0,0,${strength})`);
  g.addColorStop(0.55, `rgba(0,0,0,${strength * 0.35})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  ctx.translate(-cx, -cy);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── Иконки ───────────────────────────────────────────────────────────────────
// Контуры lucide (viewBox 24×24) — тот же стиль, что на сайте.
const ICONS = {
  battery: ['M3 8h13a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2z', 'M21 10.5v3', 'm10.5 9.5-2.5 3.2h3l-2.5 3.3'],
  route:   ['M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15', 'M6 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  gauge:   ['m12 14 4-4', 'M3.34 19a10 10 0 1 1 17.32 0'],
  cell:    ['M3 8h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2z', 'M21 10.5v3', 'M5.5 12h3', 'M12 10.5v3', 'M10.5 12h3'],
  shield:  ['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z', 'm9 12 2 2 4-4'],
  motor:   ['M4 6h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z', 'M18 10h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2', 'M7 3v3', 'M13 3v3', 'M7 18v3', 'M13 18v3'],
  drop:    ['M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z'],
  weight:  ['M12 3a4 4 0 0 0-4 4h8a4 4 0 0 0-4-4z', 'M5 21h14l-2-11H7z'],
  power:   ['M12 2v10', 'M18.4 6.6a9 9 0 1 1-12.77.04'],
  bolt:    ['m13 2-9 12h7l-1 8 9-12h-7z'],
};

export const ICON_NAMES = Object.keys(ICONS);

export function icon(ctx, name, x, y, size, color, lineWidth = 2) {
  const paths = ICONS[name] || ICONS.bolt;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const d of paths) ctx.stroke(new Path2D(d));
  ctx.restore();
}

// ── Фон ──────────────────────────────────────────────────────────────────────
export function drawBackground(ctx, w, h, accent, seed = 7, mountains = null) {
  const rnd = mulberry32(seed);

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.55, '#f7f8fa');
  g.addColorStop(1, '#eceef1');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Если из референса вырезана подложка с горами — используем её.
  if (mountains) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(mountains, 0, 0, w, h);
    ctx.restore();
  } else {
    const layers = [
      { base: h * 0.58, amp: h * 0.17, alpha: 0.16, step: w / 5 },
      { base: h * 0.68, amp: h * 0.14, alpha: 0.20, step: w / 4 },
      { base: h * 0.78, amp: h * 0.10, alpha: 0.13, step: w / 3 },
    ];
    for (const L of layers) {
      ctx.beginPath();
      ctx.moveTo(0, h);
      let x = 0;
      ctx.lineTo(x, L.base + (rnd() - 0.5) * L.amp);
      while (x < w) {
        const nx = x + L.step * (0.6 + rnd() * 0.8);
        ctx.lineTo((x + nx) / 2, L.base - L.amp * (0.4 + rnd() * 0.9));
        ctx.lineTo(nx, L.base + (rnd() - 0.5) * L.amp * 0.7);
        x = nx;
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = `rgba(120,130,145,${L.alpha})`;
      ctx.fill();
    }
  }

  // Динамические мазки: пучок диагоналей в правой части, как в референсе.
  // Обрезаем зону, чтобы они не лезли на логотип и на название модели слева.
  ctx.save();
  ctx.beginPath();
  ctx.rect(w * 0.33, h * 0.12, w * 0.67, h * 0.70);
  ctx.clip();
  // Крутим вокруг центра зоны — так пучок гарантированно попадает в кадр.
  ctx.translate(w * 0.76, h * 0.44);
  ctx.rotate((30 * Math.PI) / 180);

  // Жёлтый и другие светлые акценты на белом фоне почти не читаются —
  // для них поднимаем плотность мазков.
  const lum = luminance(accent);
  const boost = lum > 0.62 ? 1.6 : lum > 0.45 ? 1.25 : 1;

  const count = 16;
  for (let i = 0; i < count; i++) {
    const off = (i - count / 2) * (30 + rnd() * 26);
    const len = h * (0.6 + rnd() * 0.55);
    const thick = 5 + rnd() * 32;
    const dark = i % 4 === 0;
    ctx.globalAlpha = Math.min(0.92, (dark ? 0.09 + rnd() * 0.16 : 0.20 + rnd() * 0.48) * boost);
    ctx.fillStyle = dark ? '#1b1b1b' : accent;
    ctx.fillRect(off, -len / 2, thick, len);
    // Рваные «хвосты» — мазок не обрывается ровной линией.
    ctx.globalAlpha *= 0.5;
    ctx.fillRect(off, len / 2 + 14 + rnd() * 36, thick * (0.3 + rnd() * 0.5), 18 + rnd() * 60);
    ctx.fillRect(off, -len / 2 - 30 - rnd() * 44, thick * 0.45, 16 + rnd() * 30);
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // Светлая «полка» под товаром, чтобы он стоял, а не парил.
  const floor = ctx.createLinearGradient(0, h * 0.80, 0, h);
  floor.addColorStop(0, 'rgba(255,255,255,0)');
  floor.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  floor.addColorStop(1, 'rgba(255,255,255,0.85)');
  ctx.fillStyle = floor;
  ctx.fillRect(0, h * 0.80, w, h * 0.20);
}

// Лёгкая зернистость — убирает стерильность чистого градиента.
export function grain(ctx, w, h, amount = 0.02, seed = 3) {
  const rnd = mulberry32(seed);
  const tmp = createCanvas(w, h);
  const t = tmp.getContext('2d');
  const img = t.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (rnd() - 0.5) * 255 * amount;
    d[i] = d[i + 1] = d[i + 2] = 128 + v;
    d[i + 3] = Math.abs(v) * 2;
  }
  t.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.5;
  ctx.drawImage(tmp, 0, 0);
  ctx.restore();
}
