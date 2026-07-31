// Геометрия шаблона. Всё в пикселях итогового изображения.
// Зоны — прямоугольники: текст вписывается внутрь, поэтому длинное название
// ужимается на месте и не разносит макет.

export const CARD_W = 1024;
export const CARD_H = 1280;

// Палитра сайта «Погнали РФ».
export const ORANGE_BRAND = '#F26522';  // акцент каталожных карточек
export const YELLOW = '#FFDD00';        // фирменный жёлтый — заливки, полосы
export const YELLOW_GLOW = '#FFD600';   // свечение
export const GOLD = '#F5A623';          // золотисто-жёлтый
export const YELLOW_DEEP = '#E6B800';   // приглушённый — текст и обводки
export const CREAM = '#FEF3C7';         // бледно-жёлтая подложка

export const ORANGE = ORANGE_BRAND;     // акцент по умолчанию
export const INK = '#111111';           // основной текст
export const DIM = '#6b7280';           // подписи
export const WHITE = '#ffffff';
export const PANEL = 'rgba(255,255,255,0.94)';

// ── Карточка №1 — главная ────────────────────────────────────────────────────
// Порядок сверху вниз: логотип, бренд, модель, батарея, три плашки, нижняя лента.
// Фото стоит справа и заходит под текстовую колонку.
export const CARD1 = {
  logo:    { x: 182,  y: 18,   w: 660, h: 178 },
  brand:   { x: 44,   y: 212,  w: 420, h: 54  },   // KUGOO
  model:   { x: 40,   y: 272,  w: 450, h: 232 },   // WISH 02 PRO — переносится сам
  battery: { x: 44,   y: 520,  w: 450, h: 120 },
  // Плашки заканчиваются на x=336, фото начинается с 366 — товар не заезжает
  // под текстовую колонку вовсе.
  specs:   { x: 40,   y: 690,  w: 296, h: 92, gap: 16, count: 3, radius: 22 },
  photo:   { x: 366,  y: 296,  w: 646, h: 806 },
  footer:  { x: 40,   y: 1144, w: 944, h: 100, radius: 24 },
};

// Внутренняя раскладка блока батареи (от угла блока).
// Плитка с иконкой слева, справа две строки: тип и ёмкость.
export const BATTERY_BOX = {
  tile:  { x: 0, y: 8, size: 104, radius: 26 },
  icon:  { inset: 27 },
  type:  { x: 126, y: 12, h: 54 },
  value: { x: 128, y: 68, h: 44 },
};

// Внутренняя раскладка плашки характеристики (от угла плашки)
export const SPEC_BOX = {
  icon:  { x: 22, y: 24, size: 44 },
  value: { x: 82, y: 14, h: 44 },
  label: { x: 84, y: 60, h: 20 },
};

// Внутренняя раскладка колонки нижней ленты (от угла колонки)
export const FOOTER_BOX = {
  icon:  { x: 24, size: 38 },
  label: { x: 76, y: 24, h: 22 },
  value: { x: 76, y: 50, h: 28 },
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
  num:     { x: 20, y: 12, size: 40 },  // крупная акцентная цифра
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

// Возвращает прямоугольник i-й колонки нижней ленты.
export function footerRect(i, count = 3) {
  const f = CARD1.footer;
  const w = f.w / count;
  return { x: f.x + w * i, y: f.y, w, h: f.h };
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

// Рамка, в которую попадает фото конкретного слота, — нужна редактору кадрирования,
// чтобы показывать кадр в тех же пропорциях, что на самой карточке.
export function slotFrame(slotId) {
  if (slotId === 'front') return { w: CARD1.photo.w, h: CARD1.photo.h, mode: 'contain' };
  if (slotId === 'rear')  return { w: CARD2.photo.w, h: CARD2.photo.h, mode: 'contain' };

  const idx = Number(String(slotId).replace('kit', '')) - 1;
  const rects = kitRects();
  const r = rects[idx];
  if (!r) return { w: 200, h: 150, mode: 'cover' };
  return {
    w: r.w * KIT_BOX.photoFrac,
    h: r.h - KIT_BOX.photoPad * 2,
    mode: 'cover',
  };
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

// Три плашки главной карточки: мощность, скорость, нагрузка.
export const SPEC_PRESETS = [
  { icon: 'motor',  value: '2500', unit: 'Вт',   label: 'МОЩНОСТЬ' },
  { icon: 'gauge',  value: '70',   unit: 'км/ч', label: 'СКОРОСТЬ' },
  { icon: 'weight', value: '150',  unit: 'кг',   label: 'НАГРУЗКА' },
];

// Батарея — отдельный блок над плашками.
export const BATTERY_PRESET = { type: 'LI-ION', value: '60В / 27Ач' };

// Нижняя лента — три пункта с фиксированными иконками, меняются только значения.
export const FOOTER_PRESETS = [
  { icon: 'shield', label: 'ГАРАНТИЯ',    value: '3 месяца' },
  { icon: 'tire',   label: 'МАРКИРОВКА',  value: '240' },
  { icon: 'drops',  label: 'ВЛАГОЗАЩИТА', value: 'IP54' },
];

// Слоты фотографий: два общих плана + восемь деталей.
export const PHOTO_SLOTS = [
  { id: 'front', label: 'Главная (спереди)' },
  { id: 'rear',  label: 'Вторая (сбоку/сзади)' },
  ...Array.from({ length: 8 }, (_, i) => ({ id: `kit${i + 1}`, label: `Блок ${i + 1}` })),
];
