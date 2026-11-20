const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');
const { execFile, spawn } = require('node:child_process');
const http = require('node:http');

const OLLAMA_URL = 'http://127.0.0.1:11434';
let mainWindow;

function requestJson(pathname, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${OLLAMA_URL}${pathname}`, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      timeout: options.timeout ?? 6000,
    }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let body;
        try { body = raw ? JSON.parse(raw) : {}; } catch { body = { raw }; }
        if (res.statusCode >= 400) reject(new Error(body.error || `Ollama returned ${res.statusCode}`));
        else resolve(body);
      });
    });
    req.on('timeout', () => req.destroy(new Error('Ollama request timed out')));
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

function ollamaBinary() {
  return process.platform === 'win32' ? 'ollama.exe' : 'ollama';
}

function checkOllamaInstalled() {
  return new Promise((resolve) => {
    execFile(ollamaBinary(), ['--version'], { windowsHide: true }, (error, stdout, stderr) => {
      resolve({ installed: !error, version: (stdout || stderr || '').trim() });
    });
  });
}

function startOllama() {
  return new Promise((resolve) => {
    const child = spawn(ollamaBinary(), ['serve'], { detached: true, stdio: 'ignore', windowsHide: true });
    child.once('error', (error) => resolve({ started: false, error: error.message }));
    child.unref();
    setTimeout(() => resolve({ started: true }), 700);
  });
}

function installOllama() {
  return new Promise((resolve, reject) => {
    const script = process.platform === 'win32'
      ? path.join(__dirname, '..', 'scripts', 'install-ollama.ps1')
      : process.platform === 'darwin'
        ? path.join(__dirname, '..', 'scripts', 'install-ollama-mac.sh')
        : path.join(__dirname, '..', 'scripts', 'install-ollama.sh');
    const command = process.platform === 'win32' ? 'powershell.exe' : 'bash';
    const args = process.platform === 'win32' ? ['-ExecutionPolicy', 'Bypass', '-File', script] : [script];
    execFile(command, args, { windowsHide: true, timeout: 180000 }, (error, stdout, stderr) => {
      if (error) reject(new Error((stderr || stdout || error.message).trim()));
      else resolve({ installed: true, output: stdout.trim() });
    });
  });
}

async function ensureOllama() {
  try { await requestJson('/api/tags'); return { online: true, installed: true }; }
  catch (_) {
    const install = await checkOllamaInstalled();
    if (!install.installed) return { online: false, installed: false, version: '' };
    try {
      await startOllama();
      await new Promise((r) => setTimeout(r, 900));
      await requestJson('/api/tags');
      return { online: true, installed: true, version: install.version };
    } catch (error) {
      return { online: false, installed: true, version: install.version, error: error.message };
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#0b0d10',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('ollama:status', () => ensureOllama());
ipcMain.handle('ollama:models', async () => {
  const data = await requestJson('/api/tags');
  return (data.models || []).map((model) => ({ name: model.name, size: model.size, modifiedAt: model.modified_at }));
});
ipcMain.handle('ollama:open-download', () => shell.openExternal('https://ollama.com/download'));
ipcMain.handle('ollama:install', () => installOllama());
ipcMain.handle('ollama:start', () => startOllama());
ipcMain.handle('ollama:chat', async (event, payload) => {
  const data = await requestJson('/api/chat', {
    method: 'POST',
    timeout: 300000,
    body: { model: payload.model, messages: payload.messages, stream: false, options: { temperature: 0.7 } },
  });
  return data.message || { role: 'assistant', content: '' };
});
