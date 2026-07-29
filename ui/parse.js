// Чтение и запись файла «данные.txt» — обычный текст «ключ: значение».

import { ORANGE, KIT_PRESETS, SPEC_PRESETS } from './layout.js';

// По единице измерения и подписи понимаем, какую иконку ставить.
function guessIcon(unit, label, value) {
  const s = `${unit} ${label} ${value}`.toLowerCase();
  if (/км\/ч|скорост/.test(s)) return 'gauge';
  if (/\bкм\b|пробег|запас хода/.test(s)) return 'route';
  if (/\bw\b|вт|ватт|мощност/.test(s)) return 'power';
  if (/ah|ач|ёмкость|емкость|li-ion|lifepo|аккумулятор|батаре|\bv\b/.test(s)) return 'battery';
  if (/кг|нагрузк|вес/.test(s)) return 'weight';
  if (/\bч\b|час|зарядк/.test(s)) return 'clock';
  if (/ip\d|влаг/.test(s)) return 'drop';
  return 'power';
}

// «70 км» → { value: '70', unit: 'км' };  «72 V / 36 Ah» → оставляем целиком
function splitValue(raw) {
  const s = String(raw).trim();
  if (/[/]/.test(s)) return { value: s, unit: '' };  // составное значение не режем
  const m = s.match(/^([\d.,]+)\s*(.*)$/);
  return m ? { value: m[1], unit: m[2].trim() } : { value: s, unit: '' };
}

function parseSpecLine(raw) {
  const [valuePart, labelPart = ''] = String(raw).split('|').map(s => s.trim());
  const { value, unit } = splitValue(valuePart);
  return { icon: guessIcon(unit, labelPart, value), value, unit, label: labelPart };
}

function parseKitLine(raw) {
  const [title, note = ''] = String(raw).split('|').map(s => s.trim());
  return { title: title.toUpperCase(), note };
}

const COLOR_MAP = [
  [/оранж/, '#f97316'], [/красн/, '#e8192c'], [/жёлт|желт|золот/, '#eab308'],
  [/зелён|зелен/, '#22c55e'], [/син|голуб/, '#3b82f6'], [/фиолет|сирен/, '#8b5cf6'],
  [/розов/, '#ec4899'], [/бирюз/, '#14b8a6'], [/сер|графит/, '#94a3b8'],
  [/чёрн|черн/, '#64748b'], [/бел/, '#94a3b8'],
];

function colorByName(name) {
  const s = String(name).toLowerCase();
  for (const [re, hex] of COLOR_MAP) if (re.test(s)) return hex;
  return ORANGE;
}

export function parseData(text) {
  const fields = {};
  const specs = [];
  const kit = [];
  let section = null;

  for (const line of String(text).split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('//')) continue;

    if (/^комплектация\s*:?\s*$/i.test(t)) { section = 'kit'; continue; }
    if (/^характеристики\s*:?\s*$/i.test(t)) { section = 'specs'; continue; }

    const numbered = t.match(/^(\d+)[.)]\s*(.+)$/);
    if (numbered) {
      if (section === 'kit') kit.push(parseKitLine(numbered[2]));
      else if (section === 'specs') specs.push(parseSpecLine(numbered[2]));
      continue;
    }

    const kv = t.match(/^([^:]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1].trim().toLowerCase();
    const value = kv[2].trim();
    if (!value) {
      if (/комплектац/.test(key)) section = 'kit';
      if (/характеристик/.test(key)) section = 'specs';
      continue;
    }

    const specNum = key.match(/^характеристика\s*(\d+)$/);
    if (specNum) { specs[Number(specNum[1]) - 1] = parseSpecLine(value); continue; }

    fields[key] = value;
  }

  const accentRaw = fields['цвет оформления'] || fields['акцент'] || '';

  return {
    brand: (fields['бренд'] || '').toUpperCase(),
    model: (fields['модель'] || '').toUpperCase(),
    version: (fields['версия'] || '').toUpperCase(),
    accent: /^#[0-9a-f]{3,8}$/i.test(accentRaw) ? accentRaw : (accentRaw ? colorByName(accentRaw) : ORANGE),
    theme: /^(да|yes|1|true|тёмн|темн)/i.test(fields['тёмная тема'] || fields['темная тема'] || '') ? 'dark' : 'light',
    removeBg: /^(да|yes|1|true)$/i.test(fields['удалять фон'] || 'да'),
    logoOnSecond: /^(да|yes|1|true)$/i.test(fields['логотип на второй'] || ''),
    specs: specs.filter(Boolean).slice(0, 4),
    kit: kit.slice(0, 8),
  };
}

// Обратная сборка — чтобы кнопка «сохранить данные» писала файл в том же формате.
export function stringifyData(d) {
  const lines = [
    `Бренд: ${d.brand || ''}`,
    `Модель: ${d.model || ''}`,
    `Версия: ${d.version || ''}`,
    `Цвет оформления: ${d.accent || ORANGE}`,
    `Тёмная тема: ${d.theme === 'dark' ? 'да' : 'нет'}`,
    `Удалять фон: ${d.removeBg ? 'да' : 'нет'}`,
    `Логотип на второй: ${d.logoOnSecond ? 'да' : 'нет'}`,
    '',
  ];
  (d.specs || []).forEach((s, i) => {
    const v = [s.value, s.unit].filter(Boolean).join(' ');
    lines.push(`Характеристика ${i + 1}: ${v}${s.label ? ` | ${s.label}` : ''}`);
  });
  lines.push('', 'Комплектация:');
  (d.kit || []).forEach((k, i) => {
    lines.push(`${i + 1}. ${k.title || ''}${k.note ? ` | ${k.note}` : ' |'}`);
  });
  return lines.join('\n') + '\n';
}

export function emptyData() {
  return {
    brand: '', model: '', version: '',
    accent: ORANGE, theme: 'light', removeBg: true, logoOnSecond: false, corners: true, tolerance: 38,
    specs: SPEC_PRESETS.map(s => ({ ...s })),
    kit: KIT_PRESETS.map(k => ({ ...k })),
  };
}
