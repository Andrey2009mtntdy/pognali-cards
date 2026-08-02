// Геометрия шаблона. Всё в пикселях итогового изображения.
// Зоны — прямоугольники: текст вписывается внутрь, поэтому длинное название
// ужимается на месте и не разносит макет.

// Размер под маркетплейсы: 3:4, как в исходном брифе.
export const CARD_W = 1086;
export const CARD_H = 1448;

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
  // Логотип на 15% крупнее прежнего (660×178). Чтобы он не наехал на бренд,
  // подняли его к верхнему краю, а текстовую колонку сдвинули ниже.
  // Ширины и высоты блоков выросли на 6% (по ширине кадра), а расстояния между
  // ними — на 13%: кадр стал выше пропорционально сильнее, и лишнюю высоту
  // отдали воздуху и фотографии, а не растянули сами блоки.
  logo:    { x: 140,  y: 11,   w: 806, h: 217 },
  brand:   { x: 47,   y: 253,  w: 445, h: 57  },   // KUGOO
  // Курсив шире прямого начертания, поэтому зона чуть выше: иначе автоподбор
  // ужимает кегль и название выглядит мельче, чем было.
  model:   { x: 42,   y: 310,  w: 494, h: 259 },   // WISH / 02 PRO — в две строки
  battery: { x: 47,   y: 588,  w: 477, h: 127 },
  // Плашки заканчиваются на x=356, фото начинается с 388 — товар не заезжает
  // под текстовую колонку вовсе.
  specs:   { x: 42,   y: 781,  w: 314, h: 98, gap: 17, count: 3, radius: 23 },
  photo:   { x: 388,  y: 335,  w: 685, h: 890 },
  footer:  { x: 42,   y: 1294, w: 1001, h: 106, radius: 25 },
};

// Внутренняя раскладка блока батареи (от угла блока).
// Плитка с иконкой слева, справа две строки: тип и ёмкость.
export const BATTERY_BOX = {
  tile:  { x: 0, y: 8, size: 110, radius: 28 },
  icon:  { inset: 29 },
  type:  { x: 134, y: 13, h: 57 },
  value: { x: 136, y: 72, h: 47 },
};

// Внутренняя раскладка плашки характеристики (от угла плашки)
export const SPEC_BOX = {
  icon:  { x: 23, y: 25, size: 47 },
  value: { x: 87, y: 15, h: 47 },
  label: { x: 89, y: 64, h: 21 },
};

// Внутренняя раскладка колонки нижней ленты (от угла колонки)
export const FOOTER_BOX = {
  icon:  { x: 25, size: 40 },
  label: { x: 81, y: 25, h: 23 },
  value: { x: 81, y: 53, h: 30 },
};

// ── Карточка №2 — комплектация ───────────────────────────────────────────────
export const CARD2 = {
  brand:    { x: 49,  y: 50,  w: 254, h: 47  },
  model:    { x: 42,  y: 88,  w: 530, h: 102 },
  divider:  { x: 600, y: 52,  h: 129 },
  title:    { x: 615, y: 57,  w: 409, h: 123 },   // КОМПЛЕКТАЦИЯ / И ОСОБЕННОСТИ
  photo:    { x: 117, y: 204, w: 880, h: 486 },
  logo:     { x: 371, y: 1342, w: 350, h: 91 },   // необязательный, включается галочкой

  // Сетка комплектации: ряды разной раскладки, как в образце — 3 / 3 / 2.
  // Кадр выше прежнего, поэтому ряды стали выше — иначе под сеткой оставалось
  // бы пустое поле в треть экрана.
  grid: {
    x: 28, y: 710, w: 1031,
    rowH: 195, gapY: 15, gapX: 13, skew: 15,
    rows: [
      [0.375, 0.305, 0.320],
      [0.400, 0.290, 0.310],
      [0.440, 0.560],
    ],
  },
};

// Внутренняя раскладка блока комплектации
export const KIT_BOX = {
  num:     { x: 22, y: 14, size: 45 },  // крупная акцентная цифра
  textX:   22,                          // текст идёт под номером, во всю левую часть
  textTop: 62,
  textBottom: 16,
  photoFrac: 0.42,                      // доля ширины блока под фото детали
  photoPad: 11,
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
