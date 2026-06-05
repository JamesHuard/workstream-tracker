// Type declaration for the contextBridge API injected by electron/preload.ts.
// This file is included automatically via tsconfig.app.json ("include": ["src"]).
export {}

declare global {
  interface Window {
    electronAPI?: {
      platform: string
      chooseMarkdownFile: (defaultPath?: string) => Promise<string | null>
      writeMarkdownFile: (filePath: string, content: string) => Promise<void>
      openMarkdownFile: () => Promise<string | null>
    }
  }
}
