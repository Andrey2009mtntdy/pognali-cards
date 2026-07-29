// Сборка карточек. Основная тема — светлая, под стиль сайта «Погнали РФ»:
// белый фон, чёрная типографика, жёлтые акценты. Тёмный вариант сохранён
// и включается галочкой.

import {
  CARD_W, CARD_H, CARD1, CARD2, SPEC_BOX, KIT_BOX,
  YELLOW, INK, DIM, WHITE, CREAM, specRect, kitRects,
} from './layout.js';
import {
  font, fitText, fitTwoTone, panel, chamferPath, icon, drawContain, drawCoverPath,
  contactShadow, darkBackground, splitBackground, lightBackground, lightSplitBackground,
  frameCorners, hexToRgba, seedFrom, readableOnLight,
} from './draw.js';

// Набор цветов под выбранную тему. Жёлтый как текст на белом нечитаем,
// поэтому для надписей используется затемнённый вариант того же оттенка.
function palette(data) {
  const dark = data.theme === 'dark';
  const accent = data.accent || YELLOW;
  return {
    dark,
    accent,
    accentText: dark ? accent : readableOnLight(accent),
    text: dark ? WHITE : INK,
    textOnPhoto: dark ? WHITE : INK,
    dim: dark ? '#98a2b3' : DIM,
    panelFill: dark ? 'rgba(16,18,24,0.86)' : 'rgba(255,255,255,0.96)',
    panelStroke: dark ? hexToRgba(accent, 0.35) : hexToRgba(accent, 0.85),
    kitFill: dark ? 'rgba(16,18,24,0.86)' : 'rgba(255,255,255,0.97)',
    kitStroke: dark ? hexToRgba(accent, 0.28) : hexToRgba(accent, 0.8),
    ghost: dark ? 0.14 : 0.20,
  };
}

// Значение характеристики: крупное число, единица мельче рядом.
function specValue(ctx, value, unit, rect, P) {
  const size = Math.min(rect.h, 38);
  ctx.font = font(900, size);
  const vw = ctx.measureText(value).width;
  ctx.font = font(700, size * 0.62);
  const uw = unit ? ctx.measureText(unit).width + size * 0.16 : 0;

  const scale = Math.min(1, rect.w / Math.max(1, vw + uw));
  const s = size * scale;

  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = P.text;
  ctx.font = font(900, s);
  const realVw = ctx.measureText(value).width;
  const baseline = rect.y + s * 0.8;
  ctx.fillText(value, rect.x, baseline);
  if (unit) {
    ctx.font = font(700, s * 0.62);
    ctx.fillText(unit, rect.x + realVw + s * 0.16, baseline);
  }
  ctx.restore();
}

function drawSpecs(ctx, data, P) {
  (data.specs || []).slice(0, CARD1.specs.count).forEach((sp, i) => {
    const r = specRect(i);

    if (!P.dark) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.10)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 4;
      chamferPath(ctx, r.x, r.y, r.w, r.h, CARD1.specs.skew, { tl: false, tr: true, br: false, bl: true });
      ctx.fillStyle = P.panelFill;
      ctx.fill();
      ctx.restore();
    }

    panel(ctx, r, {
      cut: CARD1.specs.skew, fill: P.panelFill, stroke: P.panelStroke,
      lineWidth: P.dark ? 1.5 : 2, accent: P.accent, accentWidth: 5,
      corners: { tl: false, tr: true, br: false, bl: true },
    });

    icon(ctx, sp.icon || 'power', r.x + SPEC_BOX.icon.x, r.y + SPEC_BOX.icon.y,
      SPEC_BOX.icon.size, P.accentText, 2.2);

    const hasLabel = !!(sp.label && String(sp.label).trim());
    specValue(ctx, String(sp.value ?? ''), sp.unit || '', {
      x: r.x + SPEC_BOX.value.x,
      y: r.y + (hasLabel ? SPEC_BOX.value.y : (r.h - 38) / 2),
      w: r.w - SPEC_BOX.value.x - 14,
      h: SPEC_BOX.value.h,
    }, P);

    if (hasLabel) {
      fitText(ctx, sp.label, {
        x: r.x + SPEC_BOX.label.x, y: r.y + SPEC_BOX.label.y,
        w: r.w - SPEC_BOX.label.x - 14, h: SPEC_BOX.label.h,
      }, { weight: 600, color: P.dim, maxSize: 16, uppercase: true, tracking: 0.6 });
    }
  });
}

