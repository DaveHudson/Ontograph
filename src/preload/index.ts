import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  openFile: (): Promise<{ filePath: string; content: string } | null> =>
    ipcRenderer.invoke('file:open'),
  saveFile: (filePath: string, content: string): Promise<boolean> =>
    ipcRenderer.invoke('file:save', filePath, content),
  saveFileAs: (content: string): Promise<string | null> =>
    ipcRenderer.invoke('file:save-as', content),

  onMenuFileOpen: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('menu:file-open', handler)
    return () => ipcRenderer.removeListener('menu:file-open', handler)
  },
  onMenuFileSave: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('menu:file-save', handler)
    return () => ipcRenderer.removeListener('menu:file-save', handler)
  },
  onMenuFileSaveAs: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('menu:file-save-as', handler)
    return () => ipcRenderer.removeListener('menu:file-save-as', handler)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
