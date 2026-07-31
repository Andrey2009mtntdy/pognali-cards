// Сборка карточек. Основная тема — светлая, под стиль сайта «Погнали РФ»:
// белый фон, чёрная типографика, жёлтые акценты. Тёмный вариант сохранён
// и включается галочкой.

import {
  CARD_W, CARD_H, CARD1, CARD2, SPEC_BOX, BATTERY_BOX, FOOTER_BOX, KIT_BOX,
  ORANGE, INK, DIM, WHITE, CREAM, specRect, footerRect, kitRects,
} from './layout.js';
import {
  font, fitText, fitTwoTone, panel, softPanel, iconTile, chamferPath, icon,
  drawContain, drawCoverPath, contactShadow, catalogBackground, drawBackgroundImage,
  splitBackground, lightSplitBackground,
  frameCorners, hexToRgba, seedFrom, readableOnLight,
} from './draw.js';

// Набор цветов под выбранную тему. Слишком светлый акцент как текст на белом
// нечитаем, поэтому для надписей берётся затемнённый вариант того же оттенка.
function palette(data) {
  const dark = data.theme === 'dark';
  const accent = data.accent || ORANGE;
  return {
    dark,
    accent,
    accentText: dark ? accent : readableOnLight(accent),
    text: dark ? WHITE : INK,
    textOnPhoto: dark ? WHITE : INK,
    dim: dark ? '#98a2b3' : DIM,

    // Плашки каталожной карточки — белый лист с мягкой тенью.
    cardFill: dark ? 'rgba(255,255,255,0.07)' : '#ffffff',
    cardStroke: dark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.06)',
    cardShadow: dark ? 'rgba(0,0,0,0.45)' : 'rgba(15,23,42,0.13)',
    divider: dark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.09)',
    // Нижняя лента обведена акцентом — она замыкает карточку и должна читаться
    // как отдельный блок, а не как белое пятно на светлом фоне.
    footerStroke: dark ? hexToRgba(accent, 0.55) : hexToRgba(accent, 0.9),

    // Плашки карточки комплектации — прежняя фирменная форма со срезами.
    panelFill: dark ? 'rgba(16,18,24,0.86)' : 'rgba(255,255,255,0.96)',
    panelStroke: dark ? hexToRgba(accent, 0.35) : hexToRgba(accent, 0.85),
    kitFill: dark ? 'rgba(16,18,24,0.86)' : 'rgba(255,255,255,0.97)',
    kitStroke: dark ? hexToRgba(accent, 0.28) : hexToRgba(accent, 0.8),
    ghost: dark ? 0.14 : 0.20,
  };
}

// Какой кегль нужен, чтобы пара «число + единица» уместилась в заданную ширину.
function specValueSize(ctx, value, unit, maxW, maxSize) {
  ctx.font = font(900, maxSize);
  const vw = ctx.measureText(value).width;
  ctx.font = font(700, maxSize * 0.58);
  const uw = unit ? ctx.measureText(unit).width + maxSize * 0.18 : 0;
  return maxSize * Math.min(1, maxW / Math.max(1, vw + uw));
}

// Значение характеристики: крупное число, единица мельче рядом.
function specValue(ctx, value, unit, rect, color, size) {
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.font = font(900, size);
  const vw = ctx.measureText(value).width;
  const baseline = rect.y + size * 0.8;
  ctx.fillText(value, rect.x, baseline);
  if (unit) {
    ctx.font = font(700, size * 0.58);
    ctx.fillText(unit, rect.x + vw + size * 0.18, baseline);
  }
  ctx.restore();
}

