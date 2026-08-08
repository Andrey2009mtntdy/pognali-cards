// Главный процесс Electron: окно приложения и работа с файлами.
// Вся отрисовка карточек происходит в окне (renderer) на обычном canvas,
// поэтому нативных библиотек нет и .exe собирается без плясок с компиляцией.

const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp']);

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#15171c',
    title: 'Карточки для маркетплейсов — Погнали РФ',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'ui', 'index.html'));
}

// ── Меню приложения ──────────────────────────────────────────────────────────
// Пункты меню ничего не делают сами: они шлют команду в окно, а там уже
// работают те же обработчики, что и у кнопок. Так поведение не разъезжается.
function tell(action) {
  win?.webContents.send('menu-action', action);
}

function buildMenu() {
  const template = [
    {
      label: 'Файл',
      submenu: [
        { label: 'Новая модель…', accelerator: 'CmdOrCtrl+N', click: () => tell('new-model') },
        { label: 'Открыть папку с моделями', click: () => tell('open-library') },
        { type: 'separator' },
        { label: 'Добавить фон…', accelerator: 'CmdOrCtrl+Shift+O', click: () => tell('add-background') },
        { label: 'Открыть папку с фонами', click: () => tell('open-backgrounds') },
        { label: 'Открыть папку со значками', click: () => tell('open-icons') },
        { type: 'separator' },
        { label: 'Выбрать папку с фото…', accelerator: 'CmdOrCtrl+D', click: () => tell('folder') },
        { label: 'Пакет: все папки…', accelerator: 'CmdOrCtrl+B', click: () => tell('batch') },
        { type: 'separator' },
        { label: 'Сохранить карточки', accelerator: 'CmdOrCtrl+S', click: () => tell('save') },
        { type: 'separator' },
        { role: 'quit', label: 'Выход' },
      ],
    },
    {
      label: 'Модели',
      submenu: [
        { label: 'Список моделей', accelerator: 'CmdOrCtrl+M', click: () => tell('drawer') },
      ],
    },
    {
      label: 'Вид',
      submenu: [
        { role: 'reload', label: 'Обновить окно' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Обычный масштаб' },
        { role: 'zoomIn', label: 'Крупнее' },
        { role: 'zoomOut', label: 'Мельче' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Полный экран' },
      ],
    },
    {
      label: 'Справка',
      submenu: [
        {
          label: 'Инструкция «ЧИТАТЬ МЕНЯ»',
          click: () => shell.openPath(path.join(__dirname, 'ЧИТАТЬ МЕНЯ.txt')),
        },
        {
          label: 'О программе',
          click: () => dialog.showMessageBox(win, {
            type: 'info',
            title: 'О программе',
            message: 'Карточки для маркетплейсов — Погнали РФ',
            detail: `Версия ${app.getVersion()}\nElectron ${process.versions.electron}`,
            buttons: ['Закрыть'],
          }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── Работа с папками и файлами ───────────────────────────────────────────────

// Выбор папки с фотографиями одной модели.
ipcMain.handle('choose-folder', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Выбери папку с фотографиями модели',
    properties: ['openDirectory'],
  });
  if (res.canceled || !res.filePaths.length) return null;
  return res.filePaths[0];
});

// Список картинок в папке — отдаём как data-URL, чтобы окно могло их рисовать.
ipcMain.handle('read-folder', async (_e, dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = entries
    .filter(e => e.isFile() && IMAGE_EXT.has(path.extname(e.name).toLowerCase()))
    .map(e => e.name)
    .sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }));

  const out = [];
  for (const name of files) {
    const buf = await fs.readFile(path.join(dir, name));
    const ext = path.extname(name).toLowerCase().replace('.', '');
    const mime = ext === 'jpg' ? 'jpeg' : ext;
    out.push({
      name,
      base: path.basename(name, path.extname(name)),
      dataUrl: `data:image/${mime};base64,${buf.toString('base64')}`,
    });
  }
  return out;
});

// Своё фото под конкретный слот. Файл копируем в папку модели: иначе при
// следующем открытии папки его там не будет и слот окажется пустым.
ipcMain.handle('add-photo', async (_e, dir) => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Выбери фото для слота',
    properties: ['openFile'],
    filters: [{ name: 'Картинки', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }],
  });
  if (res.canceled || !res.filePaths.length) return null;

  const src = res.filePaths[0];
  const ext = path.extname(src);
  const base = path.basename(src, ext);

  // Папки модели может не быть — тогда просто отдаём картинку в окно,
  // без копирования: слот заполнится, но привязка не переживёт перезапуск.
  const buf = await fs.readFile(src);
  const mime = ext.toLowerCase() === '.jpg' ? 'jpeg' : ext.toLowerCase().replace('.', '');
  const payload = {
    name: base + ext,
    base,
    dataUrl: `data:image/${mime};base64,${buf.toString('base64')}`,
    copied: false,
  };
  if (!dir) return payload;

  let target = path.join(dir, base + ext);
  for (let n = 2; await exists(target); n++) target = path.join(dir, `${base} (${n})${ext}`);
  await fs.copyFile(src, target);
  payload.name = path.basename(target);
  payload.base = path.basename(target, ext);
  payload.copied = true;
  return payload;
});

