# MagickGUI

A desktop GUI for [ImageMagick 7](https://imagemagick.org) built with Electron, React, and TypeScript. Batch-process images with a clean dark UI — no command line required.

## Features

| Panel | What it does |
|---|---|
| **Convert** | Convert between JPEG, PNG, WebP, AVIF, GIF, BMP, TIFF, ICO, PDF. Set quality and resize percentage. |
| **Crop** | Crop to a preset aspect ratio (1:1, 4:3, 16:9, 3:2, 9:16, 21:9 …) with gravity control. |
| **Watermark** | Overlay a text or image watermark. Control position, opacity, font, size, and colour. |
| **BG Remove** | Remove backgrounds via colour/flood-fill (ImageMagick) or AI (rembg). |

All panels support **batch processing** with a drag-and-drop file queue and a live job-progress list.

### AI Background Removal — rembg models

| Group | Model | Size | Best for |
|---|---|---|---|
| BiRefNet · MIT | `birefnet-general` ⭐ | ~350 MB | General subjects |
| BiRefNet · MIT | `birefnet-general-lite` | ~100 MB | Speed / light weight |
| BiRefNet · MIT | `birefnet-portrait` | ~350 MB | People & selfies |
| BiRefNet · MIT | `birefnet-dis` | ~350 MB | Product shots |
| BiRefNet · MIT | `birefnet-hrsod` | ~350 MB | High-resolution subjects |
| U2Net · Legacy | `u2net` | ~170 MB | Classic all-around |
| U2Net · Legacy | `u2net_human_seg` | ~170 MB | Portraits |
| U2Net · Legacy | `isnet-general-use` | ~170 MB | High edge detail |
| U2Net · Legacy | `silueta` | ~45 MB | Simple objects, fastest |

Models are downloaded automatically by rembg on first use and cached in `%USERPROFILE%\.u2net`.

---

## Tech Stack

| Layer | Library | Version |
|---|---|---|
| App shell | Electron | 33 |
| Build/dev server | electron-vite | 3 |
| UI framework | React | 18 |
| Language | TypeScript | 5.7 |
| Styling | Tailwind CSS | 3.4 |
| Image processing | ImageMagick 7 (bundled) | 7.1.2 |
| AI bg removal | rembg + ONNX Runtime (bundled) | 2.0 |
| Installer | electron-builder / NSIS | 25 |

---

## Project Structure

```
magick-gui/
├── src/
│   ├── main/                  # Electron main process
│   │   ├── index.ts           # App entry, window creation
│   │   ├── handlers/          # IPC handlers (convert, crop, watermark, rembg)
│   │   └── utils/
│   │       └── bin-path.ts    # Resolves bundled vs. system binary paths
│   ├── preload/               # Context bridge (exposes window.magickAPI)
│   ├── renderer/              # React app
│   │   └── src/
│   │       └── components/
│   │           ├── ConvertPanel.tsx
│   │           ├── CropPanel.tsx
│   │           ├── WatermarkPanel.tsx
│   │           ├── BgRemovePanel.tsx
│   │           ├── Sidebar.tsx
│   │           ├── FileDropZone.tsx
│   │           ├── JobList.tsx
│   │           ├── OutputDirPicker.tsx
│   │           └── StatusBar.tsx
│   └── types/
│       └── ipc.ts             # Shared IPC request/response types
├── resources/
│   └── bin/
│       ├── magick/            # ImageMagick 7 portable (git-ignored, built by script)
│       └── rembg/             # rembg.exe PyInstaller bundle (git-ignored, built by script)
├── scripts/
│   ├── prepare-resources.ps1  # Downloads ImageMagick + builds rembg.exe
│   └── rembg_entry.py         # PyInstaller entry point for rembg
├── build/                     # App icons (icon.ico, icon.icns, icon.png)
├── package.json
├── electron.vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## Development Setup

### Prerequisites

- **Node.js** 18 or later
- **npm** 9 or later
- **Windows** (the bundling scripts are PowerShell; ImageMagick must be on `PATH` for dev mode, or download with the prepare script)

### Install dependencies

```bash
npm install
```

### Run in development mode

```bash
npm run dev
```

Starts electron-vite with HMR. The app uses the system `magick` and `rembg` binaries in dev mode (they must be on your `PATH`).

---

## Building the Installer

### Step 1 — Download/build binary resources (once)

```powershell
npm run prepare-resources
```

This PowerShell script:
1. Downloads the latest **ImageMagick 7 portable Q16 x64** `.7z` from imagemagick.org and extracts it to `resources/bin/magick/`.
2. Creates an isolated **Python 3.11** virtual environment, installs `rembg[cli,cpu]` and `PyInstaller`, then compiles `rembg.exe` (~127 MB) into `resources/bin/rembg/`.

> **Python requirement:** Python **3.10, 3.11, or 3.12** must be installed. Python 3.14+ is not supported because onnxruntime's PyInstaller hooks require an older ABI. Install Python 3.11 via `winget install Python.Python.3.11`.

### Step 2 — Build the installer

```powershell
npm run package
```

Produces `dist/MagickGUI Setup 1.0.0.exe` (NSIS installer, ~268 MB).

### All-in-one

```powershell
npm run package:full
```

Runs `prepare-resources` + `build` + `package` in sequence.

---

## npm Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Compile renderer + main (production) |
| `npm run preview` | Preview the production build |
| `npm run lint` | TypeScript type-check (`tsc --noEmit`) |
| `npm run prepare-resources` | Download ImageMagick + build rembg.exe |
| `npm run package` | Build Electron app + produce NSIS installer |
| `npm run package:full` | prepare-resources + package in one step |

---

## How Binary Paths Work

In **development**, the app resolves `magick` and `rembg` from the system `PATH`.

In **production** (packaged), `src/main/utils/bin-path.ts` resolves each binary from the bundled `resources/` directory:

```
<install>/resources/bin/magick/magick.exe
<install>/resources/bin/rembg/rembg.exe
```

`rembg:check` uses `existsSync` on the resolved path instead of running the binary, so the UI detects the bundled exe reliably even when it's a large self-extracting archive.

---

## License

MIT