function drawLogo(ctx, logo, rect, P) {
  if (logo) { drawContain(ctx, logo, rect); return; }
  fitText(ctx, 'ПОГНАЛИ РФ', rect, {
    weight: 900, color: P.text, align: 'center', valign: 'middle',
    italic: true, maxSize: rect.h * 0.62,
  });
}

// ── Карточка №1 — главная ────────────────────────────────────────────────────
export function renderCard1(canvas, data, assets = {}) {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  const P = palette(data);
  const seed = seedFrom(`${data.brand}${data.model}${data.version}`);

  if (P.dark) darkBackground(ctx, CARD_W, CARD_H, P.accent, seed);
  else lightBackground(ctx, CARD_W, CARD_H, P.accent, seed);

  // Полупрозрачный номер модели на фоне — декоративный элемент шаблона.
  if (data.version) {
    ctx.save();
    ctx.globalAlpha = P.ghost;
    fitText(ctx, data.version, CARD1.ghost, {
      weight: 900, color: P.accent, italic: true, align: 'center', valign: 'middle',
      maxSize: CARD1.ghost.h,
    });
    ctx.restore();
  }

  const frontT = data.transforms?.front;
  const box = drawContain(ctx, data.photos?.front, CARD1.photo, { transform: frontT });
  if (box) {
    contactShadow(ctx, box, P.dark ? 0.55 : 0.34);
    drawContain(ctx, data.photos.front, CARD1.photo, { transform: frontT });
  }

  fitText(ctx, data.brand || '', CARD1.brand, {
    weight: 800, color: P.text, maxSize: 46, tracking: 3, uppercase: true, italic: true,
  });

  fitTwoTone(ctx, data.model || '', data.version || '', CARD1.model, {
    weight: 900, colorA: P.text, colorB: P.accentText, italic: true,
  });

  drawSpecs(ctx, data, P);
  drawLogo(ctx, assets.logo, CARD1.logo, P);

  if (data.corners !== false) frameCorners(ctx, CARD_W, CARD_H, P.accentText, 52, 18, 3);
  return canvas;
}

