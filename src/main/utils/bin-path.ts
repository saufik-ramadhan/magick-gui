import { app } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * Returns the path to a bundled binary when the app is packaged,
 * or falls back to the system PATH name in development.
 *
 * Bundled layout (inside the installer's resources/ folder):
 *   resources/bin/magick/magick.exe   ← ImageMagick 7 portable
 *   resources/bin/rembg/rembg.exe     ← rembg compiled by PyInstaller
 */
export function resolveBin(name: 'magick' | 'rembg'): string {
  if (!app.isPackaged) {
    // In dev, assume tool is on system PATH
    return name
  }

  const candidates: string[] = []

  if (process.platform === 'win32') {
    candidates.push(
      join(process.resourcesPath, 'bin', name, `${name}.exe`),
      // Flat layout fallback
      join(process.resourcesPath, 'bin', `${name}.exe`)
    )
  } else {
    candidates.push(
      join(process.resourcesPath, 'bin', name, name),
      join(process.resourcesPath, 'bin', name)
    )
  }

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }

  // Last resort — hope it's on PATH (shows a meaningful error if it isn't)
  return name
}
