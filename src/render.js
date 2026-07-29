// Сборка карточек №1 и №2.
// Статичные части (логотип, нижняя панель, Telegram-блок) берутся картинками из
// шаблон/ассеты — они нарезаны из референса, поэтому совпадают с образцом.
// Если ассета нет, рисуется запасной вариант, чтобы программа не вставала.

import { createCanvas } from '@napi-rs/canvas';
import {
  CARD_W, CARD_H, CARD1, CARD2, SPEC_BOX, KIT_BOX, FIXED_BADGES,
  specRect, kitRect, BRAND_RED, INK, MUTED,
} from './layout.js';
import {
  registerFonts, font, fitText, grungeText, panel, roundRect, icon,
  drawContain, drawCover, contactShadow, drawBackground, seedFrom,
} from './draw.js';

// Значение характеристики: число крупно, единица мельче рядом.
function specValue(ctx, value, unit, rect, hasLabel) {
  const size = hasLabel ? 46 : 50;
  ctx.font = font(900, size);
  const vw = ctx.measureText(value).width;
  ctx.font = font(700, size * 0.56);
  const uw = unit ? ctx.measureText(unit).width + size * 0.14 : 0;

  const scale = Math.min(1, rect.w / Math.max(1, vw + uw));
  const s = size * scale;

  const y = hasLabel ? rect.y : rect.y + rect.h / 2 - s * 0.5;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK;
  ctx.font = font(900, s);
  const realVw = ctx.measureText(value).width;
  ctx.fillText(value, rect.x, y + s * 0.78);
  if (unit) {
    ctx.font = font(700, s * 0.56);
    ctx.fillText(unit, rect.x + realVw + s * 0.14, y + s * 0.78);
  }
  ctx.restore();
}

function drawSpecs(ctx, data, accent) {
  (data.specs || []).slice(0, CARD1.specs.count).forEach((sp, i) => {
    const r = specRect(i);
    panel(ctx, r, { radius: CARD1.specs.radius, stroke: accent, lineWidth: 3, shadow: true });
    icon(ctx, sp.icon || 'bolt', r.x + SPEC_BOX.icon.x, r.y + SPEC_BOX.icon.y, SPEC_BOX.icon.size, accent, 2);

    const hasLabel = !!(sp.label && String(sp.label).trim());
    specValue(
      ctx, String(sp.value ?? ''), sp.unit || '',
      { x: r.x + SPEC_BOX.value.x, y: r.y + SPEC_BOX.value.y, w: r.w - SPEC_BOX.value.x - 16, h: SPEC_BOX.value.h },
      hasLabel
    );
    if (hasLabel) {
      fitText(ctx, sp.label, {
        x: r.x + SPEC_BOX.label.x, y: r.y + SPEC_BOX.label.y,
        w: r.w - SPEC_BOX.label.x - 16, h: SPEC_BOX.label.h,
      }, { weight: 600, color: MUTED, maxSize: 19, uppercase: true, tracking: 0.4 });
    }
  });
}

