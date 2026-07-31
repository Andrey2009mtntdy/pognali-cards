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
        { label: 'Загрузить каталог моделей…', accelerator: 'CmdOrCtrl+O', click: () => tell('catalog') },
        { label: 'Добавить фон…', accelerator: 'CmdOrCtrl+Shift+O', click: () => tell('add-background') },
        { label: 'Открыть папку с фонами', click: () => tell('open-backgrounds') },
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

// ── Каталог моделей ──────────────────────────────────────────────────────────
// Один текстовый файл со всеми моделями: выбрал слева — все поля заполнились,
// остаётся подставить фотографии. Путь запоминается между запусками.

const settingsFile = () => path.join(app.getPath('userData'), 'настройки.json');

async function readSettings() {
  try { return JSON.parse(await fs.readFile(settingsFile(), 'utf8')); } catch { return {}; }
}

async function writeSettings(next) {
  try { await fs.writeFile(settingsFile(), JSON.stringify(next, null, 2), 'utf8'); } catch { /* не критично */ }
}

ipcMain.handle('choose-catalog', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Выбери файл каталога моделей',
    properties: ['openFile'],
    filters: [{ name: 'Каталог', extensions: ['txt'] }],
  });
  if (res.canceled || !res.filePaths.length) return null;

  const file = res.filePaths[0];
  const text = await fs.readFile(file, 'utf8');
  await writeSettings({ ...(await readSettings()), catalog: file });
  return { path: file, text };
});

// Каталог с прошлого запуска либо файл «каталог.txt» рядом с программой.
// PORTABLE_EXECUTABLE_DIR — папка, откуда пользователь запустил portable-exe;
// сам __dirname у portable-сборки указывает во временную распаковку, там искать
// нечего.
ipcMain.handle('load-catalog', async () => {
  const saved = (await readSettings()).catalog;
  const places = [
    saved,
    path.join(userDir(), 'каталог.txt'),
    path.join(app.getPath('userData'), 'каталог.txt'),
    path.join(path.dirname(app.getPath('exe')), 'каталог.txt'),
    path.join(process.cwd(), 'каталог.txt'),
    path.join(__dirname, 'модели', 'каталог.txt'),
  ].filter(Boolean);

  for (const file of places) {
    try { return { path: file, text: await fs.readFile(file, 'utf8') }; } catch { /* пробуем следующее */ }
  }

  // Ничего не нашлось — раскладываем образец в пользовательскую папку.
  // Тот, что внутри сборки, читается, но не правится: на macOS он лежит
  // внутри .app, а у portable-exe — во временной распаковке.
  try {
    const sample = await fs.readFile(path.join(__dirname, 'модели', 'каталог.txt'), 'utf8');
    const target = path.join(userDir(), 'каталог.txt');
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, sample, 'utf8');
    return { path: target, text: sample };
  } catch {
    return null;
  }
});
