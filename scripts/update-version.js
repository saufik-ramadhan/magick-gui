/**
 * update-version.js
 *
 * Automatically called by the npm "version" lifecycle hook after
 * `npm version <patch|minor|major>` bumps package.json.
 *
 * Updates all version references in docs/index.html so they stay
 * in sync with package.json.
 *
 * Usage (not called directly):
 *   npm version patch   → triggers this script automatically
 *   npm run release:patch → full flow: version + commit + tag + push
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const PKG_PATH = path.join(ROOT, 'package.json')
const DOCS_PATH = path.join(ROOT, 'docs', 'index.html')

const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'))
const version = pkg.version

let html = fs.readFileSync(DOCS_PATH, 'utf8')

// 1. Download URLs: releases/download/X.X.X/MagickGUI-X.X.X-Setup.exe
html = html.replace(
  /releases\/download\/\d+\.\d+\.\d+\/MagickGUI-\d+\.\d+\.\d+-Setup\.exe/g,
  `releases/download/${version}/MagickGUI-${version}-Setup.exe`
)

// 2. Hero version note: "v1.1.1"
html = html.replace(
  /v\d+\.\d+\.\d+/g,
  `v${version}`
)

// 3. Install step text: "MagickGUI Setup 1.0.0.exe"
html = html.replace(
  /MagickGUI Setup \d+\.\d+\.\d+\.exe/g,
  `MagickGUI Setup ${version}.exe`
)

// 4. Download button text: "Download v1.0.0"
html = html.replace(
  /Download v\d+\.\d+\.\d+/g,
  `Download v${version}`
)

fs.writeFileSync(DOCS_PATH, html, 'utf8')
console.log(`  ✔ docs/index.html → version ${version}`)
