import type { ConvertRequest, CropRequest, WatermarkRequest, BgRemoveColorRequest, BgRemoveAiRequest, MagickCheckResult, RembgCheckResult, JobProgress } from '../../../types/ipc'

interface MagickAPI {
  checkMagick(): Promise<MagickCheckResult>
  convertImages(req: ConvertRequest): Promise<void>
  cropImages(req: CropRequest): Promise<void>
  watermarkImages(req: WatermarkRequest): Promise<void>
  removeBgColor(req: BgRemoveColorRequest): Promise<void>
  removeBgAi(req: BgRemoveAiRequest): Promise<void>
  checkRembg(): Promise<RembgCheckResult>
  onProgress(callback: (progress: JobProgress) => void): () => void
  openFiles(options?: { title?: string }): Promise<string[]>
  openDirectory(): Promise<string | null>
}

declare global {
  interface Window {
    magickAPI: MagickAPI
  }
}

export {}
