import { ipcMain, dialog } from 'electron'
import { existsSync, readFileSync } from 'node:fs'

const IMAGE_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'tif',
  'svg', 'avif', 'heic', 'heif', 'ico', 'psd', 'raw', 'cr2',
  'nef', 'arw', 'dng', 'orf', 'raf', 'rw2'
]

export function registerDialogHandlers(): void {
  ipcMain.handle('dialog:openFiles', async (_event, options?: Electron.OpenDialogOptions) => {
    const result = await dialog.showOpenDialog({
      title: 'Select Images',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Images',
          extensions: IMAGE_EXTENSIONS
        },
        { name: 'All Files', extensions: ['*'] }
      ],
      ...options
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Output Folder',
      properties: ['openDirectory', 'createDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  const IMAGE_DATA_URL_EXTS: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', webp: 'image/webp',
    gif: 'image/gif', bmp: 'image/bmp',
    avif: 'image/avif', tiff: 'image/tiff', tif: 'image/tiff'
  }

  ipcMain.handle('file:readAsDataUrl', async (_event, filePath: string): Promise<string | null> => {
    const ext = (filePath.split('.').pop() ?? '').toLowerCase()
    if (!IMAGE_DATA_URL_EXTS[ext]) return null
    if (!existsSync(filePath)) return null
    try {
      const data = readFileSync(filePath)
      return `data:${IMAGE_DATA_URL_EXTS[ext]};base64,${data.toString('base64')}`
    } catch {
      return null
    }
  })
}