// Читаем данные.txt, если он лежит рядом с фото.
ipcMain.handle('read-data-file', async (_e, dir) => {
  for (const name of ['данные.txt', 'data.txt']) {
    try {
      return await fs.readFile(path.join(dir, name), 'utf8');
    } catch { /* нет — не страшно */ }
  }
  return null;
});

ipcMain.handle('write-data-file', async (_e, dir, text) => {
  await fs.writeFile(path.join(dir, 'данные.txt'), text, 'utf8');
  return true;
});

// Сохранение готовых карточек.
ipcMain.handle('save-cards', async (_e, { name, cards, targetDir }) => {
  let dir = targetDir;
  if (!dir) {
    const res = await dialog.showOpenDialog(win, {
      title: 'Куда сохранить карточки',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (res.canceled || !res.filePaths.length) return null;
    dir = res.filePaths[0];
  }

  const outDir = path.join(dir, name);
  await fs.mkdir(outDir, { recursive: true });

  const written = [];
  for (const card of cards) {
    // dataURL → файл. PNG без потерь: на карточке мелкий текст и тонкие линии.
    const base64 = card.dataUrl.split(',')[1];
    const file = path.join(outDir, card.filename);
    await fs.writeFile(file, Buffer.from(base64, 'base64'));
    written.push(file);
  }
  return { dir: outDir, files: written };
});

ipcMain.handle('open-folder', async (_e, dir) => {
  shell.openPath(dir);
});

// Пакетный режим: список подпапок, в каждой — своя модель.
ipcMain.handle('list-model-folders', async (_e, root) => {
  const entries = await fs.readdir(root, { withFileTypes: true });
  return entries.filter(e => e.isDirectory()).map(e => ({
    name: e.name,
    path: path.join(root, e.name),
  }));
});


// ── Мои модели ───────────────────────────────────────────────────────────────
// Библиотека моделей: у каждой своя папка рядом с программой. Внутри лежат
// «данные.txt» и все фотографии, поэтому модель полностью самодостаточна —
// открыл её в следующий раз, и всё на месте: тексты, фото, кадрирование.
function libraryDir() {
  return path.join(userDir(), 'Мои модели');
}

// Имя папки не должно ронять запись на диск: в Windows часть знаков запрещена.
function safeName(name) {
  return String(name || '').replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}

ipcMain.handle('list-my-models', async () => {
  const dir = libraryDir();
  await fs.mkdir(dir, { recursive: true });
  const entries = await fs.readdir(dir, { withFileTypes: true });

  const out = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const modelDir = path.join(dir, e.name);
    let photos = 0;
    let changed = 0;
    try {
      const files = await fs.readdir(modelDir, { withFileTypes: true });
      photos = files.filter(f => f.isFile() && IMAGE_EXT.has(path.extname(f.name).toLowerCase())).length;
      const st = await fs.stat(modelDir);
      changed = st.mtimeMs;
    } catch { /* папку могли удалить прямо сейчас */ }
    out.push({ name: e.name, path: modelDir, photos, changed });
  }
  out.sort((a, b) => b.changed - a.changed);
  return out;
});

ipcMain.handle('create-model', async (_e, name) => {
  const clean = safeName(name) || 'Новая модель';
  const dir = libraryDir();
  await fs.mkdir(dir, { recursive: true });

  // Одноимённую папку не перетираем: рядом появится «… (2)».
  let target = path.join(dir, clean);
  for (let n = 2; await exists(target); n++) target = path.join(dir, `${clean} (${n})`);
  await fs.mkdir(target, { recursive: true });
  return { name: path.basename(target), path: target };
});

ipcMain.handle('duplicate-model', async (_e, srcPath, newName) => {
  const dir = libraryDir();
  const clean = safeName(newName) || `${path.basename(srcPath)} копия`;
  let target = path.join(dir, clean);
  for (let n = 2; await exists(target); n++) target = path.join(dir, `${clean} (${n})`);

  // Копируем папку целиком: и данные, и фотографии — дубль сразу рабочий.
  await fs.cp(srcPath, target, { recursive: true });
  return { name: path.basename(target), path: target };
});

ipcMain.handle('delete-model', async (_e, modelPath) => {
  // Удаление необратимо, поэтому спрашиваем прямо здесь, у окна программы.
  const res = await dialog.showMessageBox(win, {
    type: 'warning',
    buttons: ['Удалить', 'Отмена'],
    defaultId: 1,
    cancelId: 1,
    message: `Удалить модель «${path.basename(modelPath)}»?`,
    detail: 'Папка со всеми фотографиями и настройками будет удалена безвозвратно.',
  });
  if (res.response !== 0) return false;

  await fs.rm(modelPath, { recursive: true, force: true });
  return true;
});

ipcMain.handle('rename-model', async (_e, modelPath, newName) => {
  const clean = safeName(newName);
  if (!clean) return null;
  const target = path.join(path.dirname(modelPath), clean);
  if (target === modelPath) return { name: clean, path: modelPath };
  if (await exists(target)) return null;
  await fs.rename(modelPath, target);
  return { name: clean, path: target };
});

ipcMain.handle('open-library', async () => {
  const dir = libraryDir();
  await fs.mkdir(dir, { recursive: true });
  shell.openPath(dir);
  return dir;
});

// ── Иконки-картинки ──────────────────────────────────────────────────────────
// Если в папке «иконки» лежит файл с именем характеристики, программа рисует
// его вместо своего векторного значка. Так можно подставить готовые иконки,
// не трогая код.
function iconDirs() {
  return [
    path.join(userDir(), 'иконки'),
    path.join(app.getPath('userData'), 'иконки'),
    path.join(path.dirname(app.getPath('exe')), 'иконки'),
    path.join(__dirname, 'шаблон', 'иконки'),
  ];
}

ipcMain.handle('list-icons', async () => {
  const seen = new Map();
  for (const dir of iconDirs()) {
    let entries = [];
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (!e.isFile() || !IMAGE_EXT.has(path.extname(e.name).toLowerCase())) continue;
      const key = path.basename(e.name, path.extname(e.name)).toLowerCase().trim();
      if (!seen.has(key)) seen.set(key, path.join(dir, e.name));
    }
  }
  const out = {};
  for (const [key, file] of seen) {
    const buf = await fs.readFile(file);
    const ext = path.extname(file).toLowerCase().replace('.', '');
    const mime = ext === 'jpg' ? 'jpeg' : ext;
    out[key] = `data:image/${mime};base64,${buf.toString('base64')}`;
  }
  return out;
});

