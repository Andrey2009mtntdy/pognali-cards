// Примитивы рисования для тёмного шаблона. Обычный Canvas 2D в окне приложения —
// никаких нативных библиотек, поэтому .exe собирается без компиляции под Windows.

// ── Шрифты ───────────────────────────────────────────────────────────────────
const FAMILY = { 500: 'MontM', 600: 'MontSB', 700: 'MontB', 800: 'MontEB', 900: 'MontBk' };

export function font(weight, size, italic = false) {
  const w = FAMILY[weight] ? weight
    : weight >= 850 ? 900 : weight >= 750 ? 800 : weight >= 650 ? 700 : weight >= 550 ? 600 : 500;
  return `${italic ? 'italic ' : ''}${Math.max(1, Math.round(size))}px ${FAMILY[w]}, Arial, sans-serif`;
}

export function fontsReady() {
  return document.fonts.ready;
}

// ── Детерминированный шум ────────────────────────────────────────────────────
// Фон и потёртости должны быть одинаковыми при каждом рендере одной модели,
// иначе превью «дрожит» и повторная генерация даёт другой файл.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(str) {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// ── Формы ────────────────────────────────────────────────────────────────────
export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Плашка со срезанными углами — фирменная форма тёмного шаблона.
// corners: какие углы срезать (tl, tr, br, bl).
export function chamferPath(ctx, x, y, w, h, cut, corners = { tl: false, tr: true, br: false, bl: true }) {
  const c = Math.min(cut, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + (corners.tl ? c : 0), y);
  ctx.lineTo(x + w - (corners.tr ? c : 0), y);
  if (corners.tr) ctx.lineTo(x + w, y + c);
  ctx.lineTo(x + w, y + h - (corners.br ? c : 0));
  if (corners.br) ctx.lineTo(x + w - c, y + h);
  ctx.lineTo(x + (corners.bl ? c : 0), y + h);
  if (corners.bl) ctx.lineTo(x, y + h - c);
  ctx.lineTo(x, y + (corners.tl ? c : 0));
  if (corners.tl) ctx.lineTo(x + c, y);
  ctx.closePath();
}

export function panel(ctx, rect, opts = {}) {
  const {
    cut = 14, fill = 'rgba(16,18,24,0.86)', stroke = 'rgba(255,255,255,0.10)',
    lineWidth = 1.5, corners, accent = null, accentWidth = 4,
  } = opts;

  chamferPath(ctx, rect.x, rect.y, rect.w, rect.h, cut, corners);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lineWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  // Акцентная полоса слева — как в образце у плашек характеристик.
  if (accent) {
    ctx.save();
    chamferPath(ctx, rect.x, rect.y, rect.w, rect.h, cut, corners);
    ctx.clip();
    ctx.fillStyle = accent;
    ctx.fillRect(rect.x, rect.y, accentWidth, rect.h);
    ctx.restore();
  }
}

// ── Текст ────────────────────────────────────────────────────────────────────
// Вписывает текст в прямоугольник: подбирает кегль, переносит по словам,
// в крайнем случае сжимает по горизонтали (но не в нечитаемую лапшу).
export function fitText(ctx, text, rect, opts = {}) {
  const {
    weight = 700, color = '#fff', align = 'left', valign = 'top',
    maxSize = rect.h, minSize = 8, minScale = 0.75, tracking = 0,
    lineGap = 0.08, uppercase = false, wrap = false, italic = false,
  } = opts;

  const raw = String(uppercase ? String(text).toUpperCase() : text);
  if (!raw.trim()) return;
  const lineFactor = 1 + lineGap;

  const widthOf = (s, size) => {
    ctx.font = font(weight, size, italic);
    return ctx.measureText(s).width + tracking * Math.max(0, s.length - 1);
  };

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

  let lines, size;
  if (wrap) {
    size = Math.round(Math.min(maxSize, rect.h / lineFactor / 0.74));
    for (; size > minSize; size--) {
      const test = wrapAt(size);
      if (test.length * size * lineFactor <= rect.h && test.every(l => widthOf(l, size) <= rect.w)) break;
    }
    lines = wrapAt(size);
  } else {
    lines = raw.split('\n').filter(l => l.length > 0);
    size = Math.min(maxSize, rect.h / (lines.length * lineFactor) / 0.74);
    while (size > minSize && Math.max(...lines.map(l => widthOf(l, size))) > rect.w / minScale) size -= 1;
  }
  if (!lines.length) return;

  const measured = Math.max(...lines.map(l => widthOf(l, size)));
  const scaleX = measured > rect.w ? Math.max(minScale, rect.w / measured) : 1;

  ctx.save();
  ctx.font = font(weight, size, italic);
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

    ctx.save();
    ctx.translate(x, y + lineH * i + size * 0.78);
    ctx.scale(scaleX, 1);
    if (tracking) {
      let cx = 0;
      for (const ch of line) { ctx.fillText(ch, cx, 0); cx += ctx.measureText(ch).width + tracking; }
    } else {
      ctx.fillText(line, 0, 0);
    }
    ctx.restore();
  });
  ctx.restore();
  return { size, lines: lines.length };
}

