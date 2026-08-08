// Мост между окном и файловой системой. Окно не имеет прямого доступа к диску —
// только через этот перечень операций.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  chooseFolder:     ()            => ipcRenderer.invoke('choose-folder'),
  readFolder:       (dir)         => ipcRenderer.invoke('read-folder', dir),
  readDataFile:     (dir)         => ipcRenderer.invoke('read-data-file', dir),
  writeDataFile:    (dir, text)   => ipcRenderer.invoke('write-data-file', dir, text),
  saveCards:        (payload)     => ipcRenderer.invoke('save-cards', payload),
  openFolder:       (dir)         => ipcRenderer.invoke('open-folder', dir),
  listModelFolders: (root)        => ipcRenderer.invoke('list-model-folders', root),
  listBackgrounds:  ()            => ipcRenderer.invoke('list-backgrounds'),
  addBackground:    ()            => ipcRenderer.invoke('add-background'),
  openBackgrounds:  ()            => ipcRenderer.invoke('open-backgrounds-folder'),
  chooseCatalog:    ()            => ipcRenderer.invoke('choose-catalog'),
  importPhotos:     (dir)         => ipcRenderer.invoke('import-photos', dir),
  lastModel:        ()            => ipcRenderer.invoke('last-model'),
  rememberModel:    (dir)         => ipcRenderer.invoke('remember-model', dir),
  addPhoto:         (dir)         => ipcRenderer.invoke('add-photo', dir),

  // Библиотека моделей: каждая модель — своя папка с фото и настройками.
  listMyModels:     ()            => ipcRenderer.invoke('list-my-models'),
  createModel:      (name)        => ipcRenderer.invoke('create-model', name),
  duplicateModel:   (dir, name)   => ipcRenderer.invoke('duplicate-model', dir, name),
  deleteModel:      (dir)         => ipcRenderer.invoke('delete-model', dir),
  renameModel:      (dir, name)   => ipcRenderer.invoke('rename-model', dir, name),
  openLibrary:      ()            => ipcRenderer.invoke('open-library'),

  listIcons:        ()            => ipcRenderer.invoke('list-icons'),
  openIcons:        ()            => ipcRenderer.invoke('open-icons-folder'),

  // Команды из верхнего меню приложения.
  onMenu: (cb) => ipcRenderer.on('menu-action', (_e, action) => cb(action)),
});