ipcMain.handle('open-icons-folder', async () => {
  const dir = iconDirs()[0];
  await fs.mkdir(dir, { recursive: true });
  shell.openPath(dir);
  return dir;
});

// ── Подложки ─────────────────────────────────────────────────────────────────
// Картинки-фоны берём из папки «фоны». Сначала смотрим рядом с программой:
// туда пользователь может докладывать свои файлы, не пересобирая exe.
// Внутри сборки лежит комплектная папка — она же запасной вариант.
// Папка, куда программа складывает пользовательские файлы. На Windows у
// portable-сборки это папка рядом с exe — там их видно и легко подменить.
// На macOS внутрь .app писать нельзя, поэтому берём системную папку данных.
function userDir() {
  return process.env.PORTABLE_EXECUTABLE_DIR || app.getPath('userData');
}

function backgroundDirs() {
  return [
    path.join(userDir(), 'фоны'),
    path.join(app.getPath('userData'), 'фоны'),
    path.join(path.dirname(app.getPath('exe')), 'фоны'),
    path.join(__dirname, 'шаблон', 'фоны'),
  ];
}

// Куда класть добавленные фоны: всегда первая папка из списка — она заведомо
// доступна на запись, в отличие от внутренностей сборки.
function backgroundTargetDir() {
  return backgroundDirs()[0];
}