// Двухцветная строка «WISH 03»: первое слово белым, остальное акцентом.
export function fitTwoTone(ctx, first, second, rect, opts = {}) {
  const { weight = 900, colorA = '#fff', colorB = '#f97316', italic = true, gap = 0.22 } = opts;
  const text = second ? `${first} ${second}` : first;

  let size = Math.round(rect.h / 0.78);
  const measure = (s) => { ctx.font = font(weight, s, italic); return ctx.measureText(text).width; };
  while (size > 10 && measure(size) > rect.w) size -= 2;

  ctx.save();
  ctx.font = font(weight, size, italic);
  ctx.textBaseline = 'alphabetic';
  const baseline = rect.y + rect.h - (rect.h - size * 0.72) / 2;

  ctx.fillStyle = colorA;
  ctx.fillText(first, rect.x, baseline);
  if (second) {
    const w = ctx.measureText(first).width + size * gap * 0.5;
    ctx.fillStyle = colorB;
    ctx.fillText(second, rect.x + w, baseline);
  }
  ctx.restore();
}

// ── Изображения ──────────────────────────────────────────────────────────────
export function drawContain(ctx, img, rect, { align = 'center', valign = 'middle' } = {}) {
  if (!img) return null;
  const scale = Math.min(rect.w / img.width, rect.h / img.height);
  const w = img.width * scale, h = img.height * scale;
  let x = rect.x + (rect.w - w) / 2;
  let y = rect.y + (rect.h - h) / 2;
  if (align === 'left') x = rect.x;
  if (align === 'right') x = rect.x + rect.w - w;
  if (valign === 'top') y = rect.y;
  if (valign === 'bottom') y = rect.y + rect.h - h;
  ctx.drawImage(img, x, y, w, h);
  return { x, y, w, h };
}

export function drawCoverPath(ctx, img, rect, pathFn) {
  if (!img) return;
  ctx.save();
  pathFn();
  ctx.clip();
  const scale = Math.max(rect.w / img.width, rect.h / img.height);
  const w = img.width * scale, h = img.height * scale;
  ctx.drawImage(img, rect.x + (rect.w - w) / 2, rect.y + (rect.h - h) / 2, w, h);
  ctx.restore();
}

