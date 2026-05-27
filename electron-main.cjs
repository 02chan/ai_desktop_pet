const { app, BrowserWindow, screen, ipcMain, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = !app.isPackaged;
const { spawn } = require('child_process');

// Global error logger to capture any packaged app crash
const logFile = path.join(app.getPath('userData'), 'deskpet-error.log');
function logError(message, error) {
  const time = new Date().toISOString();
  const logMessage = `[${time}] ${message}\n${error && error.stack ? error.stack : error}\n\n`;
  try {
    fs.appendFileSync(logFile, logMessage);
  } catch (e) {
    // Ignore logging failures
  }
}

process.on('uncaughtException', (error) => {
  logError('Uncaught Exception in Main Process', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logError('Unhandled Rejection in Main Process', reason);
});

const appId = 'com.desktop.pet';
try {
  app.setAppUserModelId(appId);
} catch (error) {
  // Windows에서 앱 아이디 설정이 실패하더라도 계속 실행
}

let petWindow;
let serverProcess = null;
let calendarWindow;
let tray = null;

function isWindowVisible(win) {
  return Boolean(win && !win.isDestroyed() && win.isVisible());
}

function togglePetWindow() {
  if (!petWindow || petWindow.isDestroyed()) return;
  if (isWindowVisible(petWindow)) {
    petWindow.hide();
  } else {
    petWindow.show();
    petWindow.focus();
    petWindow.setIgnoreMouseEvents(true, { forward: true });
  }
}

function toggleCalendarWindow() {
  if (!calendarWindow || calendarWindow.isDestroyed()) return;
  if (isWindowVisible(calendarWindow)) {
    calendarWindow.hide();
  } else {
    calendarWindow.show();
    calendarWindow.focus();
    calendarWindow.setIgnoreMouseEvents(true, { forward: true });
  }
}

function getTrayIcon() {
  return nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAQCAYAAADJViUEAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBwYWludC5uZXQgNC4yLjE6YxVVwQAAAGZJREFUOE9jZKAQMGL4z0AEYGBgYGJgYGBgYFBgYGJgYGBgYGAAAAAP//AwD//wMAQBo3GSYAAAAASUVORK5CYII='
  ).resize({ width: 16, height: 16 });
}

function updateTrayMenu() {
  if (!tray) return;

  const menu = Menu.buildFromTemplate([
    {
      label: isWindowVisible(petWindow) ? 'Hide DeskPet' : 'Show DeskPet',
      click: () => {
        togglePetWindow();
        updateTrayMenu();
      },
    },
    {
      label: isWindowVisible(calendarWindow) ? 'Hide Calendar' : 'Show Calendar',
      click: () => {
        toggleCalendarWindow();
        updateTrayMenu();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
  tray.setToolTip('AI DeskPet');
}

function createTray() {
  if (tray) return;

  tray = new Tray(getTrayIcon());
  tray.on('click', () => {
    togglePetWindow();
    updateTrayMenu();
  });
  tray.on('double-click', () => {
    togglePetWindow();
    updateTrayMenu();
  });

  updateTrayMenu();
}

function startServer() {
  // 개발 모드에서는 이미 npm run dev로 서버 실행 중
  if (!app.isPackaged) return;

  // Set NODE_ENV to production explicitly so server.cjs knows it's fully in production
  process.env.NODE_ENV = 'production';

  const serverPath = path.join(process.resourcesPath, 'server.cjs');
  console.log('Loading packaged server from:', serverPath);

  try {
    // Attempt to require the server in-process (extremely reliable, requires no global node installation!)
    require(serverPath);
    console.log('Server loaded successfully in-process');
  } catch (err) {
    console.error('Failed to run server in-process, trying spawn fallback:', err);
    logError('In-process server load failed, falling back to spawn', err);
    try {
      serverProcess = spawn('node', [serverPath], {
        detached: false,
        stdio: 'ignore'
      });
      serverProcess.on('error', (spawnErr) => {
        console.error('Spawn server process failed:', spawnErr);
        logError('Spawn server process error event', spawnErr);
      });
      serverProcess.unref();
    } catch (spawnErr) {
      console.error('Fatal spawn server error:', spawnErr);
      logError('Fatal spawn server failure', spawnErr);
    }
  }
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  petWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    focusable: true,
  });

  const indexPath = path.join(__dirname, 'dist', 'index.html');

  if (isDev) {
    petWindow.loadURL('http://localhost:3000');
  } else {
    petWindow.loadFile(indexPath);
  }

  petWindow.once('ready-to-show', () => {
    if (petWindow) {
      petWindow.show();
      petWindow.focus();
    }
  });

  petWindow.webContents.once('did-finish-load', () => {
    if (petWindow) {
      petWindow.setIgnoreMouseEvents(true, { forward: true });
    }
  });

  petWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('Pet window failed to load:', errorCode, errorDescription, validatedURL);
    if (petWindow && !petWindow.isVisible()) {
      petWindow.show();
      petWindow.focus();
    }
  });

  setTimeout(() => {
    if (petWindow && !petWindow.isVisible()) {
      petWindow.show();
      petWindow.focus();
    }
  }, 3000);

  if (isDev) {
    // 개발자 도구는 필요할 때만 켜세요.
    // win.webContents.openDevTools({ mode: 'detach' });
  }
  petWindow.setVisibleOnAllWorkspaces(true);
}

function createCalendarWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  calendarWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    show: false,
    backgroundColor: '#00000000',

    transparent: true,
    frame: false,

    resizable: false,
    skipTaskbar: true,

    focusable: true,

    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    }
  });

  const indexPath = path.join(__dirname, 'dist', 'index.html');

  if (isDev) {
    calendarWindow.loadURL('http://localhost:3000/#/calendar');
  } else {
    calendarWindow.loadFile(indexPath, {
      hash: '/calendar',
    });
  }

  calendarWindow.webContents.once('did-finish-load', () => {
    if (calendarWindow) {
      calendarWindow.setIgnoreMouseEvents(true, { forward: true });
    }
  });

  calendarWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('Calendar window failed to load:', errorCode, errorDescription, validatedURL);
  });

  calendarWindow.setVisibleOnAllWorkspaces(true);
  calendarWindow.setAlwaysOnTop(false);
}

