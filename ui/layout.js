// Геометрия тёмного шаблона (по образцам KUGOO WISH 03).
// Всё в пикселях итогового изображения. Зоны — прямоугольники: текст вписывается
// внутрь, поэтому длинное название ужимается на месте и не разносит макет.

export const CARD_W = 1024;
export const CARD_H = 1280;

// Палитра сайта «Погнали РФ».
// Чистый #FFDD00 отлично работает заливкой, но как текст на белом не читается —
// для надписей и обводок берём приглушённый и золотистый.
export const YELLOW = '#FFDD00';        // основной жёлтый — заливки, полосы
export const YELLOW_GLOW = '#FFD600';   // свечение
export const GOLD = '#F5A623';          // золотисто-жёлтый
export const YELLOW_DEEP = '#E6B800';   // приглушённый — текст и обводки
export const CREAM = '#FEF3C7';         // бледно-жёлтая подложка

export const ORANGE = YELLOW;           // акцент по умолчанию
export const INK = '#111111';           // основной текст
export const DIM = '#6b7280';           // подписи
export const WHITE = '#ffffff';
export const PANEL = 'rgba(255,255,255,0.94)';

// ── Карточка №1 — главная ────────────────────────────────────────────────────
export const CARD1 = {
  brand:    { x: 36,  y: 52,   w: 300, h: 54  },   // KUGOO
  model:    { x: 32,  y: 104,  w: 640, h: 116 },   // WISH 03 — «03» красится акцентом
  ghost:    { x: 540, y: 60,   w: 300, h: 220 },   // полупрозрачный номер на фоне
  photo:    { x: 210, y: 250,  w: 810, h: 820 },
  specs:    { x: 22,  y: 352,  w: 300, h: 78, gap: 14, count: 4, skew: 16 },
  logo:     { x: 282, y: 1076, w: 460, h: 168 },
};

// Внутренняя раскладка плашки характеристики (от угла плашки)
export const SPEC_BOX = {
  icon:  { x: 18, y: 17, size: 44 },
  value: { x: 78, y: 12, w: 200, h: 40 },
  label: { x: 78, y: 50, w: 200, h: 20 },
};

// ── Карточка №2 — комплектация ───────────────────────────────────────────────
export const CARD2 = {
  brand:    { x: 46,  y: 44,  w: 240, h: 44  },
  model:    { x: 40,  y: 78,  w: 500, h: 96  },
  divider:  { x: 566, y: 46,  h: 122 },
  title:    { x: 580, y: 50,  w: 386, h: 116 },   // КОМПЛЕКТАЦИЯ / И ОСОБЕННОСТИ
  photo:    { x: 110, y: 180, w: 830, h: 430 },
  logo:     { x: 350, y: 1186, w: 330, h: 86 },   // необязательный, включается галочкой

  // Сетка комплектации: ряды разной раскладки, как в образце — 3 / 3 / 2.
  grid: {
    x: 26, y: 628, w: 972,
    rowH: 172, gapY: 14, gapX: 12, skew: 14,
    rows: [
      [0.375, 0.305, 0.320],
      [0.400, 0.290, 0.310],
      [0.440, 0.560],
    ],
  },
};

// Внутренняя раскладка блока комплектации
export const KIT_BOX = {
  num:     { x: 20, y: 12, size: 40 },  // крупная оранжевая цифра
  textX:   20,                          // текст идёт под номером, во всю левую часть
  textTop: 56,
  textBottom: 14,
  photoFrac: 0.42,                      // доля ширины блока под фото детали
  photoPad: 10,
};

// Возвращает прямоугольник i-й плашки характеристики.
export function specRect(i) {
  const s = CARD1.specs;
  return { x: s.x, y: s.y + i * (s.h + s.gap), w: s.w, h: s.h };
}

// Возвращает прямоугольники всех восьми блоков комплектации.
export function kitRects() {
  const g = CARD2.grid;
  const out = [];
  let y = g.y;
  for (const row of g.rows) {
    const gaps = g.gapX * (row.length - 1);
    let x = g.x;
    for (const frac of row) {
      const w = (g.w - gaps) * frac;
      out.push({ x, y, w, h: g.rowH });
      x += w + g.gapX;
    }
    y += g.rowH + g.gapY;
  }
  return out;
}

// Пресеты блоков комплектации — нейтральные формулировки из брифа.
export const KIT_PRESETS = [
  { title: 'ЗЕРКАЛА',              note: 'заднего вида' },
  { title: 'ДИСПЛЕЙ',              note: 'информативный' },
  { title: 'ГИДРАВЛИЧЕСКИЕ ТОРМОЗА', note: '' },
  { title: 'АККУМУЛЯТОР',          note: 'зарядное устройство' },
  { title: 'ФАРА',                 note: 'передняя' },
  { title: 'ФОНАРЬ',               note: 'задний' },
  { title: 'ПОДНОЖКА',             note: '' },
  { title: 'АМОРТИЗАТОРЫ',         note: 'передний и задний' },
];

export const SPEC_PRESETS = [
  { icon: 'battery', value: '72 V / 36 Ah', unit: '', label: 'LI-ION' },
  { icon: 'power',   value: '5000',  unit: 'W',    label: 'МОЩНОСТЬ' },
  { icon: 'route',   value: '70',    unit: 'км',   label: 'ПРОБЕГ' },
  { icon: 'gauge',   value: '100',   unit: 'км/ч', label: 'МАКС. СКОРОСТЬ' },
];

// Слоты фотографий: два общих плана + восемь деталей.
export const PHOTO_SLOTS = [
  { id: 'front', label: 'Главная (спереди)' },
  { id: 'rear',  label: 'Вторая (сбоку/сзади)' },
  ...Array.from({ length: 8 }, (_, i) => ({ id: `kit${i + 1}`, label: `Блок ${i + 1}` })),
];