// Три плашки характеристик: иконка акцентом, крупное число, подпись под ним.
function drawSpecs(ctx, data, P) {
  const specs = (data.specs || []).slice(0, CARD1.specs.count);
  const valueW = CARD1.specs.w - SPEC_BOX.value.x - 14;

  // Кегль числа общий для всех трёх плашек — по самому длинному значению.
  // Иначе короткое «70» набирается крупнее, чем «2500», и колонка выглядит
  // собранной наспех.
  const size = Math.min(...specs.map(sp =>
    specValueSize(ctx, String(sp.value ?? ''), sp.unit || '', valueW, 44)), 44);

  specs.forEach((sp, i) => {
    const r = specRect(i);

    softPanel(ctx, r, {
      radius: CARD1.specs.radius, fill: P.cardFill,
      shadow: P.cardShadow, stroke: P.cardStroke,
    });

    icon(ctx, sp.icon || 'motor', r.x + SPEC_BOX.icon.x, r.y + SPEC_BOX.icon.y,
      SPEC_BOX.icon.size, P.accentText, 2.1);

    const hasLabel = !!(sp.label && String(sp.label).trim());
    specValue(ctx, String(sp.value ?? ''), sp.unit || '', {
      x: r.x + SPEC_BOX.value.x,
      y: r.y + (hasLabel ? SPEC_BOX.value.y : (r.h - SPEC_BOX.value.h) / 2),
    }, P.text, size);

    if (hasLabel) {
      fitText(ctx, sp.label, {
        x: r.x + SPEC_BOX.label.x, y: r.y + SPEC_BOX.label.y,
        w: r.w - SPEC_BOX.label.x - 14, h: SPEC_BOX.label.h,
      }, { weight: 600, color: P.dim, maxSize: 17, uppercase: true, tracking: 0.7 });
    }
  });
}

// Блок батареи: акцентная плитка с иконкой, тип и ёмкость двумя строками.
function drawBattery(ctx, data, P) {
  const b = data.battery || {};
  if (!String(b.type || '').trim() && !String(b.value || '').trim()) return;

  const r = CARD1.battery;
  const t = BATTERY_BOX.tile;
  iconTile(ctx, { x: r.x + t.x, y: r.y + t.y, w: t.size, h: t.size }, 'battery', {
    radius: t.radius, fill: P.accent, iconColor: WHITE,
    inset: BATTERY_BOX.icon.inset, lineWidth: 2.6,
  });

  fitText(ctx, b.type || '', {
    x: r.x + BATTERY_BOX.type.x, y: r.y + BATTERY_BOX.type.y,
    w: r.w - BATTERY_BOX.type.x, h: BATTERY_BOX.type.h,
  }, { weight: 900, color: P.text, maxSize: 54, uppercase: true });

  fitText(ctx, b.value || '', {
    x: r.x + BATTERY_BOX.value.x, y: r.y + BATTERY_BOX.value.y,
    w: r.w - BATTERY_BOX.value.x, h: BATTERY_BOX.value.h,
  }, { weight: 800, color: P.accentText, maxSize: 42 });
}

// Нижняя лента: одна плашка на всю ширину, внутри три колонки с разделителями.
function drawFooter(ctx, data, P) {
  const items = (data.footer || []).filter(it => it && String(it.value || '').trim());
  if (!items.length) return;

  const f = CARD1.footer;
  softPanel(ctx, f, {
    radius: f.radius, fill: P.cardFill, shadow: P.cardShadow,
    stroke: P.footerStroke, lineWidth: 2.5,
  });

  const count = Math.min(items.length, 3);
  items.slice(0, count).forEach((it, i) => {
    const r = footerRect(i, count);

    if (i) {
      ctx.fillStyle = P.divider;
      ctx.fillRect(r.x, r.y + 22, 1.5, r.h - 44);
    }

    icon(ctx, it.icon || 'shield', r.x + FOOTER_BOX.icon.x,
      r.y + (r.h - FOOTER_BOX.icon.size) / 2, FOOTER_BOX.icon.size, P.accentText, 2);

    const textW = r.w - FOOTER_BOX.label.x - 14;
    fitText(ctx, it.label || '', {
      x: r.x + FOOTER_BOX.label.x, y: r.y + FOOTER_BOX.label.y, w: textW, h: FOOTER_BOX.label.h,
    }, { weight: 800, color: P.accentText, maxSize: 19, uppercase: true, tracking: 0.5 });

    fitText(ctx, it.value || '', {
      x: r.x + FOOTER_BOX.value.x, y: r.y + FOOTER_BOX.value.y, w: textW, h: FOOTER_BOX.value.h,
    }, { weight: 800, color: P.text, maxSize: 24, uppercase: true });
  });
}

