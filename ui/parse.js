// Чтение и запись файла «данные.txt» — обычный текст «ключ: значение».

import { ORANGE, KIT_PRESETS, SPEC_PRESETS, BATTERY_PRESET, FOOTER_PRESETS } from './layout.js';

// По единице измерения и подписи понимаем, какую иконку ставить.
function guessIcon(unit, label, value) {
  const s = `${unit} ${label} ${value}`.toLowerCase();
  if (/км\/ч|скорост/.test(s)) return 'gauge';
  if (/\bкм\b|пробег|запас хода/.test(s)) return 'route';
  if (/\bw\b|вт|ватт|мощност/.test(s)) return 'motor';
  if (/ah|ач|ёмкость|емкость|li-ion|lifepo|аккумулятор|батаре|\bv\b/.test(s)) return 'battery';
  if (/кг|нагрузк|вес/.test(s)) return 'weight';
  if (/\bч\b|час|зарядк/.test(s)) return 'clock';
  if (/ip\d|влаг/.test(s)) return 'drop';
  return 'power';
}

// «70 км» → { value: '70', unit: 'км' };  «72 V / 36 Ah» → оставляем целиком.
// Косая черта сама по себе не делает значение составным: в «100 км/ч» она
// внутри единицы измерения. Признак составного — два числа в строке.
function splitValue(raw) {
  const s = String(raw).trim();
  const numbers = s.match(/\d+(?:[.,]\d+)?/g) || [];
  if (s.includes('/') && numbers.length >= 2) return { value: s, unit: '' };
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
  const transforms = {};
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

    // «Кадр kit3: 1.20 0.05 -0.10 -3» — масштаб, сдвиг и поворот в градусах.
    // Четвёртого числа может не быть: файлы, записанные до появления поворота.
    const frame = key.match(/^кадр\s+(\S+)$/);
    if (frame) {
      const [scale, dx, dy, rot] = value.split(/\s+/).map(Number);
      if ([scale, dx, dy].every(n => Number.isFinite(n))) {
        transforms[frame[1]] = { scale, dx, dy, rot: Number.isFinite(rot) ? rot : 0 };
      }
      continue;
    }

    fields[key] = value;
  }

  const accentRaw = fields['цвет оформления'] || fields['акцент'] || '';

  // «Батарея: LI-ION | 60В / 27Ач». Тип не обязателен — тогда это просто ёмкость.
  const battery = { ...BATTERY_PRESET };
  if (fields['батарея'] || fields['аккумулятор']) {
    const [a, b] = String(fields['батарея'] || fields['аккумулятор']).split('|').map(s => s.trim());
    if (b) { battery.type = a.toUpperCase(); battery.value = b; }
    else { battery.type = ''; battery.value = a; }
  }

  const clean = specs.filter(Boolean);

  // Файлы прежнего формата держали батарею среди характеристик — переносим её
  // в отдельный блок, иначе она пропадёт: плашек на карточке теперь три.
  if (!fields['батарея'] && !fields['аккумулятор']) {
    const i = clean.findIndex(s => s.icon === 'battery');
    if (i >= 0) {
      const [moved] = clean.splice(i, 1);
      battery.type = (moved.label || 'LI-ION').toUpperCase();
      battery.value = [moved.value, moved.unit].filter(Boolean).join(' ');
    }
  }

  // Нижняя лента. Старый формат «Гарантия: 3 месяца» меняет только значение,
  // новый «Лента 1: ГАРАНТИЯ | 3 месяца | shield» — ещё надпись и иконку.
  const footer = FOOTER_PRESETS.map(f => ({ ...f }));
  const FOOTER_KEYS = ['гарантия', 'маркировка', 'влагозащита'];
  FOOTER_KEYS.forEach((key, i) => {
    if (fields[key]) footer[i].value = fields[key];
  });
  for (let i = 0; i < 3; i++) {
    const raw = fields[`лента ${i + 1}`];
    if (!raw) continue;
    const [label, value = '', icon = ''] = String(raw).split('|').map(s => s.trim());
    footer[i] = {
      icon: icon || footer[i].icon,
      label: label.toUpperCase(),
      value,
    };
  }

  const out = {
    brand: (fields['бренд'] || '').toUpperCase(),
    model: (fields['модель'] || '').toUpperCase(),
    version: (fields['версия'] || '').toUpperCase(),
    accent: /^#[0-9a-f]{3,8}$/i.test(accentRaw) ? accentRaw : (accentRaw ? colorByName(accentRaw) : ORANGE),
    theme: /^(да|yes|1|true|тёмн|темн)/i.test(fields['тёмная тема'] || fields['темная тема'] || '') ? 'dark' : 'light',
    removeBg: /^(да|yes|1|true)$/i.test(fields['удалять фон'] || 'да'),
    logoOnSecond: /^(да|yes|1|true)$/i.test(fields['логотип на второй'] || ''),
    corners: /^(да|yes|1|true)$/i.test(fields['уголки'] || ''),
    battery,
    footer,
    specs: clean.slice(0, 3),
    kit: kit.slice(0, 8),
    transforms,
  };

  // Подложка — общая настройка оформления, а не свойство модели. Если строки
  // в файле нет, ключ не возвращаем вовсе: иначе выбор модели из каталога
  // (где про фон ничего не сказано) сбрасывал бы выбранную подложку.
  if ('фон' in fields) out.background = fields['фон'];
  if ('фон 2' in fields) out.background2 = fields['фон 2'];
  if ('красить фон' in fields) out.tintBg = /^(да|yes|1|true)$/i.test(fields['красить фон']);

  // Какой файл за каким слотом закреплён: «Фото front: перед.jpg». Нужно,
  // чтобы ручная расстановка пережила закрытие программы.
  const slotFiles = {};
  for (const [key, value] of Object.entries(fields)) {
    const m = key.match(/^фото\s+(front|rear|kit[1-8])$/);
    if (m && value) slotFiles[m[1]] = value;
  }
  if (Object.keys(slotFiles).length) out.slotFiles = slotFiles;

  return out;
}