async function exists(file) {
  try { await fs.access(file); return true; } catch { return false; }
}

ipcMain.handle('list-backgrounds', async () => {
  const dirs = backgroundDirs();

  const seen = new Map();   // имя файла → путь; побеждает папка, найденная раньше
  for (const dir of dirs) {
    let entries = [];
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (!e.isFile() || !IMAGE_EXT.has(path.extname(e.name).toLowerCase())) continue;
      if (!seen.has(e.name)) seen.set(e.name, path.join(dir, e.name));
    }
  }

  const out = [];
  for (const [name, file] of seen) {
    const buf = await fs.readFile(file);
    const ext = path.extname(name).toLowerCase().replace('.', '');
    out.push({
      name,
      dataUrl: `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${buf.toString('base64')}`,
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  return out;
});

// Добавление своих подложек: копируем выбранные картинки в папку «фоны».
// Файл с таким же именем не затираем — дописываем номер, иначе можно молча
// потерять чужую картинку, которую пользователь туда положил раньше.
ipcMain.handle('add-background', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Выбери картинки для фона',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Картинки', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }],
  });
  if (res.canceled || !res.filePaths.length) return null;

  const dir = backgroundTargetDir();
  await fs.mkdir(dir, { recursive: true });

  const added = [];
  for (const src of res.filePaths) {
    const ext = path.extname(src);
    const base = path.basename(src, ext);
    let target = path.join(dir, base + ext);
    for (let n = 2; await exists(target); n++) target = path.join(dir, `${base} (${n})${ext}`);
    await fs.copyFile(src, target);
    added.push(path.basename(target));
  }
  return { dir, added };
});

ipcMain.handle('open-backgrounds-folder', async () => {
  const dir = backgroundTargetDir();
  await fs.mkdir(dir, { recursive: true });
  shell.openPath(dir);
  return dir;
});

// ── Настройки программы ──────────────────────────────────────────────────────
// Небольшой json рядом с данными: сейчас там только последняя открытая модель,
// чтобы при следующем запуске продолжить с того же места.

const settingsFile = () => path.join(app.getPath('userData'), 'настройки.json');

async function readSettings() {
  try { return JSON.parse(await fs.readFile(settingsFile(), 'utf8')); } catch { return {}; }
}

async function writeSettings(next) {
  try { await fs.writeFile(settingsFile(), JSON.stringify(next, null, 2), 'utf8'); } catch { /* не критично */ }
}

// Фотографии из чужой папки переносим внутрь модели. Раньше программа просто
// «переключалась» на ту папку, и работа уходила мимо библиотеки: модель
// оставалась пустой, а рядом с чужими фото появлялся ещё один данные.txt.
ipcMain.handle('import-photos', async (_e, targetDir) => {
  if (!targetDir) return null;
  const res = await dialog.showOpenDialog(win, {
    title: 'Папка с фотографиями этой модели',
    properties: ['openDirectory'],
  });
  if (res.canceled || !res.filePaths.length) return null;

  const src = res.filePaths[0];
  if (path.resolve(src) === path.resolve(targetDir)) return { added: 0, same: true };

  const entries = await fs.readdir(src, { withFileTypes: true });
  let added = 0;
  for (const e of entries) {
    if (!e.isFile() || !IMAGE_EXT.has(path.extname(e.name).toLowerCase())) continue;
    const ext = path.extname(e.name);
    const base = path.basename(e.name, ext);
    let target = path.join(targetDir, e.name);
    for (let n = 2; await exists(target); n++) target = path.join(targetDir, base + ` (` + n + `)` + ext);
    await fs.copyFile(path.join(src, e.name), target);
    added++;
  }
  return { added, from: src };
});

ipcMain.handle('last-model', async () => (await readSettings()).lastModel || null);

ipcMain.handle('remember-model', async (_e, dir) => {
  await writeSettings({ ...(await readSettings()), lastModel: dir });
  return true;
});