// Логотип существует в двух вариантах: основной — чёрные буквы под светлый фон,
// и светлый — под тёмную тему. Взять не тот значит потерять логотип: чёрный на
// тёмном и белый на белом одинаково не видны.
function drawLogo(ctx, assets, rect, P) {
  const logo = P.dark ? (assets.logoDark || assets.logo) : (assets.logo || assets.logoDark);
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

  // Фирменная подложка из файла. Тёмная тема на неё не рассчитана — там
  // остаётся рисованный фон, иначе белые горы вылезут под тёмную типографику.
  if (assets.background && !P.dark) drawBackgroundImage(ctx, assets.background, CARD_W, CARD_H);
  else catalogBackground(ctx, CARD_W, CARD_H, P.accent, seed, P.dark);

  // Товар рисуем до текста: левая колонка ложится поверх кадра, поэтому
  // широкий байк не перекрывает название, даже если заезжает под него.
  const frontT = data.transforms?.front;
  const box = drawContain(ctx, data.photos?.front, CARD1.photo, { transform: frontT });
  if (box) {
    contactShadow(ctx, box, P.dark ? 0.5 : 0.30);
    drawContain(ctx, data.photos.front, CARD1.photo, { transform: frontT });
  }

  drawLogo(ctx, assets, CARD1.logo, P);

  fitText(ctx, data.brand || '', CARD1.brand, {
    weight: 800, color: P.text, maxSize: 56, tracking: 2, uppercase: true,
  });

  // Модель и версия — одной акцентной надписью, переносится по словам сама.
  const title = [data.model, data.version].filter(Boolean).join(' ');
  fitText(ctx, title, CARD1.model, {
    weight: 900, color: P.accentText, maxSize: 118, uppercase: true, wrap: true, lineGap: 0.02,
  });

  drawBattery(ctx, data, P);
  drawSpecs(ctx, data, P);
  drawFooter(ctx, data, P);

  if (data.corners) frameCorners(ctx, CARD_W, CARD_H, P.accentText, 52, 18, 3);
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
  if (assets.background && !P.dark) {
    drawBackgroundImage(ctx, assets.background, CARD_W, CARD_H);
    // Под сеткой блоков фон приглушаем молочной вуалью: иначе горы спорят
    // с восемью белыми плашками и текст в них теряет контраст.
    const veil = ctx.createLinearGradient(0, splitY - 60, 0, CARD_H);
    veil.addColorStop(0, 'rgba(255,255,255,0)');
    veil.addColorStop(0.12, 'rgba(255,255,255,0.72)');
    veil.addColorStop(1, 'rgba(255,255,255,0.88)');
    ctx.fillStyle = veil;
    ctx.fillRect(0, splitY - 60, CARD_W, CARD_H - splitY + 60);
  } else if (P.dark) {
    splitBackground(ctx, CARD_W, CARD_H, P.accent, seed, splitY);
  } else {
    lightSplitBackground(ctx, CARD_W, CARD_H, P.accent, seed, splitY);
  }

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

  if (data.logoOnSecond) drawLogo(ctx, assets, CARD2.logo, P);
  if (data.corners) frameCorners(ctx, CARD_W, CARD_H, P.accentText, 52, 18, 3);

  return canvas;
}

export function canvasToDataUrl(canvas) {
  return canvas.toDataURL('image/png');
}
