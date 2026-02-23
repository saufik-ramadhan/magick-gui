import { ipcMain, dialog } from 'electron'

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
}
