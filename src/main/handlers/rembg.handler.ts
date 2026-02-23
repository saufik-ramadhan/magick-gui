import { ipcMain, BrowserWindow, app } from 'electron'
import { spawn } from 'child_process'
import { basename, extname, join, dirname } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { resolveBin } from '../utils/bin-path'
import type { BgRemoveAiRequest, JobProgress, RembgCheckResult } from '../../types/ipc'

function runRembg(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''
    // Resolve bundled binary when packaged, fall back to system PATH in dev
    const bin = resolveBin('rembg')
    const proc = spawn(bin, args, { shell: false })
    proc.stdout.on('data', (d) => (stdout += d.toString()))
    proc.stderr.on('data', (d) => (stderr += d.toString()))
    proc.on('close', (code) => resolve({ stdout, stderr, code: code ?? 1 }))
    proc.on('error', () => resolve({ stdout, stderr: 'rembg not found', code: 127 }))
  })
}

function sanitize(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_')
}

export function registerRembgHandlers(mainWindow: BrowserWindow): void {
  // Check if rembg CLI is available
  ipcMain.handle('rembg:check', async (): Promise<RembgCheckResult> => {
    const binPath = resolveBin('rembg')

    // When packaged, the binary was bundled intentionally — just verify it exists.
    // Running the PyInstaller-compiled exe for --version is unreliable: it
    // self-extracts to %TEMP% on first run which can hang or time out.
    if (app.isPackaged) {
      if (existsSync(binPath)) {
        return { available: true, version: 'bundled' }
      }
      return { available: false, version: null }
    }

    // In dev: try running rembg --version (system PATH)
    const result = await runRembg(['--version'])
    if (result.code === 0) {
      const version = result.stdout.trim() || result.stderr.trim() || 'unknown'
      return { available: true, version }
    }
    // Also try via python -m rembg as fallback check
    const pyResult = await new Promise<{ code: number; stdout: string }>((resolve) => {
      const proc = spawn('python', ['-m', 'rembg', '--version'], { shell: false })
      let out = ''
      proc.stdout.on('data', (d) => (out += d.toString()))
      proc.stderr.on('data', (d) => (out += d.toString()))
      proc.on('close', (code) => resolve({ code: code ?? 1, stdout: out }))
      proc.on('error', () => resolve({ code: 127, stdout: '' }))
    })
    if (pyResult.code === 0) {
      return { available: true, version: pyResult.stdout.trim() || 'unknown' }
    }
    return { available: false, version: null }
  })

  // AI background removal using rembg CLI
  ipcMain.handle('rembg:process', async (_event, req: BgRemoveAiRequest): Promise<void> => {
    const { files, model, outputDir, suffix } = req
    const total = files.length

    for (let i = 0; i < total; i++) {
      const inputPath = files[i]
      const nameWithoutExt = basename(inputPath, extname(inputPath))
      const safeOutputDir = outputDir || dirname(inputPath)

      if (!existsSync(safeOutputDir)) mkdirSync(safeOutputDir, { recursive: true })

      const tag = suffix || 'nobg'
      // rembg always outputs PNG (transparent)
      const outputFilename = sanitize(`${nameWithoutExt}_${tag}.png`)
      const outputPath = join(safeOutputDir, outputFilename)

      const progress: JobProgress = {
        id: `ai-rmbg-${i}`,
        inputFile: inputPath,
        outputFile: outputPath,
        index: i,
        total,
        status: 'running',
        message: `AI removing background from ${basename(inputPath)}…`
      }
      mainWindow.webContents.send('magick:progress', progress)

      // rembg i [--model MODEL] input output
      const args = ['i', '--model', model || 'u2net', inputPath, outputPath]
      const result = await runRembg(args)

      // rembg exits 0 on success; stderr may have progress logs (not errors)
      const isSuccess = result.code === 0 && existsSync(outputPath)

      const done: JobProgress = {
        ...progress,
        status: isSuccess ? 'done' : 'error',
        message: isSuccess
          ? `Done: ${outputFilename}`
          : `Failed: ${(result.stderr || result.stdout).trim().split('\n').pop() || 'unknown error'}`
      }
      mainWindow.webContents.send('magick:progress', done)
    }
  })
}
