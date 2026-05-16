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
  // In dev, check if the binary already exists in resources/bin (after
  // running prepare-resources) before falling back to system PATH.
  // app.getAppPath() reliably returns the project root in dev mode (where
  // package.json lives) without depending on __dirname navigation.
  const projectRoot = app.isPackaged ? null : app.getAppPath()

  const candidates: string[] = []

  if (app.isPackaged) {
    if (process.platform === 'win32') {
      candidates.push(
        join(process.resourcesPath, 'bin', name, `${name}.exe`),
        join(process.resourcesPath, 'bin', `${name}.exe`)
      )
    } else {
      candidates.push(
        join(process.resourcesPath, 'bin', name, name),
        join(process.resourcesPath, 'bin', name)
      )
    }
  } else if (projectRoot) {
    // Dev: prefer the downloaded portable binary in resources/bin
    candidates.push(
      join(projectRoot, 'resources', 'bin', name, `${name}.exe`),
      join(projectRoot, 'resources', 'bin', name, name)
    )
  }

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }

  // Last resort — hope it's on system PATH (shows a meaningful error if not)
  return name
}