// Мягкая тень под товаром, чтобы он не висел в воздухе.
export function contactShadow(ctx, box, strength = 0.5) {
  if (!box) return;
  const cx = box.x + box.w / 2, cy = box.y + box.h - 6;
  const rx = box.w * 0.44, ry = box.h * 0.05;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
  g.addColorStop(0, `rgba(0,0,0,${strength})`);
  g.addColorStop(0.55, `rgba(0,0,0,${strength * 0.35})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(1, ry / rx); ctx.translate(-cx, -cy);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, rx, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ── Иконки ───────────────────────────────────────────────────────────────────
const ICONS = {
  battery: ['M3 8h13a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2z', 'M21 10.5v3', 'm10.5 9.5-2.5 3.2h3l-2.5 3.3'],
  route:   ['M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15', 'M6 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  gauge:   ['m12 14 4-4', 'M3.34 19a10 10 0 1 1 17.32 0'],
  power:   ['m13 2-9 12h7l-1 8 9-12h-7z'],
  motor:   ['M4 6h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z', 'M18 10h2a2 2 0 0 1 2 2a2 2 0 0 1-2 2h-2', 'M7 3v3', 'M13 3v3', 'M7 18v3', 'M13 18v3'],
  weight:  ['M12 3a4 4 0 0 0-4 4h8a4 4 0 0 0-4-4z', 'M5 21h14l-2-11H7z'],
  shield:  ['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z', 'm9 12 2 2 4-4'],
  drop:    ['M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z'],
  clock:   ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 6v6l4 2'],
};

export const ICON_NAMES = Object.keys(ICONS);

export function icon(ctx, name, x, y, size, color, lineWidth = 2) {
  const paths = ICONS[name] || ICONS.power;
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

// ── Фоны ─────────────────────────────────────────────────────────────────────
// Гексагональная сетка — техно-подложка из образца.
function hexGrid(ctx, x, y, w, h, size, color, alpha) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1;
  const hs = size * Math.sqrt(3) / 2;
  for (let row = 0, cy = y; cy < y + h + size; row++, cy += size * 1.5) {
    const offset = row % 2 ? hs : 0;
    for (let cx = x + offset; cx < x + w + size; cx += hs * 2) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 180) * (60 * i - 30);
        const px = cx + size * Math.cos(a), py = cy + size * Math.sin(a);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Косые световые полосы — «скорость» на фоне.
function lightStreaks(ctx, x, y, w, h, accent, seed, density = 12) {
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.translate(x + w * 0.55, y + h * 0.5);
  ctx.rotate((-28 * Math.PI) / 180);
  for (let i = 0; i < density; i++) {
    const off = (i - density / 2) * (34 + rnd() * 46);
    const len = h * (1.4 + rnd() * 0.8);
    const thick = 3 + rnd() * 26;
    const warm = i % 3 !== 0;
    const g = ctx.createLinearGradient(off, -len / 2, off, len / 2);
    const col = warm ? accent : '#ffffff';
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = warm ? 0.10 + rnd() * 0.30 : 0.05 + rnd() * 0.10;
    ctx.fillStyle = g;
    ctx.fillRect(off, -len / 2, thick, len);
  }
  ctx.restore();
}

// Фон главной карточки: тёмный стальной градиент со световыми полосами.
export function darkBackground(ctx, w, h, accent, seed) {
  const g = ctx.createLinearGradient(0, 0, w * 0.4, h);
  g.addColorStop(0, '#20242c');
  g.addColorStop(0.45, '#2b313a');
  g.addColorStop(1, '#15181e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  hexGrid(ctx, 0, 0, w, h, 46, '#ffffff', 0.035);
  lightStreaks(ctx, w * 0.28, 0, w * 0.72, h * 0.86, accent, seed, 14);

  // Тёплое свечение за товаром.
  const glow = ctx.createRadialGradient(w * 0.62, h * 0.46, 0, w * 0.62, h * 0.46, w * 0.55);
  glow.addColorStop(0, hexToRgba(accent, 0.22));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Затемнение снизу — «земля» под товаром.
  const floor = ctx.createLinearGradient(0, h * 0.62, 0, h);
  floor.addColorStop(0, 'rgba(0,0,0,0)');
  floor.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = floor;
  ctx.fillRect(0, h * 0.62, w, h * 0.38);
}

// Фон карточки комплектации: светлый верх под товар, тёмный низ под блоки.
export function splitBackground(ctx, w, h, accent, seed, splitY) {
  const top = ctx.createLinearGradient(0, 0, w, splitY);
  top.addColorStop(0, '#f2f0ee');
  top.addColorStop(0.55, '#e6e3df');
  top.addColorStop(1, '#d8d5d0');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, splitY);

  hexGrid(ctx, 0, 0, w, splitY, 40, '#9aa3b2', 0.16);
  lightStreaks(ctx, w * 0.30, 0, w * 0.70, splitY, accent, seed, 10);

  const bottom = ctx.createLinearGradient(0, splitY, 0, h);
  bottom.addColorStop(0, '#1d2128');
  bottom.addColorStop(1, '#14171c');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, splitY, w, h - splitY);

  hexGrid(ctx, 0, splitY, w, h - splitY, 44, '#ffffff', 0.03);

  // Оранжевая линия раздела.
  ctx.fillStyle = hexToRgba(accent, 0.85);
  ctx.fillRect(0, splitY - 2, w, 3);
}

// Угловые технические скобки по краям кадра.
export function frameCorners(ctx, w, h, accent, len = 54, inset = 16, lw = 3) {
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = lw;
  ctx.globalAlpha = 0.9;
  const corners = [
    [inset, inset, 1, 1], [w - inset, inset, -1, 1],
    [inset, h - inset, 1, -1], [w - inset, h - inset, -1, -1],
  ];
  for (const [x, y, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x + sx * len, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + sy * len);
    ctx.stroke();
  }
  ctx.restore();
}

export function hexToRgba(hex, a) {
  const m = String(hex).replace('#', '');
  const full = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ── Загрузка и обработка фото ────────────────────────────────────────────────
export function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Убираем однотонный фон заливкой от краёв и обрезаем пустые поля.
// Так товар плотно ложится в кадр, а тень встаёт под колёса, а не под край файла.
// Допуск намеренно умеренный: при большом заливка просачивается сквозь блики
// на тёмном пластике и выедает сам товар. Регулируется ползунком в окне.
export function cutBackground(img, tolerance = 38) {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, c.width, c.height);
  const px = imgData.data;
  const { width, height } = c;

  let r0 = 0, g0 = 0, b0 = 0;
  for (const [x, y] of [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]) {
    const i = (y * width + x) * 4;
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
    const i = p * 4;
    if (!close(i)) continue;
    seen[p] = 1;
    px[i + 3] = 0;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }

  // Мягкая кромка: пиксель у самой границы почти всегда смесь товара и фона.
  // Гасим его частично, иначе по контуру остаётся светлый ободок.
  const soft = tolerance * 1.15;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      const i = p * 4;
      if (px[i + 3] === 0) continue;
      const nearHole = seen[p - 1] || seen[p + 1] || seen[p - width] || seen[p + width];
      if (!nearHole) continue;
      const dist = Math.abs(px[i] - r0) + Math.abs(px[i + 1] - g0) + Math.abs(px[i + 2] - b0);
      if (dist < soft) px[i + 3] = Math.round(255 * (dist / soft) ** 1.4);
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Обрезаем прозрачные поля.
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (px[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return c;

  const out = document.createElement('canvas');
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  out.getContext('2d').drawImage(c, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}
