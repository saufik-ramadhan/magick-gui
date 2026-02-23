import { contextBridge, ipcRenderer } from 'electron'
import type {
  ConvertRequest,
  CropRequest,
  WatermarkRequest,
  BgRemoveColorRequest,
  BgRemoveAiRequest,
  JobProgress,
  MagickCheckResult,
  RembgCheckResult
} from '../types/ipc'

// Expose a typed API to the renderer via window.magickAPI
const magickAPI = {
  // ImageMagick operations
  checkMagick: (): Promise<MagickCheckResult> => ipcRenderer.invoke('magick:check'),

  convertImages: (req: ConvertRequest): Promise<void> => ipcRenderer.invoke('magick:convert', req),

  cropImages: (req: CropRequest): Promise<void> => ipcRenderer.invoke('magick:crop', req),

  watermarkImages: (req: WatermarkRequest): Promise<void> => ipcRenderer.invoke('magick:watermark', req),

  // Background removal
  removeBgColor: (req: BgRemoveColorRequest): Promise<void> => ipcRenderer.invoke('magick:removebg-color', req),
  removeBgAi: (req: BgRemoveAiRequest): Promise<void> => ipcRenderer.invoke('rembg:process', req),
  checkRembg: (): Promise<RembgCheckResult> => ipcRenderer.invoke('rembg:check'),

  onProgress: (callback: (progress: JobProgress) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: JobProgress): void =>
      callback(progress)
    ipcRenderer.on('magick:progress', listener)
    // Return unsubscribe function
    return () => ipcRenderer.removeListener('magick:progress', listener)
  },

  // Dialog helpers
  openFiles: (options?: Electron.OpenDialogOptions): Promise<string[]> =>
    ipcRenderer.invoke('dialog:openFiles', options),

  openDirectory: (): Promise<string | null> => ipcRenderer.invoke('dialog:openDirectory')
}

contextBridge.exposeInMainWorld('magickAPI', magickAPI)

// TypeScript declaration for renderer
export type MagickAPI = typeof magickAPI
