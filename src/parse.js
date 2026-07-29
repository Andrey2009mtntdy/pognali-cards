// Разбор файла «данные.txt» из папки модели.
// Формат намеренно простой — обычный текст «ключ: значение», как в брифе.

import { BRAND_RED } from './layout.js';

// По единице измерения и подписи понимаем, какую иконку ставить на плашку.
function guessIcon(unit, label, value) {
  const s = `${unit} ${label} ${value}`.toLowerCase();
  if (/км\/ч|скорост/.test(s)) return 'gauge';
  if (/\bкм\b|пробег|запас хода/.test(s)) return 'route';
  if (/ah|ач|ёмкость|емкость/.test(s)) return 'battery';
  if (/li-ion|li-po|lifepo|аккумулятор|батаре/.test(s)) return 'cell';
  if (/вт|ватт|мощност/.test(s)) return 'power';
  if (/кг|нагрузк|вес/.test(s)) return 'weight';
  return 'bolt';
}

// «80 км» → { value: '80', unit: 'км' };  «LI-ION» → { value: 'LI-ION', unit: '' }
function splitValue(raw) {
  const s = String(raw).trim();
  const m = s.match(/^([\d.,]+)\s*(.*)$/);
  if (m) return { value: m[1], unit: m[2].trim() };
  return { value: s, unit: '' };
}

// Строка вида «80 км | ПРОБЕГ» — подпись после вертикальной черты.
function parseSpecLine(raw) {
  const [valuePart, labelPart = ''] = String(raw).split('|').map(s => s.trim());
  const { value, unit } = splitValue(valuePart);
  const label = labelPart;
  return { icon: guessIcon(unit, label, value), value, unit, label };
}

function parseKitLine(raw) {
  const [title, note = ''] = String(raw).split('|').map(s => s.trim());
  return { title: title.toUpperCase(), note };
}

export function parseData(text) {
  const lines = String(text).split(/\r?\n/);

  const fields = {};
  const specs = [];
  const kit = [];
  let section = null;

  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('//')) continue;

    // Заголовок секции: «Комплектация:» / «Характеристики:»
    if (/^комплектация\s*:?\s*$/i.test(t)) { section = 'kit'; continue; }
    if (/^характеристики\s*:?\s*$/i.test(t)) { section = 'specs'; continue; }

    // Нумерованный пункт «1. ЗЕРКАЛА | заднего вида»
    const numbered = t.match(/^(\d+)[.)]\s*(.+)$/);
    if (numbered) {
      const body = numbered[2];
      if (section === 'kit') kit.push(parseKitLine(body));
      else if (section === 'specs') specs.push(parseSpecLine(body));
      continue;
    }

    // Обычное «ключ: значение»
    const kv = t.match(/^([^:]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1].trim().toLowerCase();
    const value = kv[2].trim();
    if (!value) { // «Комплектация:» уже поймали выше; пустое значение = начало секции
      if (/комплектац/.test(key)) section = 'kit';
      if (/характеристик/.test(key)) section = 'specs';
      continue;
    }

    // «Характеристика 1: 30 Ah»
    const specNum = key.match(/^характеристика\s*(\d+)$/);
    if (specNum) { specs[Number(specNum[1]) - 1] = parseSpecLine(value); continue; }

    fields[key] = value;
  }

  const brand = fields['бренд'] || '';
  const model = fields['модель'] || '';
  const version = fields['версия'] || '';
  const accent = fields['цвет оформления'] || fields['акцент'] || '';

  return {
    brand: brand.toUpperCase(),
    model,
    version: version.toUpperCase(),
    color: fields['цвет модели'] || fields['цвет'] || '',
    accent: /^#[0-9a-f]{3,8}$/i.test(accent) ? accent : (accent ? colorByName(accent) : BRAND_RED),
    removeBg: /^(да|yes|1|true)$/i.test(fields['удалять фон'] || ''),
    specs: specs.filter(Boolean).slice(0, 4),
    kit: kit.slice(0, 8),
  };
}

// Название цвета словом → hex, чтобы не заставлять писать коды.
function colorByName(name) {
  const s = String(name).toLowerCase();
  const map = [
    [/красн/, '#e8192c'], [/оранж/, '#f26a1b'], [/жёлт|желт|золот/, '#e8b414'],
    [/зелён|зелен/, '#1faa59'], [/син|голуб/, '#1f6fd0'], [/фиолет|сирен/, '#7b3fe4'],
    [/розов/, '#e0398b'], [/бирюз/, '#12b5b0'], [/сер|graphite|графит/, '#5a6270'],
    [/чёрн|черн/, '#1b1b1b'], [/бел/, '#5a6270'],
  ];
  for (const [re, hex] of map) if (re.test(s)) return hex;
  return BRAND_RED;
}

// Заготовка файла данных — кладём в каждую новую папку модели.
export const TEMPLATE_TXT = `Бренд: WENBOX
Модель: W33
Версия: PRO
Цвет модели: чёрный с оранжевым
Цвет оформления: красный
Удалять фон: нет

Характеристика 1: 30 Ah
Характеристика 2: 80 км | ПРОБЕГ
Характеристика 3: 65 км/ч | МАКС. СКОРОСТЬ
Характеристика 4: LI-ION | АККУМУЛЯТОР

Комплектация:
1. ЗЕРКАЛА | заднего вида
2. ФАРА | мощное освещение
3. ДИСПЛЕЙ | информативный
4. АККУМУЛЯТОР LI-ION | 30 Ah
5. ГИДРАВЛИЧЕСКИЕ ТОРМОЗА |
6. ПОДСЕДЕЛЬНЫЙ АМОРТИЗАТОР |
7. МЯГКОЕ СИДЕНЬЕ | комфорт в каждой поездке
8. КУРЬЕРСКИЙ БАГАЖНИК |
`;
