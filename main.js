const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const FFmpegService = require('./src/ffmpeg-service');

let mainWindow = null;
const ffmpegService = new FFmpegService();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 860,
    minWidth: 1000,
    minHeight: 720,
    title: 'Video & Audio Joiner & Compressor',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: '#0f1117',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('dialog:select-file', async (_event, { type }) => {
  const isVideo = type === 'video';
  const filters = isVideo
    ? [{ name: 'File Video', extensions: ['mp4', 'mov', 'mkv', 'avi', 'webm', 'm4v', 'ts'] }]
    : [{ name: 'File Audio', extensions: ['mp3', 'wav', 'aac', 'm4a', 'flac', 'ogg', 'aiff', 'opus', 'alac'] }];

  const result = await dialog.showOpenDialog(mainWindow, {
    title: isVideo ? 'Seleziona un file video' : 'Seleziona una traccia audio',
    properties: ['openFile'],
    filters
  });

  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  try {
    const probeData = await ffmpegService.probeFile(filePath);
    return { filePath, probeData };
  } catch (err) {
    throw new Error(`Errore durante la lettura del file: ${err.message}`);
  }
});

ipcMain.handle('media:probe', async (_event, filePath) => {
  return await ffmpegService.probeFile(filePath);
});

ipcMain.handle('dialog:select-output', async (_event, { defaultName = 'output_joined.mp4' }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Scegli destinazione video esportato',
    defaultPath: defaultName,
    filters: [
      { name: 'Video MP4 (*.mp4)', extensions: ['mp4'] },
      { name: 'Video MOV (*.mov)', extensions: ['mov'] },
      { name: 'Video MKV (*.mkv)', extensions: ['mkv'] },
      { name: 'Tutti i file', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return null;
  }
  return result.filePath;
});

ipcMain.handle('export:start', async (_event, config) => {
  try {
    const result = await ffmpegService.export(config, (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('export:progress', progress);
      }
    });
    return result;
  } catch (err) {
    throw new Error(err.message);
  }
});

ipcMain.handle('export:cancel', async () => {
  return ffmpegService.cancelExport();
});

ipcMain.handle('system:show-in-folder', async (_event, targetPath) => {
  if (targetPath) {
    shell.showItemInFolder(targetPath);
    return true;
  }
  return false;
});

ipcMain.handle('system:open-path', async (_event, targetPath) => {
  if (targetPath) {
    await shell.openPath(targetPath);
    return true;
  }
  return false;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