// Обратная сборка — чтобы кнопка «сохранить данные» писала файл в том же формате.
export function stringifyData(d) {
  const lines = [
    `Бренд: ${d.brand || ''}`,
    `Модель: ${d.model || ''}`,
    `Версия: ${d.version || ''}`,
    `Цвет оформления: ${d.accent || ORANGE}`,
    `Фон: ${d.background || ''}`,
    `Фон 2: ${d.background2 || ''}`,
    `Красить фон: ${d.tintBg ? 'да' : 'нет'}`,
    `Тёмная тема: ${d.theme === 'dark' ? 'да' : 'нет'}`,
    `Удалять фон: ${d.removeBg ? 'да' : 'нет'}`,
    `Логотип на второй: ${d.logoOnSecond ? 'да' : 'нет'}`,
    `Уголки: ${d.corners ? 'да' : 'нет'}`,
    '',
  ];

  const b = d.battery || {};
  lines.push(`Батарея: ${[b.type, b.value].filter(Boolean).join(' | ')}`);
  // Пишем полной строкой: надпись и иконка теперь редактируются, а старый
  // формат «Гарантия: …» их не сохранял и сбрасывал бы правки при открытии.
  (d.footer || []).forEach((f, i) => {
    lines.push(`Лента ${i + 1}: ${f.label || ''} | ${f.value || ''} | ${f.icon || ''}`);
  });
  lines.push('');

  (d.specs || []).forEach((s, i) => {
    const v = [s.value, s.unit].filter(Boolean).join(' ');
    lines.push(`Характеристика ${i + 1}: ${v}${s.label ? ` | ${s.label}` : ''}`);
  });
  lines.push('', 'Комплектация:');
  (d.kit || []).forEach((k, i) => {
    lines.push(`${i + 1}. ${k.title || ''}${k.note ? ` | ${k.note}` : ' |'}`);
  });

  // Какое фото в каком слоте — иначе при следующем открытии папки ручная
  // расстановка потерялась бы и всё разложилось заново по именам файлов.
  const pinned = Object.entries(d.slotFiles || {}).filter(([, name]) => name);
  if (pinned.length) {
    lines.push('');
    for (const [slot, name] of pinned) lines.push(`Фото ${slot}: ${name}`);
  }

  // Ручная подгонка кадров — чтобы при следующем открытии папки всё осталось как настроил.
  const moved = Object.entries(d.transforms || {})
    .filter(([, t]) => t && (t.scale !== 1 || t.dx || t.dy || t.rot));
  if (moved.length) {
    lines.push('');
    for (const [slot, t] of moved) {
      lines.push(`Кадр ${slot}: ${t.scale.toFixed(3)} ${t.dx.toFixed(4)} ${t.dy.toFixed(4)} ${(t.rot || 0).toFixed(1)}`);
    }
  }
  return lines.join('\n') + '\n';
}

// Каталог — один файл со всеми моделями. Модели разделены заголовком
// «=== Название ===» или «[Название]», внутри — тот же формат, что и в
// данные.txt, поэтому карточку модели можно просто скопировать сюда.
export function parseCatalog(text) {
  const items = [];
  let title = null;
  let buf = [];

  const flush = () => {
    if (title === null && !buf.some(l => l.includes(':'))) return;
    const data = parseData(buf.join('\n'));
    const auto = [data.brand, data.model, data.version].filter(Boolean).join(' ');
    const name = (title || auto).trim();
    if (name) items.push({ title: name, data });
  };

  for (const line of String(text).split(/\r?\n/)) {
    const t = line.trim();
    const head = t.match(/^={2,}\s*(.+?)\s*={2,}$/) || t.match(/^\[\s*(.+?)\s*\]$/);
    if (head) { flush(); title = head[1]; buf = []; continue; }
    buf.push(line);
  }
  flush();
  return items;
}

export function emptyData() {
  return {
    brand: '', model: '', version: '',
    accent: ORANGE, theme: 'light', removeBg: true, logoOnSecond: false, corners: false, tolerance: 38,
    background: 'горы', tintBg: true,   // подложка с горами — базовый вариант
    background2: '',                    // пусто = вторая карточка берёт фон первой
    transforms: {},
    slotFiles: {},                      // слот → имя файла, закреплённого вручную
    battery: { ...BATTERY_PRESET },
    specs: SPEC_PRESETS.map(s => ({ ...s })),
    footer: FOOTER_PRESETS.map(f => ({ ...f })),
    kit: KIT_PRESETS.map(k => ({ ...k })),
  };
}
