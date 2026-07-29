// Главный процесс Electron: окно приложения и работа с файлами.
// Вся отрисовка карточек происходит в окне (renderer) на обычном canvas,
// поэтому нативных библиотек нет и .exe собирается без плясок с компиляцией.

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
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
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'ui', 'index.html'));
}

app.whenReady().then(() => {
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