// ── Карточка №2 — комплектация ───────────────────────────────────────────────
function drawKitGrid(ctx, data, P) {
  const rects = kitRects();
  const kit = data.kit || [];

  rects.forEach((r, i) => {
    const item = kit[i] || {};
    const corners = { tl: true, tr: false, br: true, bl: false };

    if (!P.dark) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.10)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 3;
      chamferPath(ctx, r.x, r.y, r.w, r.h, CARD2.grid.skew, corners);
      ctx.fillStyle = P.kitFill;
      ctx.fill();
      ctx.restore();
    }

    panel(ctx, r, {
      cut: CARD2.grid.skew, fill: P.kitFill, stroke: P.kitStroke,
      lineWidth: P.dark ? 1.5 : 2, corners,
    });

    // Фото детали — правая часть блока, обрезано по форме плашки.
    const photoW = r.w * KIT_BOX.photoFrac;
    const ph = {
      x: r.x + r.w - photoW - KIT_BOX.photoPad,
      y: r.y + KIT_BOX.photoPad,
      w: photoW,
      h: r.h - KIT_BOX.photoPad * 2,
    };
    const img = data.photos?.[`kit${i + 1}`];
    if (img) {
      drawCoverPath(ctx, img, ph, () => chamferPath(ctx, ph.x, ph.y, ph.w, ph.h, 10, corners),
        data.transforms?.[`kit${i + 1}`]);
    }

    // Крупный акцентный номер.
    fitText(ctx, String(i + 1), {
      x: r.x + KIT_BOX.num.x, y: r.y + KIT_BOX.num.y, w: KIT_BOX.num.size, h: KIT_BOX.num.size,
    }, { weight: 900, color: P.accentText, italic: true, maxSize: KIT_BOX.num.size });

    // Текст занимает всю левую часть блока под номером — иначе длинные названия
    // вроде «ГИДРАВЛИЧЕСКИЕ ТОРМОЗА» ужимаются до нечитаемого размера.
    const textX = r.x + KIT_BOX.textX;
    const textW = r.w - photoW - KIT_BOX.textX - 18;
    const textTop = r.y + KIT_BOX.textTop;
    const textH = r.h - KIT_BOX.textTop - KIT_BOX.textBottom;
    const hasNote = !!(item.note && String(item.note).trim());

    fitText(ctx, item.title || '', {
      x: textX, y: textTop, w: textW, h: hasNote ? textH * 0.54 : textH,
    }, {
      weight: 800, color: P.text, maxSize: 27, uppercase: true, wrap: true,
      valign: hasNote ? 'bottom' : 'middle', lineGap: 0.12,
    });

    if (hasNote) {
      fitText(ctx, item.note, {
        x: textX, y: textTop + textH * 0.58, w: textW, h: textH * 0.42,
      }, { weight: 500, color: P.dim, maxSize: 19, wrap: true, lineGap: 0.14 });
    }
  });
}

export function renderCard2(canvas, data, assets = {}) {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  const P = palette(data);
  const seed = seedFrom(`${data.brand}${data.model}${data.version}2`);

  const splitY = CARD2.grid.y - 18;
  if (P.dark) splitBackground(ctx, CARD_W, CARD_H, P.accent, seed, splitY);
  else lightSplitBackground(ctx, CARD_W, CARD_H, P.accent, seed, splitY);

  const rearT = data.transforms?.rear;
  const box = drawContain(ctx, data.photos?.rear, CARD2.photo, { transform: rearT });
  if (box) {
    contactShadow(ctx, box, P.dark ? 0.3 : 0.26);
    drawContain(ctx, data.photos.rear, CARD2.photo, { transform: rearT });
  }

  // Верхние надписи всегда по светлому фону — держим их тёмными.
  fitText(ctx, data.brand || '', CARD2.brand, {
    weight: 800, color: INK, maxSize: 38, tracking: 2.5, uppercase: true, italic: true,
  });
  fitTwoTone(ctx, data.model || '', data.version || '', CARD2.model, {
    weight: 900, colorA: INK, colorB: P.accentText, italic: true,
  });

  ctx.fillStyle = hexToRgba(P.accentText, 0.95);
  ctx.fillRect(CARD2.divider.x, CARD2.divider.y, 3, CARD2.divider.h);

  fitText(ctx, 'КОМПЛЕКТАЦИЯ', {
    x: CARD2.title.x, y: CARD2.title.y, w: CARD2.title.w, h: CARD2.title.h * 0.48,
  }, { weight: 900, color: P.accentText, italic: true, align: 'right', maxSize: 54, uppercase: true });

  fitText(ctx, 'И ОСОБЕННОСТИ', {
    x: CARD2.title.x, y: CARD2.title.y + CARD2.title.h * 0.52, w: CARD2.title.w, h: CARD2.title.h * 0.48,
  }, { weight: 900, color: INK, italic: true, align: 'right', maxSize: 54, uppercase: true });

  drawKitGrid(ctx, data, P);

  if (data.logoOnSecond) drawLogo(ctx, assets.logo, CARD2.logo, P);
  if (data.corners !== false) frameCorners(ctx, CARD_W, CARD_H, P.accentText, 52, 18, 3);

  return canvas;
}

export function canvasToDataUrl(canvas) {
  return canvas.toDataURL('image/png');
}
