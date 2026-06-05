import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Workstream Tracker',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // In dev mode VITE_DEV_SERVER_URL is set by vite-plugin-electron
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  // ── IPC handlers ────────────────────────────────────────────────────────
  ipcMain.handle('md:choose-file', async (_event, defaultPath?: string) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Choose Markdown save location',
      defaultPath: defaultPath ?? 'workstream-tracker.md',
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    })
    return canceled ? null : filePath
  })

  ipcMain.handle('md:write-file', async (_event, filePath: string, content: string) => {
    await fs.writeFile(filePath, content, 'utf8')
  })

  ipcMain.handle('md:open-file', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Load Workstream from Markdown',
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      properties: ['openFile'],
    })
    if (canceled || filePaths.length === 0) return null
    return await fs.readFile(filePaths[0], 'utf8')
  })

  // ── GitHub auth helpers ─────────────────────────────────────────────────
  ipcMain.handle('gh:detect-token', async () => {
    try {
      const hostsFile =
        process.platform === 'win32'
          ? path.join(process.env.APPDATA ?? os.homedir(), 'GitHub CLI', 'hosts.yml')
          : path.join(os.homedir(), '.config', 'gh', 'hosts.yml')
      const content = await fs.readFile(hostsFile, 'utf8')
      // The hosts.yml format has `oauth_token: gho_xxxx` under the github.com key
      const match = content.match(/oauth_token:\s*(\S+)/)
      return match ? match[1] : null
    } catch {
      return null
    }
  })

  ipcMain.handle('gh:open-url', async (_event, url: string) => {
    await shell.openExternal(url)
  })

  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