function drawBottomPanel(ctx, assets) {
  const r = CARD1.bottom;
  if (assets.bottomPanel) {
    ctx.drawImage(assets.bottomPanel, r.x, r.y, r.w, r.h);
    return;
  }
  panel(ctx, r, { radius: r.radius, stroke: BRAND_RED, lineWidth: 3, shadow: true });
  const colW = r.w / 3;
  FIXED_BADGES.forEach((b, i) => {
    const cx = r.x + colW * i;
    if (i > 0) {
      ctx.beginPath();
      ctx.moveTo(cx, r.y + 22);
      ctx.lineTo(cx, r.y + r.h - 22);
      ctx.strokeStyle = 'rgba(0,0,0,0.10)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    icon(ctx, b.icon, cx + 34, r.y + r.h / 2 - 23, 46, BRAND_RED, 2);
    fitText(ctx, b.title, { x: cx + 96, y: r.y + 26, w: colW - 110, h: 26 }, { weight: 800, color: INK, maxSize: 24, tracking: 0.5 });
    fitText(ctx, b.value, { x: cx + 96, y: r.y + 58, w: colW - 110, h: 26 }, { weight: 600, color: INK, maxSize: 22, tracking: 0.3 });
  });
}

function drawLogo(ctx, assets, rect) {
  if (assets.logo) {
    drawContain(ctx, assets.logo, rect, { valign: 'middle' });
    return;
  }
  fitText(ctx, 'ПОГНАЛИ РФ', rect, {
    weight: 900, color: INK, align: 'center', valign: 'middle', maxSize: rect.h * 0.8,
  });
}

// ── Карточка №1 ──────────────────────────────────────────────────────────────
export function renderCard1(data, assets = {}) {
  registerFonts();
  const canvas = createCanvas(CARD_W, CARD_H);
  const ctx = canvas.getContext('2d');

  const accent = data.accent || BRAND_RED;
  const seed = seedFrom(`${data.brand}${data.model}${data.version}`);

  drawBackground(ctx, CARD_W, CARD_H, accent, seed, assets.mountains);

  const box = drawContain(ctx, data.photos?.front, CARD1.photo);
  if (box) {
    contactShadow(ctx, box);
    drawContain(ctx, data.photos.front, CARD1.photo);
  }

  drawLogo(ctx, assets, CARD1.logo);

  fitText(ctx, data.brand || '', CARD1.brand, { weight: 800, color: INK, maxSize: 62, tracking: 1.5, uppercase: true });

  const modelText = [data.model, data.version].filter(Boolean).join('\n');
  if (modelText) {
    grungeText(ctx, modelText, CARD1.model, { weight: 900, color: accent, maxSize: 210, minScale: 0.68, seed });
  }

  drawSpecs(ctx, data, accent);
  drawBottomPanel(ctx, assets);
  // Зернистость намеренно не накладываем: на мелком сером тексте она рвёт буквы

  return canvas;
}

// ── Карточка №2 ──────────────────────────────────────────────────────────────
function drawKitGrid(ctx, data, accent) {
  (data.kit || []).slice(0, 8).forEach((item, i) => {
    const r = kitRect(i);
    panel(ctx, r, { radius: CARD2.grid.radius, stroke: accent, lineWidth: 3, shadow: true });

    const ph = { x: r.x + KIT_BOX.photo.x, y: r.y + KIT_BOX.photo.y, w: KIT_BOX.photo.w, h: KIT_BOX.photo.h };
    const img = data.photos?.[`kit${i + 1}`];
    if (img) {
      drawCover(ctx, img, ph, 12);
    } else {
      roundRect(ctx, ph.x, ph.y, ph.w, ph.h, 12);
      ctx.fillStyle = '#f2f3f5';
      ctx.fill();
    }

    ctx.beginPath();
    ctx.moveTo(r.x + KIT_BOX.divider.x, r.y + KIT_BOX.divider.y);
    ctx.lineTo(r.x + KIT_BOX.divider.x, r.y + KIT_BOX.divider.y + KIT_BOX.divider.h);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Без пояснения название занимает весь блок по высоте и центрируется —
    // так «КУРЬЕРСКИЙ БАГАЖНИК» ложится в две строки, как в референсе.
    const hasNote = !!(item.note && String(item.note).trim());
    fitText(ctx, item.title || '', {
      x: r.x + KIT_BOX.title.x,
      y: r.y + KIT_BOX.title.y,
      w: KIT_BOX.title.w,
      h: hasNote ? KIT_BOX.title.h : r.h - KIT_BOX.title.y * 2,
    }, {
      weight: 700, color: INK, maxSize: 28, uppercase: true,
      valign: hasNote ? 'bottom' : 'middle', lineGap: 0.14, wrap: true,
    });

    if (hasNote) {
      fitText(ctx, item.note, {
        x: r.x + KIT_BOX.note.x, y: r.y + KIT_BOX.note.y, w: KIT_BOX.note.w, h: KIT_BOX.note.h,
      }, { weight: 500, color: MUTED, maxSize: 21, lineGap: 0.16, wrap: true });
    }
  });
}

function drawFooter(ctx, assets) {
  const f = CARD2.footer;
  drawLogo(ctx, assets, { x: f.x + 10, y: f.y, w: 400, h: f.h });

  ctx.beginPath();
  ctx.moveTo(f.x + 470, f.y + 12);
  ctx.lineTo(f.x + 470, f.y + f.h - 12);
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (assets.tgBlock) {
    drawContain(ctx, assets.tgBlock, { x: f.x + 500, y: f.y, w: f.w - 510, h: f.h }, { valign: 'middle' });
    return;
  }
  icon(ctx, 'bolt', f.x + 510, f.y + f.h / 2 - 26, 52, '#2AABEE', 2);
  fitText(ctx, 'ПОДРОБНЕЕ В ТГК', { x: f.x + 580, y: f.y + 18, w: 380, h: 26 }, { weight: 600, color: INK, maxSize: 23, tracking: 0.4 });
  fitText(ctx, 'Pognaliru', { x: f.x + 580, y: f.y + 50, w: 380, h: 38 }, { weight: 800, color: INK, maxSize: 34 });
}

export function renderCard2(data, assets = {}) {
  registerFonts();
  const canvas = createCanvas(CARD_W, CARD_H);
  const ctx = canvas.getContext('2d');

  const accent = data.accent || BRAND_RED;
  const seed = seedFrom(`${data.brand}${data.model}${data.version}2`);

  drawBackground(ctx, CARD_W, CARD_H, accent, seed, assets.mountains);

  const box = drawContain(ctx, data.photos?.rear, CARD2.photo);
  if (box) {
    contactShadow(ctx, box, 0.22);
    drawContain(ctx, data.photos.rear, CARD2.photo);
  }

  grungeText(ctx, 'КОМПЛЕКТАЦИЯ', CARD2.title, { weight: 900, color: INK, maxSize: 76, minScale: 0.8, seed: seed + 11 });
  fitText(ctx, data.brand || '', CARD2.brand, { weight: 800, color: INK, maxSize: 50, tracking: 1.2, uppercase: true });

  const modelText = [data.model, data.version].filter(Boolean).join('\n');
  if (modelText) {
    grungeText(ctx, modelText, CARD2.model, { weight: 900, color: accent, maxSize: 160, minScale: 0.68, seed });
  }

  drawKitGrid(ctx, data, accent);
  drawFooter(ctx, assets);
  // Зернистость намеренно не накладываем: на мелком сером тексте она рвёт буквы

  return canvas;
}
