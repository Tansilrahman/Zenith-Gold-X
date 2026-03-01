// electron/main.js — Zenith Gold X Desktop App
import { app, BrowserWindow, shell, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
const BACKEND_PORT = 5005;
const FRONTEND_PORT = 5173;

let mainWindow;
let backendProcess;

// ── Start backend server ──────────────────────────────────────────────
function startBackend() {
    const backendPath = isDev
        ? path.join(__dirname, '../backend')
        : path.join(process.resourcesPath, 'backend');

    const serverFile = path.join(backendPath, 'server.js');
    if (!fs.existsSync(serverFile)) return;

    backendProcess = spawn('node', [serverFile], {
        cwd: backendPath,
        env: { ...process.env, PORT: BACKEND_PORT },
        stdio: 'pipe'
    });

    backendProcess.stdout.on('data', d => console.log('[BACKEND]', d.toString().trim()));
    backendProcess.stderr.on('data', d => console.error('[BACKEND ERR]', d.toString().trim()));
}

// ── Create main window ───────────────────────────────────────────────
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 375,
        minHeight: 600,
        title: 'Zenith Gold X™',
        icon: path.join(__dirname, '../frontend/public/logo.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true
        },
        backgroundColor: '#0a0a0f',
        show: false,
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
    });

    // Remove default menu in production
    if (!isDev) Menu.setApplicationMenu(null);

    // Load the app
    const url = isDev
        ? `http://localhost:${FRONTEND_PORT}`
        : `file://${path.join(__dirname, '../frontend/dist/index.html')}`;

    mainWindow.loadURL(url);

    // Show when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        if (isDev) mainWindow.webContents.openDevTools();
    });

    // Open external links in browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

// ── App lifecycle ────────────────────────────────────────────────────
app.whenReady().then(() => {
    startBackend();
    // Brief wait for backend to initialize
    setTimeout(createWindow, isDev ? 0 : 2000);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (backendProcess) backendProcess.kill();
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    if (backendProcess) backendProcess.kill();
});