ipcMain.on('pet-hover', () => {
  if (petWindow) {
    petWindow.setIgnoreMouseEvents(false);
  }
});

ipcMain.on('pet-leave', () => {
  if (petWindow) {
    petWindow.setIgnoreMouseEvents(true, { forward: true });
  }
});

ipcMain.on('calendar-hover', () => {
  if (calendarWindow) {
    calendarWindow.setIgnoreMouseEvents(false);
  }
});

ipcMain.on('calendar-leave', () => {
  if (calendarWindow) {
    calendarWindow.setIgnoreMouseEvents(true, { forward: true });
  }
});

ipcMain.on('calendar-show', () => {
  if (calendarWindow && !calendarWindow.isDestroyed()) {
    calendarWindow.show();
    calendarWindow.focus();
    updateTrayMenu();
  }
});

ipcMain.on('calendar-hide', () => {
  if (calendarWindow && !calendarWindow.isDestroyed()) {
    calendarWindow.hide();
    updateTrayMenu();
  }
});

ipcMain.on('calendar-close', () => {
  if (calendarWindow && !calendarWindow.isDestroyed()) {
    calendarWindow.hide();
    updateTrayMenu();
  }
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.webContents.send('calendar-closed-external');
  }
});

app.whenReady().then(async () => {
  if (!isDev) {
    try {
      app.setLoginItemSettings({
        openAtLogin: true,
        path: app.getPath('exe'),
        name: 'AI DeskPet',
      });
    } catch (err) {
      console.error('Failed to set login item settings:', err);
      logError('Failed to set login item settings (openAtLogin)', err);
    }
  }

  try {
    startServer();
  } catch (err) {
    console.error('Failed to start server:', err);
    logError('Failed to start server', err);
  }

  try {
    createWindow();
  } catch (err) {
    console.error('Failed to create main window:', err);
    logError('Failed to create main window', err);
  }

  try {
    createCalendarWindow();
  } catch (err) {
    console.error('Failed to create calendar window:', err);
    logError('Failed to create calendar window', err);
  }

  try {
    createTray();
  } catch (err) {
    console.error('Failed to create tray:', err);
    logError('Failed to create tray', err);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
