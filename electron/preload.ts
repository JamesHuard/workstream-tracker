import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  chooseMarkdownFile: (defaultPath?: string): Promise<string | null> =>
    ipcRenderer.invoke('md:choose-file', defaultPath),
  writeMarkdownFile: (filePath: string, content: string): Promise<void> =>
    ipcRenderer.invoke('md:write-file', filePath, content),
})
