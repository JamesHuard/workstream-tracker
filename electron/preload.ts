import { contextBridge } from 'electron'

// Expose a minimal read-only API to the renderer process.
// The app relies on localStorage (available natively in the renderer)
// so no IPC channels are required.
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
})
