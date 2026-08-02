// Примитивы рисования для тёмного шаблона. Обычный Canvas 2D в окне приложения —
// никаких нативных библиотек, поэтому .exe собирается без компиляции под Windows.

// ── Шрифты ───────────────────────────────────────────────────────────────────
const FAMILY = { 500: 'MontM', 600: 'MontSB', 700: 'MontB', 800: 'MontEB', 900: 'MontBk' };

export function font(weight, size, italic = false) {
  const w = FAMILY[weight] ? weight
    : weight >= 850 ? 900 : weight >= 750 ? 800 : weight >= 650 ? 700 : weight >= 550 ? 600 : 500;
  return `${italic ? 'italic ' : ''}${Math.max(1, Math.round(size))}px ${FAMILY[w]}, Arial, sans-serif`;
}

export async function fontsReady() {
  // document.fonts.ready ждёт только те начертания, что уже понадобились
  // разметке. Курсив в интерфейсе не используется — он нужен лишь холсту,
  // поэтому запрашиваем его явно, иначе первый рендер уйдёт с подменой.
  const need = [
    '100px MontM', '100px MontSB', '100px MontB', '100px MontEB', '100px MontBk',
    'italic 100px MontEB', 'italic 100px MontBk',
  ];
  await Promise.all(need.map(f => document.fonts.load(f).catch(() => {})));
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

// Плашка каталожного шаблона: скруглённый прямоугольник с мягкой тенью.
// Тень рисуется отдельным проходом — иначе она ложится и на обводку, и на
// содержимое плашки.
export function softPanel(ctx, rect, opts = {}) {
  const {
    radius = 24, fill = '#ffffff', shadow = 'rgba(15,23,42,0.13)',
    blur = 26, offsetY = 8, stroke = null, lineWidth = 1.5,
  } = opts;

  if (shadow) {
    ctx.save();
    ctx.shadowColor = shadow;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetY = offsetY;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, radius);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  }

  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

// Квадратная плитка с иконкой — акцентная заливка, иконка светлая поверх.
export function iconTile(ctx, rect, name, { radius = 24, fill = '#F26522', iconColor = '#ffffff', inset = 26, lineWidth = 2.4 } = {}) {
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  icon(ctx, name, rect.x + inset, rect.y + inset, rect.w - inset * 2, iconColor, lineWidth);
}

// ── Текст ────────────────────────────────────────────────────────────────────
// Вписывает текст в прямоугольник: подбирает кегль, переносит по словам,
// в крайнем случае сжимает по горизонтали (но не в нечитаемую лапшу).
export function fitText(ctx, text, rect, opts = {}) {
  const {
    weight = 700, color = '#fff', align = 'left', valign = 'top',
    maxSize = rect.h, minSize = 8, minScale = 0.75, tracking = 0,
    lineGap = 0.08, uppercase = false, wrap = false, italic = false, bolder = 0,
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
    // Уплотнение: Montserrat Black — самое жирное начертание, что есть,
    // поэтому добавляем обводку тем же цветом. Наклонный текст без неё
    // выглядит тоньше прямого, хотя вес у них одинаковый.
    if (bolder) {
      ctx.strokeStyle = color;
      ctx.lineWidth = size * bolder;
      ctx.lineJoin = 'round';
      if (tracking) {
        let cx = 0;
        for (const ch of line) { ctx.strokeText(ch, cx, 0); cx += ctx.measureText(ch).width + tracking; }
      } else {
        ctx.strokeText(line, 0, 0);
      }
    }

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
  const { weight = 900, colorA = '#fff', colorB = '#f97316', italic = true, gap = 0.22, uppercase = true } = opts;
  // Название модели на карточке всегда прописными — так задумано в макете,
  // и это не должно зависеть от того, как его набрали в каталоге.
  if (uppercase) { first = String(first).toUpperCase(); second = String(second).toUpperCase(); }
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
// Куда именно ляжет картинка в рамке с учётом ручной подгонки.
// transform: { scale, dx, dy, rot } — множитель, сдвиг в долях от размера рамки
// и поворот в градусах; всё это задаёт пользователь в редакторе кадрирования.
export function placement(img, rect, mode = 'cover', transform) {
  if (!img) return null;
  const t = { scale: 1, dx: 0, dy: 0, rot: 0, ...(transform || {}) };
  const base = mode === 'cover'
    ? Math.max(rect.w / img.width, rect.h / img.height)
    : Math.min(rect.w / img.width, rect.h / img.height);
  const s = base * (t.scale || 1);
  const w = img.width * s;
  const h = img.height * s;
  return {
    x: rect.x + (rect.w - w) / 2 + (t.dx || 0) * rect.w,
    y: rect.y + (rect.h - h) / 2 + (t.dy || 0) * rect.h,
    w, h,
  };
}

// Рисует картинку в подготовленный прямоугольник, при необходимости повернув её
// вокруг собственного центра. Поворот отдельным шагом, а не внутри placement:
// расчёт позиции остаётся простым, а вертеть картинку умеют все, кто рисует.
export function drawPlaced(ctx, img, p, rot = 0) {
  if (!p) return;
  if (!rot) { ctx.drawImage(img, p.x, p.y, p.w, p.h); return; }
  ctx.save();
  ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.drawImage(img, -p.w / 2, -p.h / 2, p.w, p.h);
  ctx.restore();
}

export function drawContain(ctx, img, rect, { align = 'center', valign = 'middle', transform } = {}) {
  // С ручной подгонкой выравнивание по краям не применяем — позицию задаёт пользователь.
  if (img && transform && (transform.scale !== 1 || transform.dx || transform.dy || transform.rot)) {
    const p = placement(img, rect, 'contain', transform);
    drawPlaced(ctx, img, p, transform.rot);
    return p;
  }
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

export function drawCoverPath(ctx, img, rect, pathFn, transform) {
  if (!img) return;
  ctx.save();
  pathFn();
  ctx.clip();
  const p = placement(img, rect, 'cover', transform);
  drawPlaced(ctx, img, p, transform?.rot);
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
  // Влагозащита — крупная капля и маленькая рядом.
  drops:   [
    'M9 2.5 C 12.3 7.5 14 9.5 14 12 A 5 5 0 0 1 4 12 C 4 9.5 5.7 7.5 9 2.5 Z',
    'M18 11 C 20 14 21 15 21 16.5 A 3 3 0 0 1 15 16.5 C 15 15 16 14 18 11 Z',
  ],
  // Маркировка шины — колесо с протектором.
  tire:    [
    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
    'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z',
    'M12 2v3.2', 'M12 18.8V22', 'M2 12h3.2', 'M18.8 12H22',
    'M4.9 4.9 7.2 7.2', 'M16.8 16.8 19.1 19.1',
    'M19.1 4.9 16.8 7.2', 'M7.2 16.8 4.9 19.1',
  ],
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
function lightStreaks(ctx, x, y, w, h, accent, seed, density = 12, alphaScale = 1) {
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
    ctx.globalAlpha = (warm ? 0.10 + rnd() * 0.30 : 0.05 + rnd() * 0.10) * alphaScale;
    ctx.fillStyle = g;
    ctx.fillRect(off, -len / 2, thick, len);
  }
  ctx.restore();
}

// Горная гряда — водяной знак каталожного фона, отсылка к логотипу.
// Рисуется силуэтом: гребень из пиков, залитый вертикальным градиентом,
// поэтому подошва растворяется в фоне и не режет карточку линией.
function mountainRange(ctx, x, y, w, h, seed, { peaks = 6, alpha = 0.10, dark = false } = {}) {
  const rnd = mulberry32(seed);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  const tone = dark ? '255,255,255' : '17,24,39';
  g.addColorStop(0, `rgba(${tone},${alpha})`);
  g.addColorStop(0.65, `rgba(${tone},${alpha * 0.45})`);
  g.addColorStop(1, `rgba(${tone},0)`);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + h * (0.52 + rnd() * 0.26));
  const step = w / peaks;
  let px = x;
  for (let i = 0; i < peaks; i++) {
    const peakX = px + step * (0.32 + rnd() * 0.34);
    const peakY = y + h * (0.04 + rnd() * 0.40);
    const valleyX = px + step;
    const valleyY = y + h * (0.50 + rnd() * 0.30);
    ctx.lineTo(peakX, peakY);
    ctx.lineTo(valleyX, valleyY);
    px = valleyX;
  }
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

// Косые «скоростные» росчерки в верхнем правом углу — как на образце.
// Каждый росчерк сужается к острому концу, поэтому читается как след движения.
function speedSlashes(ctx, w, h, accent, seed, dark = false) {
  const rnd = mulberry32(seed ^ 0x9e3779b9);
  ctx.save();
  ctx.beginPath();
  ctx.rect(w * 0.40, 0, w * 0.60, h * 0.46);
  ctx.clip();
  ctx.translate(w * 0.99, h * 0.10);
  ctx.rotate((-27 * Math.PI) / 180);

  // [смещение по вертикали, длина, толщина, прозрачность, акцентный ли]
  const bars = [
    [-96, 470, 30, 0.90, true],
    [-52, 360, 20, 0.70, true],
    [-16, 250, 12, 0.45, true],
    [26, 415, 26, 0.85, true],
    [70, 300, 15, 0.55, true],
    [104, 210, 8, 0.16, false],
    [130, 330, 18, 0.12, false],
  ];

  for (const [oy, len, th, alpha, warm] of bars) {
    const jitter = (rnd() - 0.5) * 14;
    const y0 = oy + jitter;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.lineTo(0, y0 + th);
    ctx.lineTo(-len, y0 + th * 0.62);
    ctx.lineTo(-len, y0 + th * 0.30);
    ctx.closePath();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = warm ? accent : (dark ? '#ffffff' : '#c9ced6');
    ctx.fill();
  }
  ctx.restore();
}

// Готовая подложка из файла — растягивается на всю карточку по короткой стороне,
// лишнее обрезается. Выравнивание по верху: у фирменного фона сверху росчерк,
// а снизу однотонная «полка», её и не жалко срезать.
export function drawBackgroundImage(ctx, img, w, h, align = 'top') {
  const s = Math.max(w / img.width, h / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  const x = (w - dw) / 2;
  const y = align === 'top' ? 0 : align === 'bottom' ? h - dh : (h - dh) / 2;
  ctx.drawImage(img, x, y, dw, dh);
}

// Фон каталожной карточки: чистый лист, горы водяным знаком, росчерки в углу
// и светлая «полка» внизу, чтобы товар стоял, а не парил.
// Запасной вариант — работает, когда файла подложки нет или включена тёмная тема.
export function catalogBackground(ctx, w, h, accent, seed, dark = false) {
  const base = ctx.createLinearGradient(0, 0, w * 0.2, h);
  if (dark) {
    base.addColorStop(0, '#22262e');
    base.addColorStop(0.5, '#1b1f26');
    base.addColorStop(1, '#12151a');
  } else {
    base.addColorStop(0, '#ffffff');
    base.addColorStop(0.55, '#fdfdfe');
    base.addColorStop(1, '#eceef1');
  }
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // Две гряды: дальняя бледнее и выше, ближняя плотнее.
  mountainRange(ctx, -w * 0.05, h * 0.02, w * 1.1, h * 0.30, seed, { peaks: 5, alpha: dark ? 0.10 : 0.09, dark });
  mountainRange(ctx, -w * 0.10, h * 0.09, w * 1.2, h * 0.26, seed ^ 0x55, { peaks: 7, alpha: dark ? 0.07 : 0.06, dark });

  speedSlashes(ctx, w, h, accent, seed, dark);

  // Тёплое свечение за товаром.
  const glow = ctx.createRadialGradient(w * 0.64, h * 0.48, 0, w * 0.64, h * 0.48, w * 0.52);
  glow.addColorStop(0, hexToRgba(accent, dark ? 0.18 : 0.10));
  glow.addColorStop(1, hexToRgba(accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // «Полка» под товаром.
  const floor = ctx.createLinearGradient(0, h * 0.60, 0, h);
  if (dark) {
    floor.addColorStop(0, 'rgba(0,0,0,0)');
    floor.addColorStop(1, 'rgba(0,0,0,0.50)');
  } else {
    floor.addColorStop(0, 'rgba(233,236,240,0)');
    floor.addColorStop(0.6, 'rgba(231,234,238,0.70)');
    floor.addColorStop(1, 'rgba(219,224,230,0.90)');
  }
  ctx.fillStyle = floor;
  ctx.fillRect(0, h * 0.60, w, h * 0.40);
}

// ── Перекраска подложки под акцент ───────────────────────────────────────────
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const one = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [Math.round(one(h + 1 / 3) * 255), Math.round(one(h) * 255), Math.round(one(h - 1 / 3) * 255)];
}

export function hexToHsl(hex) {
  const m = String(hex).replace('#', '');
  const full = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  return rgbToHsl(parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16));
}

/**
 * Перекрашивает цветные мазки подложки под выбранный акцент.
 *
 * Меняем каждому подходящему пикселю тон, а насыщенность и светлоту оставляем
 * его собственные — поэтому от мазка остаётся вся фактура: брызги, растяжки,
 * полупрозрачные края. Простая заливка «все оранжевые пиксели в один цвет»
 * превратила бы их в плоские пятна.
 *
 * Берём только цветные пиксели в заданном диапазоне тонов: горы и текстура
 * бумаги почти серые, у них насыщенность ниже порога, и они не трогаются.
 */
export function recolorAccent(img, targetHex, { fromDeg = 5, toDeg = 50, minSat = 0.20 } = {}) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);

  const data = ctx.getImageData(0, 0, c.width, c.height);
  const px = data.data;
  const [th, ts] = hexToHsl(targetHex);
  const from = fromDeg / 360;
  const to = toDeg / 360;

  // Быстрая отсечка до перевода в HSL: у тёплого цветного пикселя красного
  // больше, чем зелёного, а синего меньше всех. Бумага и горы почти серые и
  // отсеиваются тремя сравнениями — иначе пришлось бы гонять полтора миллиона
  // переводов в HSL и перекраска ощутимо тормозила бы при выборе цвета.
  const warm = (i) => px[i + 3] >= 8 && px[i] > px[i + 1] && px[i] - px[i + 2] >= 6;

  // Средняя насыщенность мазков — точка отсчёта, чтобы приглушённый акцент
  // давал приглушённые полосы, а не такие же яркие, как исходные.
  // Считаем по каждому четвёртому пикселю: для среднего этого с запасом.
  let sum = 0, count = 0;
  for (let i = 0; i < px.length; i += 16) {
    if (!warm(i)) continue;
    const [h, s] = rgbToHsl(px[i], px[i + 1], px[i + 2]);
    if (s < minSat || h < from || h > to) continue;
    sum += s; count++;
  }
  if (!count) return c;                 // нечего красить — отдаём как есть
  const k = ts / (sum / count);

  for (let i = 0; i < px.length; i += 4) {
    if (!warm(i)) continue;
    const [h, s, l] = rgbToHsl(px[i], px[i + 1], px[i + 2]);
    if (s < minSat || h < from || h > to) continue;
    const [r, g, b] = hslToRgb(th, Math.min(1, s * k), l);
    px[i] = r; px[i + 1] = g; px[i + 2] = b;
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

// Приглушает слишком светлый цвет, чтобы им можно было писать по белому.
// Чистый жёлтый на белом не читается вообще, поэтому для текста берём затемнённый.
export function readableOnLight(hex) {
  const m = String(hex).replace('#', '');
  const full = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  let r = parseInt(full.slice(0, 2), 16);
  let g = parseInt(full.slice(2, 4), 16);
  let b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return hex;

  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (lum <= 0.62) return hex;
  const k = Math.max(0.42, 0.62 / lum);   // тянем к более тёмному, сохраняя оттенок
  r = Math.round(r * k); g = Math.round(g * k); b = Math.round(b * k);
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

// Фон карточки комплектации в светлой теме: белый верх, кремовый низ под блоки.
export function lightSplitBackground(ctx, w, h, accent, seed, splitY) {
  const top = ctx.createLinearGradient(0, 0, w, splitY);
  top.addColorStop(0, '#ffffff');
  top.addColorStop(0.6, '#fafbfc');
  top.addColorStop(1, '#f2f3f5');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, splitY);

  hexGrid(ctx, 0, 0, w, splitY, 40, '#9aa3b2', 0.11);
  lightStreaks(ctx, w * 0.30, 0, w * 0.70, splitY, accent, seed, 10, 0.55);

  const bottom = ctx.createLinearGradient(0, splitY, 0, h);
  bottom.addColorStop(0, '#fffdf5');
  bottom.addColorStop(1, '#f7f4ea');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, splitY, w, h - splitY);

  hexGrid(ctx, 0, splitY, w, h - splitY, 44, '#c9ab5a', 0.10);

  ctx.fillStyle = hexToRgba(accent, 0.95);
  ctx.fillRect(0, splitY - 2, w, 4);
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
