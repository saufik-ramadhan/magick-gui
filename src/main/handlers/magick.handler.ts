import { ipcMain, BrowserWindow } from 'electron'
import { spawn } from 'child_process'
import { basename, extname, join, dirname } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { resolveBin } from '../utils/bin-path'
import type {
  ConvertJob,
  CropJob,
  JobProgress,
  MagickCheckResult,
  ConvertRequest,
  CropRequest,
  WatermarkRequest,
  BgRemoveColorRequest
} from '../../types/ipc'

// ─── Utility ──────────────────────────────────────────────────────────────────

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_')
}

function runMagick(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''

    // Resolve bundled binary when packaged, fall back to system PATH in dev
    const bin = resolveBin('magick')
    const proc = spawn(bin, args, { shell: false })

    proc.stdout.on('data', (d) => (stdout += d.toString()))
    proc.stderr.on('data', (d) => (stderr += d.toString()))
    proc.on('close', (code) => resolve({ stdout, stderr, code: code ?? 1 }))
    proc.on('error', () => resolve({ stdout, stderr: 'magick not found', code: 127 }))
  })
}

// ─── Handler registration ──────────────────────────────────────────────────────

export function registerMagickHandlers(mainWindow: BrowserWindow): void {
  // Check if ImageMagick 7 is available
  ipcMain.handle('magick:check', async (): Promise<MagickCheckResult> => {
    const result = await runMagick(['--version'])
    if (result.code === 0 && result.stdout.toLowerCase().includes('imagemagick')) {
      const versionMatch = result.stdout.match(/Version:\s*ImageMagick\s*([\d.]+)/i)
      const version = versionMatch?.[1] ?? 'unknown'
      const isV7 = version.startsWith('7')
      return { available: true, version, isV7 }
    }
    return { available: false, version: null, isV7: false }
  })

  // ── Convert Images ─────────────────────────────────────────────────────────
  ipcMain.handle('magick:convert', async (_event, req: ConvertRequest): Promise<void> => {
    const { files, outputFormat, outputDir, quality, resizePercent } = req
    const total = files.length

    for (let i = 0; i < total; i++) {
      const inputPath = files[i]
      const nameWithoutExt = basename(inputPath, extname(inputPath))
      const safeOutputDir = outputDir || dirname(inputPath)

      // Ensure output directory exists
      if (!existsSync(safeOutputDir)) mkdirSync(safeOutputDir, { recursive: true })

      const outputFilename = sanitizeFilename(`${nameWithoutExt}.${outputFormat}`)
      const outputPath = join(safeOutputDir, outputFilename)

      const progress: JobProgress = {
        id: `convert-${i}`,
        inputFile: inputPath,
        outputFile: outputPath,
        index: i,
        total,
        status: 'running',
        message: `Converting ${basename(inputPath)} → ${outputFilename}`
      }

      mainWindow.webContents.send('magick:progress', progress)

      // Build magick args for format conversion
      const args: string[] = [inputPath]

      if (quality && ['jpg', 'jpeg', 'webp'].includes(outputFormat.toLowerCase())) {
        args.push('-quality', String(quality))
      }

      if (resizePercent && resizePercent !== 100) {
        args.push('-resize', `${resizePercent}%`)
      }

      // Strip metadata for cleaner output (optional but good practice)
      args.push('-strip')
      args.push(outputPath)

      const result = await runMagick(args)

      const done: JobProgress = {
        ...progress,
        status: result.code === 0 ? 'done' : 'error',
        message:
          result.code === 0
            ? `Done: ${outputFilename}`
            : `Failed: ${result.stderr.trim() || 'unknown error'}`
      }

      mainWindow.webContents.send('magick:progress', done)
    }
  })

  // ── Crop Images ────────────────────────────────────────────────────────────
  ipcMain.handle('magick:crop', async (_event, req: CropRequest): Promise<void> => {
    const { files, aspectRatio, gravity, outputDir, suffix } = req
    const total = files.length

    for (let i = 0; i < total; i++) {
      const inputPath = files[i]
      const ext = extname(inputPath)
      const nameWithoutExt = basename(inputPath, ext)
      const safeOutputDir = outputDir || dirname(inputPath)

      if (!existsSync(safeOutputDir)) mkdirSync(safeOutputDir, { recursive: true })

      const ratioLabel = aspectRatio.replace(':', 'x')
      const outputFilename = sanitizeFilename(`${nameWithoutExt}_${suffix || ratioLabel}${ext}`)
      const outputPath = join(safeOutputDir, outputFilename)

      const progress: JobProgress = {
        id: `crop-${i}`,
        inputFile: inputPath,
        outputFile: outputPath,
        index: i,
        total,
        status: 'running',
        message: `Cropping ${basename(inputPath)} to ${aspectRatio}`
      }

      mainWindow.webContents.send('magick:progress', progress)

      // Get image dimensions first
      const identifyResult = await runMagick(['identify', '-format', '%w %h', inputPath])

      if (identifyResult.code !== 0) {
        mainWindow.webContents.send('magick:progress', {
          ...progress,
          status: 'error',
          message: `Cannot read image: ${identifyResult.stderr.trim()}`
        })
        continue
      }

      const [wStr, hStr] = identifyResult.stdout.trim().split(' ')
      const srcW = parseInt(wStr, 10)
      const srcH = parseInt(hStr, 10)

      if (isNaN(srcW) || isNaN(srcH)) {
        mainWindow.webContents.send('magick:progress', {
          ...progress,
          status: 'error',
          message: `Could not parse image dimensions`
        })
        continue
      }

      // Calculate crop dimensions preserving aspect ratio
      const [rW, rH] = aspectRatio.split(':').map(Number)
      const targetRatio = rW / rH
      const srcRatio = srcW / srcH

      let cropW: number
      let cropH: number

      if (srcRatio > targetRatio) {
        // Image is wider than target — crop width
        cropH = srcH
        cropW = Math.round(cropH * targetRatio)
      } else {
        // Image is taller than target — crop height
        cropW = srcW
        cropH = Math.round(cropW / targetRatio)
      }

      // Gravity defines where to anchor the crop
      const gravityArg = gravity || 'Center'

      const args: string[] = [
        inputPath,
        '-gravity', gravityArg,
        '-crop', `${cropW}x${cropH}+0+0`,
        '+repage',
        outputPath
      ]

      const result = await runMagick(args)

      const done: JobProgress = {
        ...progress,
        status: result.code === 0 ? 'done' : 'error',
        message:
          result.code === 0
            ? `Done: ${outputFilename} (${cropW}×${cropH})`
            : `Failed: ${result.stderr.trim() || 'unknown error'}`
      }

      mainWindow.webContents.send('magick:progress', done)
    }
  })

  // ── Watermark Images ───────────────────────────────────────────────────────
  ipcMain.handle('magick:watermark', async (_event, req: WatermarkRequest): Promise<void> => {
    const { files, mode, text, image, outputDir, suffix } = req
    const total = files.length

    for (let i = 0; i < total; i++) {
      const inputPath = files[i]
      const ext = extname(inputPath)
      const nameWithoutExt = basename(inputPath, ext)
      const safeOutputDir = outputDir || dirname(inputPath)

      if (!existsSync(safeOutputDir)) mkdirSync(safeOutputDir, { recursive: true })

      const tag = suffix || (mode === 'text' ? 'watermarked' : 'logo')
      const outputFilename = sanitizeFilename(`${nameWithoutExt}_${tag}${ext}`)
      const outputPath = join(safeOutputDir, outputFilename)

      const progress: JobProgress = {
        id: `wm-${i}`,
        inputFile: inputPath,
        outputFile: outputPath,
        index: i,
        total,
        status: 'running',
        message: `Watermarking ${basename(inputPath)}`
      }
      mainWindow.webContents.send('magick:progress', progress)

      let args: string[]

      if (mode === 'text' && text) {
        // Build 8-digit hex color (#RRGGBBAA) — widely supported across all IM7 builds
        const hex = text.color.replace('#', '').padEnd(6, '0')
        const r = parseInt(hex.substring(0, 2), 16)
        const g = parseInt(hex.substring(2, 4), 16)
        const b = parseInt(hex.substring(4, 6), 16)
        const a = Math.round((text.opacity / 100) * 255)
        const fill =
          `#${r.toString(16).padStart(2, '0')}` +
          `${g.toString(16).padStart(2, '0')}` +
          `${b.toString(16).padStart(2, '0')}` +
          `${a.toString(16).padStart(2, '0')}`

        // Position is set via -gravity + -geometry; -annotate takes only rotation degrees + text
        args = [
          inputPath,
          '-gravity', text.gravity,
          '-geometry', `+${text.offsetX}+${text.offsetY}`,
          '-font', text.font || 'Arial',
          '-pointsize', String(text.pointSize),
          '-fill', fill,
          '-annotate', '0',
          text.text,
          outputPath
        ]
      } else if (mode === 'image' && image) {
        // Use -dissolve compose operator — no parentheses needed, simpler & reliable
        // Workflow: resize watermark, then composite over source with opacity
        const dissolveOpacity = String(image.opacity)
        const scaleArg = `${image.scale}%`

        args = [
          // Read source
          inputPath,
          // Read watermark, resize it relative to source width
          image.watermarkPath,
          '-resize', scaleArg,
          // Compose settings
          '-gravity', image.gravity,
          '-geometry', `+${image.offsetX}+${image.offsetY}`,
          '-define', `compose:args=${dissolveOpacity}`,
          '-compose', 'dissolve',
          '-composite',
          '+repage',
          outputPath
        ]
      } else {
        mainWindow.webContents.send('magick:progress', {
          ...progress,
          status: 'error',
          message: 'Invalid watermark configuration'
        })
        continue
      }

      const result = await runMagick(args)

      const done: JobProgress = {
        ...progress,
        status: result.code === 0 ? 'done' : 'error',
        message:
          result.code === 0
            ? `Done: ${outputFilename}`
            : `Failed: ${result.stderr.trim() || 'unknown error'}`
      }
      mainWindow.webContents.send('magick:progress', done)
    }
  })

  // ── Background Removal — Color / Fuzz method ─────────────────────────────
  ipcMain.handle('magick:removebg-color', async (_event, req: BgRemoveColorRequest): Promise<void> => {
    const { files, color, fuzz, floodfill, outputDir, suffix } = req
    const total = files.length

    for (let i = 0; i < total; i++) {
      const inputPath = files[i]
      const nameWithoutExt = basename(inputPath, extname(inputPath))
      const safeOutputDir = outputDir || dirname(inputPath)

      if (!existsSync(safeOutputDir)) mkdirSync(safeOutputDir, { recursive: true })

      const tag = suffix || 'nobg'
      // Always output PNG — only format that supports full alpha transparency
      const outputFilename = sanitizeFilename(`${nameWithoutExt}_${tag}.png`)
      const outputPath = join(safeOutputDir, outputFilename)

      const progress: JobProgress = {
        id: `rmbg-${i}`,
        inputFile: inputPath,
        outputFile: outputPath,
        index: i,
        total,
        status: 'running',
        message: `Removing background from ${basename(inputPath)}`
      }
      mainWindow.webContents.send('magick:progress', progress)

      let args: string[]

      if (floodfill) {
        // Flood-fill from all 4 corners — better for photos with complex edges
        // but solid-ish background color
        args = [
          inputPath,
          '-alpha', 'set',
          '-fuzz', `${fuzz}%`,
          '-draw', `color 0,0 floodfill`,
          '-draw', `color 0,99999 floodfill`,
          '-draw', `color 99999,0 floodfill`,
          '-draw', `color 99999,99999 floodfill`,
          outputPath
        ]
      } else {
        // Global transparent: replaces ALL pixels of target color in the entire image
        args = [
          inputPath,
          '-alpha', 'set',
          '-fuzz', `${fuzz}%`,
          '-transparent', color,
          outputPath
        ]
      }

      const result = await runMagick(args)

      const done: JobProgress = {
        ...progress,
        status: result.code === 0 ? 'done' : 'error',
        message:
          result.code === 0
            ? `Done: ${outputFilename}`
            : `Failed: ${result.stderr.trim() || 'unknown error'}`
      }
      mainWindow.webContents.send('magick:progress', done)
    }
  })
}
