// Раскладка фотографий по слотам макета.
// Имя файла — это команда: «зеркала.jpg» уедет в блок «ЗЕРКАЛА»,
// «перед.jpg» — на главную карточку. Порядок файлов в папке не важен.

import { loadImage, cutBackground } from './draw.js';

// Слева — как деталь названа в блоке, справа — что искать в имени файла.
const DETAIL_KEYS = [
  { match: /зеркал|mirror/i,                        file: /зеркал|mirror/i },
  { match: /дисплей|экран|приборн|панель/i,          file: /дисплей|экран|display|панель|приборн/i },
  { match: /тормоз|суппорт/i,                        file: /тормоз|brake|диск|суппорт/i },
  { match: /аккумулятор|батаре|акб|зарядн|li-ion/i,  file: /аккум|батар|battery|акб|зарядк|зарядн|charger/i },
  { match: /фара|фары|освещ|передний свет/i,         file: /фара|фары|свет|light|head/i },
  { match: /фонар|стоп|габарит/i,                    file: /фонар|стоп|tail|габарит/i },
  { match: /подножк|упор/i,                          file: /подножк|stand|лапк|упор/i },
  { match: /амортизатор|подвеск|вилка/i,             file: /аморт|shock|пружин|вилк|подвеск/i },
  { match: /сиден|седло|кресл/i,                     file: /сиден|седло|seat|кресл/i },
  { match: /багажник|корзин|кофр/i,                  file: /багажник|корзин|rack|кофр|ящик/i },
  { match: /колес|колёс|шина|покрышк/i,              file: /колес|колёс|шина|wheel|tire|покрышк|резин/i },
  { match: /поворотник|указател/i,                   file: /поворотник|turn|указател/i },
  { match: /управлен|руль|ручк|курок/i,              file: /руль|ручк|управлен|курок|грип/i },
  { match: /двигател|мотор/i,                        file: /двигател|мотор|motor/i },
  { match: /рама|корпус/i,                           file: /рама|корпус|frame/i },
];

const FRONT_RE = /перед|спереди|front|главн|основн|фас/i;
const REAR_RE  = /зад(?!н\w*\s*фонар)|сзади|rear|back|сбок|бок|side|профил/i;

/**
 * Раскладывает список файлов по слотам.
 * files: [{ name, base, dataUrl }]
 * kit:   массив блоков комплектации (нужен, чтобы понять, что искать)
 * Возвращает { photos, report }.
 */
export async function assignPhotos(files, kit, { removeBg = false, tolerance = 38 } = {}) {
  const used = new Set();
  const report = [];

  const take = (re) => {
    const hit = files.find(f => !used.has(f.name) && re.test(f.base));
    if (hit) used.add(hit.name);
    return hit || null;
  };

  const slots = {};
  slots.front = take(FRONT_RE);
  slots.rear = take(REAR_RE);

  for (let i = 0; i < 8; i++) {
    const title = kit[i]?.title || '';
    const key = DETAIL_KEYS.find(k => k.match.test(title));
    slots[`kit${i + 1}`] = key ? take(key.file) : null;
  }

  // Чем не хватило — добиваем оставшимися по порядку.
  const leftovers = files.filter(f => !used.has(f.name));
  const order = ['front', 'rear', ...Array.from({ length: 8 }, (_, i) => `kit${i + 1}`)];
  const guessed = new Set();
  for (const slot of order) {
    if (slots[slot]) continue;
    const next = leftovers.shift();
    if (!next) continue;
    used.add(next.name);
    slots[slot] = next;
    guessed.add(slot);
  }

  const photos = {};
  for (const [slot, file] of Object.entries(slots)) {
    if (!file) { report.push({ slot, name: null, status: 'нет фото' }); continue; }
    let img = await loadImage(file.dataUrl);
    if (img && removeBg && (slot === 'front' || slot === 'rear')) {
      img = cutBackground(img, tolerance);
    }
    photos[slot] = img;
    report.push({
      slot,
      name: file.name,
      status: guessed.has(slot) ? 'по остатку' : 'по имени',
    });
  }

  return { photos, report, unused: leftovers.length };
}
