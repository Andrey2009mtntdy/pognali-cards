// Примитивы рисования для тёмного шаблона. Обычный Canvas 2D в окне приложения —
// никаких нативных библиотек, поэтому .exe собирается без компиляции под Windows.

// ── Шрифты ───────────────────────────────────────────────────────────────────
const FAMILY = { 500: 'MontM', 600: 'MontSB', 700: 'MontB', 800: 'MontEB', 900: 'MontBk' };

export function font(weight, size, italic = false, family = null) {
  const w = FAMILY[weight] ? weight
    : weight >= 850 ? 900 : weight >= 750 ? 800 : weight >= 650 ? 700 : weight >= 550 ? 600 : 500;
  const fam = family || FAMILY[w];
  return `${italic ? 'italic ' : ''}${Math.max(1, Math.round(size))}px ${fam}, Arial, sans-serif`;
}

export async function fontsReady() {
  // document.fonts.ready ждёт только те начертания, что уже понадобились
  // разметке. Курсив в интерфейсе не используется — он нужен лишь холсту,
  // поэтому запрашиваем его явно, иначе первый рендер уйдёт с подменой.
  const need = [
    '100px MontM', '100px MontSB', '100px MontB', '100px MontEB', '100px MontBk',
    'italic 100px MontEB', 'italic 100px MontBk',
    '100px Narrow', 'italic 100px Narrow',
    '100px Teko', 'italic 100px Teko',
    '100px Square', 'italic 100px Square',
    '100px Euro', 'italic 100px Euro',
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
    lineGap = 0.08, uppercase = false, wrap = false, italic = false, bolder = 0, family = null,
    squeeze = 1,   // сжатие букв по ширине: уже буквы — крупнее влезающий кегль
  } = opts;

  const raw = String(uppercase ? String(text).toUpperCase() : text);
  if (!raw.trim()) return;
  const lineFactor = 1 + lineGap;

  const widthOf = (s, size) => {
    ctx.font = font(weight, size, italic, family);
    // Ширину считаем уже сжатой, иначе подбор кегля не увидит выигрыш от squeeze.
    return ctx.measureText(s).width * squeeze + tracking * Math.max(0, s.length - 1);
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
  ctx.font = font(weight, size, italic, family);
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';

  const lineH = size * lineFactor;
  const blockH = lineH * lines.length;
  let y = rect.y;
  if (valign === 'middle') y = rect.y + (rect.h - blockH) / 2;
  else if (valign === 'bottom') y = rect.y + rect.h - blockH;

  lines.forEach((line, i) => {
    const lw = (ctx.measureText(line).width * squeeze + tracking * Math.max(0, line.length - 1)) * scaleX;
    let x = rect.x;
    if (align === 'center') x = rect.x + (rect.w - lw) / 2;
    else if (align === 'right') x = rect.x + rect.w - lw;

    ctx.save();
    ctx.translate(x, y + lineH * i + size * 0.78);
    ctx.scale(scaleX * squeeze, 1);
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
  // Залитые символы Material Symbols (Apache 2.0). Контурные иконки на карточке
  // выглядели схематично; у этих внутри проработанные детали и сплошная заливка.
  // viewBox у них 0 -960 960 960 — отсюда поле vb, его учитывает icon().
  battery: { evenodd: true, paths: ["M9.6 2.6h4.8v2.2h2.1a1.6 1.6 0 0 1 1.6 1.6v13.4a1.6 1.6 0 0 1-1.6 1.6H7.5a1.6 1.6 0 0 1-1.6-1.6V6.4a1.6 1.6 0 0 1 1.6-1.6h2.1z", "M12.9 8.2 9.2 14h2.6l-.8 4.2 4-6.1h-2.7z"] },
  motor: { evenodd: true, paths: ["M5.6 6.9h9.8a1.6 1.6 0 0 1 1.6 1.6v8.2a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 16.7V8.5a1.6 1.6 0 0 1 1.6-1.6z", "M8.4 4.3h4.6a.7.7 0 0 1 .7.7v1.9H7.7V5a.7.7 0 0 1 .7-.7z", "M2.3 9.7h1.7v4.6H2.3a.6.6 0 0 1-.6-.6v-3.4a.6.6 0 0 1 .6-.6z", "M17 9.1h1.5a.7.7 0 0 1 .7.7v.5h.9a.7.7 0 0 1 .7.7v3.2a.7.7 0 0 1-.7.7h-.9v.5a.7.7 0 0 1-.7.7H17z", "M6.1 17.1h1.7v1.5H6.1z", "M13.2 17.1h1.7v1.5h-1.7z", "M4.6 18.4h4.7a.6.6 0 0 1 .6.6v.6a.6.6 0 0 1-.6.6H4.6a.6.6 0 0 1-.6-.6V19a.6.6 0 0 1 .6-.6z", "M11.7 18.4h4.7a.6.6 0 0 1 .6.6v.6a.6.6 0 0 1-.6.6h-4.7a.6.6 0 0 1-.6-.6V19a.6.6 0 0 1 .6-.6z", "M6.3 8.5h8.4a.6.6 0 0 1 .6.6v6a.6.6 0 0 1-.6.6H6.3a.6.6 0 0 1-.6-.6v-6a.6.6 0 0 1 .6-.6z", "M7 9.3h7a.55.55 0 0 1 0 1.1H7a.55.55 0 0 1 0-1.1z", "M7 10.9h7a.55.55 0 0 1 0 1.1H7a.55.55 0 0 1 0-1.1z", "M7 12.5h7a.55.55 0 0 1 0 1.1H7a.55.55 0 0 1 0-1.1z", "M7 14.1h7a.55.55 0 0 1 0 1.1H7a.55.55 0 0 1 0-1.1z", "M19.9 12.4a.55.55 0 1 1 0-1.1.55.55 0 0 1 0 1.1z"] },
  gauge: { evenodd: true, paths: ["M1.8 15.8a10.2 10.2 0 0 1 20.4 0h-2.7a7.5 7.5 0 0 0-15 0z", "M6.57 14.34L5.26 13.86L5.59 12.95L6.90 13.43z", "M8.78 11.19L8.08 9.98L8.92 9.50L9.62 10.71z", "M11.52 10.20L11.52 8.80L12.48 8.80L12.48 10.20z", "M14.38 10.71L15.08 9.50L15.92 9.98L15.22 11.19z", "M17.10 13.43L18.41 12.95L18.74 13.86L17.43 14.34z", "M11.2 16.6 18.4 9.6 12.9 17.4z", "M12 13.2a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2z", "M12 14.65a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3z"] },
  weight: {lw:2,paths:["M9.2 7.6V6.2a2.8 2.8 0 0 1 5.6 0v1.4","M7.1 7.6h9.8a1.8 1.8 0 0 1 1.76 1.42l1.9 8.8A1.8 1.8 0 0 1 18.8 20H5.2a1.8 1.8 0 0 1-1.76-2.18l1.9-8.8A1.8 1.8 0 0 1 7.1 7.6z",{d:"M6.9 11.2h1.75v2.6l2.2-2.6h2.15l-2.65 3 2.8 3.6h-2.2l-1.8-2.55-.5.55v2H6.9z",fill:true},{d:"M17.6 13.4h-1.7a1.55 1.55 0 0 0-1.45-.85c-1.02 0-1.7.85-1.7 2.05s.7 2.15 1.8 2.15c.8 0 1.35-.4 1.52-1.05h-1.52v-1.4h3.15v1.25c-.3 1.7-1.52 2.75-3.2 2.75-2.1 0-3.5-1.45-3.5-3.65s1.4-3.6 3.42-3.6c1.62 0 2.8.85 3.13 2.35z",fill:true}]},
  shield: { vb: 960, paths: ["m438-452-56-56q-12-12-28-12t-28 12q-12 12-12 28.5t12 28.5l84 85q12 12 28 12t28-12l170-170q12-12 12-28.5T636-593q-12-12-28.5-12T579-593L438-452Zm42 368q-7 0-13-1t-12-3q-135-45-215-166.5T160-516v-189q0-25 14.5-45t37.5-29l240-90q14-5 28-5t28 5l240 90q23 9 37.5 29t14.5 45v189q0 140-80 261.5T505-88q-6 2-12 3t-13 1Z"] },
  tire: { evenodd: true, paths: ["M12 0.8000000000000007a11.2 11.2 0 1 1 0 22.4a11.2 11.2 0 1 1 0 -22.4z", "M12 2.5999999999999996a9.4 9.4 0 1 0 0 18.8a9.4 9.4 0 1 0 0 -18.8z", "M12 3.8000000000000007a8.2 8.2 0 1 1 0 16.4a8.2 8.2 0 1 1 0 -16.4z", "M4.20 11.05L19.80 11.05L19.80 12.95L4.20 12.95z", "M8.92 4.77L16.72 18.28L15.08 19.23L7.28 5.72z", "M16.72 5.72L8.92 19.23L7.28 18.28L15.08 4.77z", "M12 9.6a2.4 2.4 0 1 0 0 4.8a2.4 2.4 0 1 0 0 -4.8z"] },
  drops: [{"d":"M9 2.6c3.3 5 5 7 5 9.5a5 5 0 0 1-10 0c0-2.5 1.7-4.5 5-9.5z","fill":true}, {"d":"M18 11.2c2 3 3 4 3 5.4a3 3 0 0 1-6 0c0-1.4 1-2.4 3-5.4z","fill":true}],
};

export const ICON_NAMES = Object.keys(ICONS);

// Путь — либо строка (рисуется обводкой), либо { d, fill: true } для залитых
// деталей: молния внутри аккумулятора, стрелка спидометра, протектор шины.
// Одной обводкой такие вещи выглядят пустыми и «схематичными».

// Иконки-картинки из папки «иконки». Ключ — имя файла без расширения,
// приведённое к нижнему регистру: «мощность.png» → «мощность».
let iconImages = {};
export function setIconImages(map) { iconImages = map || {}; trimmed = new Map(); }

// У присланных картинок вокруг рисунка остаётся прозрачное поле, и значок
// выходит мельче плашки. Срезаем пустоту по краям — тогда в тот же квадрат
// встаёт сам рисунок, крупнее и без воздуха. Результат кэшируем.
let trimmed = new Map();

function trimTransparent(img) {
  if (trimmed.has(img)) return trimmed.get(img);

  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const cx = c.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, 0, 0);

  let out = img;
  try {
    const { data } = cx.getImageData(0, 0, c.width, c.height);
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        if (data[(y * c.width + x) * 4 + 3] > 8) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 > x0 && y1 > y0 && (x1 - x0 < c.width - 2 || y1 - y0 < c.height - 2)) {
      const w = x1 - x0 + 1, h = y1 - y0 + 1;
      const t = document.createElement('canvas');
      t.width = w; t.height = h;
      t.getContext('2d').drawImage(img, x0, y0, w, h, 0, 0, w, h);
      out = t;
    }
  } catch { /* картинка из другого источника — оставляем как есть */ }

  trimmed.set(img, out);
  return out;
}

// Какое имя файла отвечает за какой значок. Русские названия — чтобы человек
// понимал, как назвать файл, английские — на случай латинских имён.
const ICON_FILE = {
  motor:   ['мощност', 'мотор', 'двигател', 'power', 'motor', 'engine'],
  gauge:   ['скорост', 'спидометр', 'speed', 'gauge', 'tacho'],
  weight:  ['нагрузк', 'грузопод', 'вес', 'weight', 'kg', 'load'],
  battery: ['батаре', 'аккумулятор', 'акб', 'battery'],
  shield:  ['гаранти', 'щит', 'shield', 'guarantee'],
  tire:    ['маркировк', 'колес', 'шина', 'tire', 'wheel'],
  drops:   ['влагозащит', 'капл', 'drops', 'water', 'ip'],
};

// Перекраска значка в нужный цвет. Белые значки (на плитке батареи) оставляем
// белыми — их цвет и так задан правильно. Кэш по паре «картинка + цвет».
const tinted = new Map();

function tintIcon(pic, color) {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return pic;
  const [, s, l] = hexToHsl(color);
  if (s < 0.15 || l > 0.9) return pic;   // белый/серый — перекрашивать нечего

  let byColor = tinted.get(pic);
  if (!byColor) { byColor = new Map(); tinted.set(pic, byColor); }
  if (byColor.has(color)) return byColor.get(color);

  // Диапазон шире оранжевого: значки бывают и красноватыми, и жёлтыми.
  const out = recolorAccent(pic, color, { fromDeg: -20, toDeg: 60, minSat: 0.15 });
  byColor.set(color, out);
  return out;
}

function pictureFor(name) {
  const words = ICON_FILE[name] || [];
  for (const file of Object.keys(iconImages)) {
    if (words.some(w => file.includes(w))) return iconImages[file];
  }
  return iconImages[name] || null;
}

export function icon(ctx, name, x, y, size, color, lineWidth = 2) {
  const raw0 = pictureFor(name);
  if (raw0) {
    // Форму картинки не трогаем, а цвет ведём за акцентом карточки: значки
    // нарисованы оранжевыми, и на синей карточке они бы торчали чужаками.
    const pic = tintIcon(trimTransparent(raw0), color);
    const k = Math.min(size / pic.width, size / pic.height);
    const w = pic.width * k, h = pic.height * k;
    ctx.drawImage(pic, x + (size - w) / 2, y + (size - h) / 2, w, h);
    return;
  }

  const raw = ICONS[name] || ICONS.motor;
  // У детализированных иконок своя толщина: общая 2.2 склеивает рёбра мотора
  // и буквы «KG» на гире в сплошное пятно.
  const def = Array.isArray(raw) ? raw : (raw.paths || raw);
  const lw = Array.isArray(raw) ? lineWidth : (raw.lw || lineWidth);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (raw && raw.evenodd) {
    ctx.scale(size / 24, size / 24);
    const p = new Path2D();
    for (const d of raw.paths) p.addPath(new Path2D(d));
    ctx.fill(p, 'evenodd');
    ctx.restore();
    return;
  }

  if (raw && raw.vb) {
    // Material Symbols нарисованы в системе 0 -960 960 960: начало координат
    // внизу слева, поэтому перед масштабом опускаем холст на высоту символа.
    const k = size / raw.vb;
    ctx.scale(k, k);
    ctx.translate(0, raw.vb);
    for (const d of raw.paths) ctx.fill(new Path2D(d));
  } else {
    ctx.scale(size / 24, size / 24);
    for (const p of def) {
      if (typeof p === 'string') { ctx.stroke(new Path2D(p)); continue; }
      const path = new Path2D(p.d);
      if (p.fill) ctx.fill(path); else ctx.stroke(path);
    }
  }
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
  // Диапазон может переходить через ноль: красный лежит на стыке круга
  // (356° и 4° — соседние цвета, но по числам далеки). Отрицательное начало
  // означает два куска: от 0.95 до 1 и от 0 до 0.139.
  const wraps = from < 0;
  const fromW = wraps ? from + 1 : from;
  const outOfRange = (h) => (wraps ? (h < fromW && h > to) : (h < from || h > to));

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
    if (s < minSat || outOfRange(h)) continue;
    sum += s; count++;
  }
  if (!count) return c;                 // нечего красить — отдаём как есть
  const k = ts / (sum / count);

  for (let i = 0; i < px.length; i += 4) {
    if (!warm(i)) continue;
    const [h, s, l] = rgbToHsl(px[i], px[i + 1], px[i + 2]);
    if (s < minSat || outOfRange(h)) continue;
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
