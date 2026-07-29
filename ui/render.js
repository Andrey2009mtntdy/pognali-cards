// Сборка карточек в тёмном стиле (по образцам KUGOO WISH 03).

import {
  CARD_W, CARD_H, CARD1, CARD2, SPEC_BOX, KIT_BOX,
  ORANGE, WHITE, DIM, PANEL, specRect, kitRects,
} from './layout.js';
import {
  font, fitText, fitTwoTone, panel, chamferPath, icon, drawContain, drawCoverPath,
  contactShadow, darkBackground, splitBackground, frameCorners, hexToRgba, seedFrom,
} from './draw.js';

// Значение характеристики: крупное число, единица мельче рядом.
function specValue(ctx, value, unit, rect) {
  const size = Math.min(rect.h, 38);
  ctx.font = font(900, size);
  const vw = ctx.measureText(value).width;
  ctx.font = font(700, size * 0.62);
  const uw = unit ? ctx.measureText(unit).width + size * 0.16 : 0;

  const scale = Math.min(1, rect.w / Math.max(1, vw + uw));
  const s = size * scale;

  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = WHITE;
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

function drawSpecs(ctx, data, accent) {
  (data.specs || []).slice(0, CARD1.specs.count).forEach((sp, i) => {
    const r = specRect(i);
    panel(ctx, r, {
      cut: CARD1.specs.skew, fill: PANEL, stroke: hexToRgba(accent, 0.35),
      lineWidth: 1.5, accent, accentWidth: 4,
      corners: { tl: false, tr: true, br: false, bl: true },
    });

    icon(ctx, sp.icon || 'power', r.x + SPEC_BOX.icon.x, r.y + SPEC_BOX.icon.y, SPEC_BOX.icon.size, accent, 2);

    const hasLabel = !!(sp.label && String(sp.label).trim());
    specValue(ctx, String(sp.value ?? ''), sp.unit || '', {
      x: r.x + SPEC_BOX.value.x,
      y: r.y + (hasLabel ? SPEC_BOX.value.y : (r.h - 38) / 2),
      w: r.w - SPEC_BOX.value.x - 14,
      h: SPEC_BOX.value.h,
    });

    if (hasLabel) {
      fitText(ctx, sp.label, {
        x: r.x + SPEC_BOX.label.x, y: r.y + SPEC_BOX.label.y,
        w: r.w - SPEC_BOX.label.x - 14, h: SPEC_BOX.label.h,
      }, { weight: 600, color: DIM, maxSize: 16, uppercase: true, tracking: 0.6 });
    }
  });
}

function drawLogo(ctx, logo, rect) {
  if (logo) { drawContain(ctx, logo, rect); return; }
  fitText(ctx, 'ПОГНАЛИ РФ', rect, {
    weight: 900, color: WHITE, align: 'center', valign: 'middle',
    italic: true, maxSize: rect.h * 0.62,
  });
}

// ── Карточка №1 — главная ────────────────────────────────────────────────────
export function renderCard1(canvas, data, assets = {}) {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  const accent = data.accent || ORANGE;
  const seed = seedFrom(`${data.brand}${data.model}${data.version}`);

  darkBackground(ctx, CARD_W, CARD_H, accent, seed);

  // Полупрозрачный номер модели на фоне — декоративный элемент образца.
  if (data.version) {
    ctx.save();
    ctx.globalAlpha = 0.14;
    fitText(ctx, data.version, CARD1.ghost, {
      weight: 900, color: accent, italic: true, align: 'center', valign: 'middle',
      maxSize: CARD1.ghost.h,
    });
    ctx.restore();
  }

  const box = drawContain(ctx, data.photos?.front, CARD1.photo);
  if (box) {
    contactShadow(ctx, box, 0.55);
    drawContain(ctx, data.photos.front, CARD1.photo);
  }

  fitText(ctx, data.brand || '', CARD1.brand, {
    weight: 800, color: WHITE, maxSize: 46, tracking: 3, uppercase: true, italic: true,
  });

  fitTwoTone(ctx, data.model || '', data.version || '', CARD1.model, {
    weight: 900, colorA: WHITE, colorB: accent, italic: true,
  });

  drawSpecs(ctx, data, accent);
  drawLogo(ctx, assets.logo, CARD1.logo);

  if (data.corners !== false) frameCorners(ctx, CARD_W, CARD_H, accent, 52, 18, 3);
  return canvas;
}

// ── Карточка №2 — комплектация ───────────────────────────────────────────────
function drawKitGrid(ctx, data, accent) {
  const rects = kitRects();
  const kit = data.kit || [];

  rects.forEach((r, i) => {
    const item = kit[i] || {};
    panel(ctx, r, {
      cut: CARD2.grid.skew, fill: PANEL, stroke: hexToRgba(accent, 0.28), lineWidth: 1.5,
      corners: { tl: true, tr: false, br: true, bl: false },
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
      drawCoverPath(ctx, img, ph, () => chamferPath(ctx, ph.x, ph.y, ph.w, ph.h, 10,
        { tl: true, tr: false, br: true, bl: false }));
    }

    // Крупный оранжевый номер.
    fitText(ctx, String(i + 1), {
      x: r.x + KIT_BOX.num.x, y: r.y + KIT_BOX.num.y, w: KIT_BOX.num.size, h: KIT_BOX.num.size,
    }, { weight: 900, color: accent, italic: true, maxSize: KIT_BOX.num.size, align: 'left' });

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
      weight: 800, color: WHITE, maxSize: 27, uppercase: true, wrap: true,
      valign: hasNote ? 'bottom' : 'middle', lineGap: 0.12,
    });

    if (hasNote) {
      fitText(ctx, item.note, {
        x: textX, y: textTop + textH * 0.58, w: textW, h: textH * 0.42,
      }, { weight: 500, color: DIM, maxSize: 19, wrap: true, lineGap: 0.14 });
    }
  });
}

