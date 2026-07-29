// Разовая подготовка демо-комплекта: режет крупные планы деталей из общего фото.
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const SRC = 'C:/Users/ilanv/Projects/pognali-shop/public/bikes/s1.png';
const OUT = 'модели/SIBERTON S1';
await fs.mkdir(OUT, { recursive: true });

// Общие планы.
await fs.copyFile(SRC, path.join(OUT, 'перед.png'));
// Для второй карточки — зеркалим кадр, чтобы ракурс отличался от первой карточки.
await sharp(SRC).flop().toFile(path.join(OUT, 'сбоку.png'));

// Крупные планы из общего фото (координаты по кадру 800×800).
const crops = [
  ['фара',        { left: 186, top: 196, width: 120, height: 120 }],
  ['зеркала',     { left: 160, top: 48,  width: 120, height: 120 }],
  ['корзина',     { left: 38,  top: 300, width: 200, height: 150 }],
  ['колесо',      { left: 78,  top: 470, width: 190, height: 220 }],
  ['сиденье',     { left: 380, top: 320, width: 220, height: 130 }],
  ['руль',        { left: 290, top: 150, width: 190, height: 120 }],
  ['аккумулятор', { left: 356, top: 390, width: 240, height: 150 }],
  ['подножка',    { left: 300, top: 520, width: 260, height: 140 }],
];

for (const [name, box] of crops) {
  await sharp(SRC).extract(box).resize(600, null, { withoutEnlargement: false }).png().toFile(path.join(OUT, `${name}.png`));
}

const DATA = `Бренд: SIBERTON
Модель: S1
Версия: CITY
Цвет модели: чёрный с жёлтым
Цвет оформления: жёлтый
Удалять фон: да

Характеристика 1: 20 Ah
Характеристика 2: 60 км | ПРОБЕГ
Характеристика 3: 25 км/ч | МАКС. СКОРОСТЬ
Характеристика 4: LI-ION | АККУМУЛЯТОР

Комплектация:
1. ЗЕРКАЛА | заднего вида
2. ФАРА | мощное освещение
3. ОРГАНЫ УПРАВЛЕНИЯ | удобный руль
4. АККУМУЛЯТОР LI-ION | 20 Ah
5. ПЕРЕДНЯЯ КОРЗИНА |
6. КОЛЁСА | усиленные шины
7. МЯГКОЕ СИДЕНЬЕ | со спинкой
8. ШИРОКАЯ ПОДНОЖКА |
`;
await fs.writeFile(path.join(OUT, 'данные.txt'), DATA, 'utf8');
console.log('демо-комплект готов:', crops.length + 2, 'фото');
