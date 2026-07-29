// Геометрия карточек. Всё в пикселях итогового изображения 1086×1448.
// Зоны — прямоугольники, а не жёсткие кегли: текст вписывается ВНУТРЬ зоны,
// поэтому длинное название модели ужимается на месте и не разносит макет.

export const CARD_W = 1086;
export const CARD_H = 1448;

export const BRAND_RED = '#e8192c';
export const INK = '#111111';
export const MUTED = '#3d4450'; // подписи под значениями: светлее — теряются на печати и в ленте

// Карточка №1 — главная рекламная
export const CARD1 = {
  logo:   { x: 52,  y: 18,   w: 982, h: 248 },
  brand:  { x: 58,  y: 276,  w: 400, h: 60  },
  model:  { x: 50,  y: 344,  w: 420, h: 382 },
  photo:  { x: 392, y: 260,  w: 686, h: 1000 }, // правее текста, иначе колесо наезжает на название
  specs:  { x: 44,  y: 748,  w: 296, h: 96, gap: 10, count: 4, radius: 20 },
  bottom: { x: 44,  y: 1288, w: 998, h: 112, radius: 24 },
};

// Карточка №2 — комплектация
export const CARD2 = {
  title:  { x: 50,  y: 34,   w: 540, h: 76  },
  brand:  { x: 54,  y: 132,  w: 340, h: 50  },
  model:  { x: 48,  y: 190,  w: 370, h: 300 },
  photo:  { x: 290, y: 16,   w: 796, h: 576 },
  grid:   { x: 44,  y: 596,  colW: 492, rowH: 168, gapX: 14, gapY: 12, cols: 2, rows: 4, radius: 18 },
  footer: { x: 44,  y: 1322, w: 998, h: 104 },
};

// Внутренняя раскладка плашки характеристики (координаты от угла самой плашки)
export const SPEC_BOX = {
  icon:  { x: 24, y: 22, size: 52 },
  value: { x: 96, y: 14, w: 180, h: 48 },
  label: { x: 96, y: 62, w: 180, h: 22 },
};

// Внутренняя раскладка блока комплектации
export const KIT_BOX = {
  photo:   { x: 10,  y: 10, w: 194, h: 148 },
  divider: { x: 218, y: 26, h: 116 },
  title:   { x: 238, y: 28, w: 242, h: 62 },
  note:    { x: 238, y: 96, w: 242, h: 46 },
};

// Три нижние плашки карточки №1 — по брифу не меняются никогда.
export const FIXED_BADGES = [
  { icon: 'shield', title: 'ГАРАНТИЯ',    value: '3 МЕСЯЦА' },
  { icon: 'motor',  title: 'МАРКИРОВКА',  value: '240 ВТ'   },
  { icon: 'drop',   title: 'ВЛАГОЗАЩИТА', value: 'IP54'     },
];

export function specRect(i) {
  const s = CARD1.specs;
  return { x: s.x, y: s.y + i * (s.h + s.gap), w: s.w, h: s.h };
}

export function kitRect(i) {
  const g = CARD2.grid;
  const col = i % g.cols;
  const row = Math.floor(i / g.cols);
  return {
    x: g.x + col * (g.colW + g.gapX),
    y: g.y + row * (g.rowH + g.gapY),
    w: g.colW,
    h: g.rowH,
  };
}