export function renderCard2(canvas, data, assets = {}) {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  const accent = data.accent || ORANGE;
  const seed = seedFrom(`${data.brand}${data.model}${data.version}2`);

  const splitY = CARD2.grid.y - 18;
  splitBackground(ctx, CARD_W, CARD_H, accent, seed, splitY);

  const box = drawContain(ctx, data.photos?.rear, CARD2.photo);
  if (box) {
    contactShadow(ctx, box, 0.3);
    drawContain(ctx, data.photos.rear, CARD2.photo);
  }

  fitText(ctx, data.brand || '', CARD2.brand, {
    weight: 800, color: '#15181e', maxSize: 38, tracking: 2.5, uppercase: true, italic: true,
  });
  fitTwoTone(ctx, data.model || '', data.version || '', CARD2.model, {
    weight: 900, colorA: '#15181e', colorB: accent, italic: true,
  });

  // Вертикальный разделитель и заголовок справа.
  ctx.fillStyle = hexToRgba(accent, 0.9);
  ctx.fillRect(CARD2.divider.x, CARD2.divider.y, 3, CARD2.divider.h);

  fitText(ctx, 'КОМПЛЕКТАЦИЯ', {
    x: CARD2.title.x, y: CARD2.title.y, w: CARD2.title.w, h: CARD2.title.h * 0.48,
  }, { weight: 900, color: accent, italic: true, align: 'right', maxSize: 54, uppercase: true });

  fitText(ctx, 'И ОСОБЕННОСТИ', {
    x: CARD2.title.x, y: CARD2.title.y + CARD2.title.h * 0.52, w: CARD2.title.w, h: CARD2.title.h * 0.48,
  }, { weight: 900, color: '#15181e', italic: true, align: 'right', maxSize: 54, uppercase: true });

  drawKitGrid(ctx, data, accent);

  if (data.logoOnSecond) drawLogo(ctx, assets.logo, CARD2.logo);
  if (data.corners !== false) frameCorners(ctx, CARD_W, CARD_H, accent, 52, 18, 3);

  return canvas;
}

export function canvasToDataUrl(canvas) {
  return canvas.toDataURL('image/png');
}
