const { app, BrowserWindow, Menu, session, powerSaveBlocker, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { autoUpdater } = require('electron-updater');

/** Store a user-chosen background video next to the app's settings. */
function registerVideoHandlers() {
  const mediaDir = path.join(app.getPath('userData'), 'media');

  ipcMain.handle('video:save', async (_event, { name, buffer }) => {
    fs.mkdirSync(mediaDir, { recursive: true });
    for (const old of fs.existsSync(mediaDir) ? fs.readdirSync(mediaDir) : []) {
      if (old.startsWith('background')) fs.rmSync(path.join(mediaDir, old), { force: true });
    }
    const ext = path.extname(name || '.mp4') || '.mp4';
    const target = path.join(mediaDir, `background${ext}`);
    fs.writeFileSync(target, Buffer.from(buffer));
    return `file://${target.replace(/\\/g, '/')}`;
  });

  ipcMain.handle('video:clear', async () => {
    if (fs.existsSync(mediaDir)) fs.rmSync(mediaDir, { recursive: true, force: true });
    return true;
  });
}

const isDev = !app.isPackaged && process.env.MENU_BOARD_DEV === '1';

/** Kiosk screens should never sleep. */
function keepAwake() {
  try {
    powerSaveBlocker.start('prevent-display-sleep');
  } catch {
    /* not fatal */
  }
}

/**
 * The board is offline apart from two things: the weather feed, and the
 * over-the-air update check. Everything else is blocked, so the app cannot
 * phone anywhere unexpected. Update traffic goes to GitHub Releases.
 */
const ALLOWED_HOSTS = ['api.open-meteo.com', 'geocoding-api.open-meteo.com'];
const ALLOWED_SUFFIXES = ['github.com', 'githubusercontent.com'];

function hostAllowed(hostname) {
  if (ALLOWED_HOSTS.includes(hostname)) return true;
  return ALLOWED_SUFFIXES.some((suffix) => hostname === suffix || hostname.endsWith('.' + suffix));
}

function lockDownNetwork() {
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const isHttp = details.url.startsWith('http://') || details.url.startsWith('https://');
    if (!isHttp) return callback({ cancel: false });

    if (isDev && details.url.startsWith('http://localhost:5173')) return callback({ cancel: false });

    let allowed = false;
    try {
      allowed = hostAllowed(new URL(details.url).hostname);
    } catch {
      allowed = false;
    }
    callback({ cancel: !allowed });
  });
}

/**
 * Over-the-air updates via GitHub Releases (configured in package.json > build >
 * publish). The board downloads a new version silently in the background and,
 * because a menu-board TV runs unattended, applies it during a quiet overnight
 * window - or immediately when someone clicks "Restart to update" in the
 * dashboard. Nothing here interrupts service during the day.
 */
let updateState = { status: 'idle', version: app.getVersion(), info: null };

function setUpdateState(patch) {
  updateState = { ...updateState, ...patch };
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('update:state', updateState);
  }
}

let pendingInstall = false;

function scheduleOvernightInstall() {
  // apply the downloaded update at ~4am local, when the restaurant is closed
  const check = () => {
    if (!pendingInstall) return;
    const now = new Date();
    if (now.getHours() === 4) {
      try {
        autoUpdater.quitAndInstall(true, true);
      } catch {
        /* will retry next window */
      }
    }
  };
  setInterval(check, 15 * 60 * 1000);
}

function setupUpdates() {
  if (!app.isPackaged) return; // updater only runs in the installed app

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => setUpdateState({ status: 'checking' }));
  autoUpdater.on('update-available', (info) =>
    setUpdateState({ status: 'downloading', info: { version: info?.version } })
  );
  autoUpdater.on('update-not-available', () => setUpdateState({ status: 'current' }));
  autoUpdater.on('download-progress', (p) =>
    setUpdateState({ status: 'downloading', percent: Math.round(p?.percent || 0) })
  );
  autoUpdater.on('update-downloaded', (info) => {
    pendingInstall = true;
    setUpdateState({ status: 'ready', info: { version: info?.version } });
  });
  autoUpdater.on('error', (err) => setUpdateState({ status: 'error', message: String(err) }));

  const check = () => autoUpdater.checkForUpdates().catch(() => undefined);
  setTimeout(check, 12 * 1000); // shortly after launch
  setInterval(check, 6 * 60 * 60 * 1000); // every 6 hours
  scheduleOvernightInstall();

  ipcMain.handle('update:check', () => check());
  ipcMain.handle('update:apply', () => {
    if (pendingInstall) autoUpdater.quitAndInstall(true, true);
  });
  ipcMain.handle('update:state', () => updateState);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false
    }
  });

  win.once('ready-to-show', () => {
    win.maximize();
    win.setFullScreen(true);
    win.show();
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Window controls by keyboard, so there's always a way out of fullscreen:
  //   F11 or Ctrl+F  -> toggle fullscreen
  //   Esc            -> leave fullscreen (never quits)
  //   Ctrl+M         -> minimize
  //   Ctrl+Shift+Q   -> quit the app
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const key = (input.key || '').toLowerCase();
    const ctrl = input.control || input.meta;

    if (key === 'f11' || (ctrl && key === 'f')) {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    } else if (key === 'escape' && win.isFullScreen()) {
      win.setFullScreen(false);
      event.preventDefault();
    } else if (ctrl && key === 'm') {
      win.minimize();
      event.preventDefault();
    } else if (ctrl && input.shift && key === 'q') {
      app.quit();
      event.preventDefault();
    }
  });

  // Window controls the dashboard can call
  ipcMain.removeHandler('window:minimize');
  ipcMain.removeHandler('window:toggleFullscreen');
  ipcMain.removeHandler('window:quit');
  ipcMain.handle('window:minimize', () => win.minimize());
  ipcMain.handle('window:toggleFullscreen', () => {
    win.setFullScreen(!win.isFullScreen());
    return win.isFullScreen();
  });
  ipcMain.handle('window:quit', () => app.quit());
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  lockDownNetwork();
  keepAwake();
  registerVideoHandlers();
  createWindow();
  setupUpdates();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
