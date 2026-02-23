export type JobStatus = 'pending' | 'running' | 'done' | 'error'

export interface JobProgress {
  id: string
  inputFile: string
  outputFile: string
  index: number
  total: number
  status: JobStatus
  message: string
}

export interface ConvertRequest {
  files: string[]
  outputFormat: string
  outputDir: string | null
  quality?: number
  resizePercent?: number
}

export interface CropRequest {
  files: string[]
  aspectRatio: string // e.g. "16:9"
  gravity?: string    // e.g. "Center" | "North" | "South"
  outputDir: string | null
  suffix?: string
}

export interface MagickCheckResult {
  available: boolean
  version: string | null
  isV7: boolean
}

export interface ConvertJob {
  inputPath: string
  outputPath: string
}

export interface CropJob {
  inputPath: string
  outputPath: string
  cropWidth: number
  cropHeight: number
}

// ─── Watermark ────────────────────────────────────────────────────────────────

export type WatermarkMode = 'text' | 'image'

export interface WatermarkTextOptions {
  text: string
  font: string          // system font name e.g. "Arial"
  pointSize: number     // font size in pt
  color: string         // hex color e.g. "#ffffff"
  opacity: number       // 0–100
  gravity: string       // "Center" | "SouthEast" etc.
  offsetX: number
  offsetY: number
}

export interface WatermarkImageOptions {
  watermarkPath: string
  opacity: number       // 0–100
  scale: number         // % of source width to scale watermark to
  gravity: string
  offsetX: number
  offsetY: number
}

export interface WatermarkRequest {
  files: string[]
  mode: WatermarkMode
  text?: WatermarkTextOptions
  image?: WatermarkImageOptions
  outputDir: string | null
  suffix?: string
}

// ─── Background Removal ───────────────────────────────────────────────────────

export type BgRemoveMode = 'color' | 'ai'

export interface BgRemoveColorRequest {
  files: string[]
  /** Hex color to make transparent e.g. "#ffffff" */
  color: string
  /** Fuzz tolerance 0–100 (%) — how much color variation is included */
  fuzz: number
  /** If true, applies flood-fill from all 4 corners instead of global replace */
  floodfill: boolean
  outputDir: string | null
  suffix?: string
}

export interface BgRemoveAiRequest {
  files: string[]
  /** rembg model: u2net | u2net_human_seg | isnet-general-use */
  model: string
  outputDir: string | null
  suffix?: string
}

export interface RembgCheckResult {
  available: boolean
  version: string | null
}
