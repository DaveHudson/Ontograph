import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      openFile: () => Promise<{ filePath: string; content: string } | null>
      saveFile: (filePath: string, content: string) => Promise<boolean>
      saveFileAs: (content: string) => Promise<string | null>
      onMenuFileOpen: (callback: () => void) => () => void
      onMenuFileSave: (callback: () => void) => () => void
      onMenuFileSaveAs: (callback: () => void) => () => void
    }
  }
}
