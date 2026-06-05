import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

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
    // 1. Try `gh auth token` — most reliable; works regardless of where
    //    hosts.yml lives and handles multi-account setups automatically.
    try {
      const ghBin = process.platform === 'win32' ? 'gh.exe' : 'gh'
      const { stdout } = await execFileAsync(ghBin, ['auth', 'token'], { timeout: 5000 })
      const token = stdout.trim()
      if (token) return token
    } catch {
      // gh not in PATH, not logged in, or too old to support `auth token`
    }

    // 2. Fall back to reading hosts.yml directly.
    //    On Windows check both APPDATA (Roaming) and LOCALAPPDATA so we cover
    //    all known gh CLI installation variants.
    const hostsFileCandidates: string[] =
      process.platform === 'win32'
        ? [
            path.join(process.env.APPDATA ?? os.homedir(), 'GitHub CLI', 'hosts.yml'),
            path.join(process.env.LOCALAPPDATA ?? os.homedir(), 'GitHub CLI', 'hosts.yml'),
          ]
        : [path.join(os.homedir(), '.config', 'gh', 'hosts.yml')]

    for (const hostsFile of hostsFileCandidates) {
      try {
        const content = await fs.readFile(hostsFile, 'utf8')
        // hosts.yml has `oauth_token: gho_xxxx` under the github.com key
        const match = content.match(/oauth_token:\s*(\S+)/)
        if (match) return match[1]
      } catch {
        // file not found or unreadable; try next candidate
      }
    }

    return null
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
