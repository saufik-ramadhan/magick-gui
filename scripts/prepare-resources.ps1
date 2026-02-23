# MagickGUI - Resource Preparation Script
# Downloads ImageMagick 7 portable + builds rembg with PyInstaller
# Run once before packaging: npm run prepare-resources
#
# Requirements:
#   - Internet connection (to download ImageMagick)
#   - Python 3.8+ with pip  (for rembg)
#   - PyInstaller             (installed by this script)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ROOT = Split-Path $PSScriptRoot -Parent
$BIN_DIR = Join-Path $ROOT "resources\bin"

# Helpers
function Write-Step {
    param([string]$msg)
    Write-Host "`n==> $msg" -ForegroundColor Cyan
}
function Write-OK {
    param([string]$msg)
    Write-Host "    OK  $msg" -ForegroundColor Green
}
function Write-Warn {
    param([string]$msg)
    Write-Host "    WARN $msg" -ForegroundColor Yellow
}
function Write-Fail {
    param([string]$msg)
    Write-Host "    FAIL $msg" -ForegroundColor Red
}

# Step 1: ImageMagick 7 Portable

Write-Step "Checking for ImageMagick portable binaries"

$MAGICK_DIR = Join-Path $BIN_DIR "magick"
$MAGICK_EXE = Join-Path $MAGICK_DIR "magick.exe"

if (Test-Path $MAGICK_EXE) {
    Write-OK "magick.exe already present - skipping download"
} else {
    Write-Step "Discovering latest ImageMagick 7 portable x64 Q16 download URL"

    # Dynamically find the latest portable .7z from the official download page
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $downloadPage = Invoke-WebRequest -Uri "https://imagemagick.org/script/download.php" -UseBasicParsing
    $pattern = 'ImageMagick-[\d.]+-\d+-portable-Q16-x64\.7z'
    $fileName = ([regex]::Matches($downloadPage.Content, $pattern) | Select-Object -ExpandProperty Value | Sort-Object -Descending | Select-Object -First 1)
    if (-not $fileName) {
        Write-Fail "Could not find portable Q16 x64 .7z on the download page. Check https://imagemagick.org/script/download.php#windows"
        exit 1
    }
    $IM_URL = "https://imagemagick.org/archive/binaries/$fileName"
    Write-OK "Found: $fileName"

    $ARCHIVE_PATH = Join-Path $env:TEMP "ImageMagick-portable.7z"
    $EXTRACT_TMP  = Join-Path $env:TEMP "ImageMagick-portable"

    Write-Host "    Downloading $IM_URL ..."
    Invoke-WebRequest -Uri $IM_URL -OutFile $ARCHIVE_PATH -UseBasicParsing

    # Find or obtain 7-Zip to extract the .7z archive
    $7ZA = $null
    $cmd7z = Get-Command "7z.exe" -ErrorAction SilentlyContinue
    if ($cmd7z) { $7ZA = $cmd7z.Source }
    if (-not $7ZA) {
        $cmd7za = Get-Command "7za.exe" -ErrorAction SilentlyContinue
        if ($cmd7za) { $7ZA = $cmd7za.Source }
    }
    if (-not $7ZA) {
        # Download standalone 7za.exe (public domain, ~500 KB)
        Write-Host "    7-Zip not found — downloading standalone 7za.exe..."
        $7ZA = Join-Path $env:TEMP "7za.exe"
        Invoke-WebRequest -Uri "https://7-zip.org/a/7zr.exe" -OutFile $7ZA -UseBasicParsing
    }

    Write-Host "    Extracting with 7-Zip..."
    if (Test-Path $EXTRACT_TMP) { Remove-Item $EXTRACT_TMP -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $EXTRACT_TMP | Out-Null
    & $7ZA x $ARCHIVE_PATH "-o$EXTRACT_TMP" -y | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "7-Zip extraction failed."
        exit 1
    }

    $FOUND_EXE = Get-ChildItem -Path $EXTRACT_TMP -Filter "magick.exe" -Recurse | Select-Object -First 1
    if (-not $FOUND_EXE) {
        Write-Fail "magick.exe not found in archive."
        exit 1
    }

    $FOUND_DIR = $FOUND_EXE.DirectoryName
    New-Item -ItemType Directory -Force -Path $MAGICK_DIR | Out-Null
    Copy-Item "$FOUND_DIR\*" -Destination $MAGICK_DIR -Recurse -Force

    Remove-Item $ARCHIVE_PATH -Force -ErrorAction SilentlyContinue
    Remove-Item $EXTRACT_TMP -Recurse -Force -ErrorAction SilentlyContinue

    Write-OK "ImageMagick portable extracted to resources/bin/magick/"
}

# Step 2: rembg standalone exe

Write-Step "Building rembg standalone executable with PyInstaller"

$REMBG_DIR = Join-Path $BIN_DIR "rembg"
$REMBG_EXE = Join-Path $REMBG_DIR "rembg.exe"

if (Test-Path $REMBG_EXE) {
    Write-OK "rembg.exe already present - skipping build"
} else {
    # ---- Find Python 3.11 or 3.12 ----
    # Python 3.14 is NOT supported: onnxruntime and several rembg deps lack
    # stable PyInstaller hooks for it, producing a broken exe at runtime.
    # We need exactly 3.11 or 3.12 (stable ML support).

    $PYTHON_BUILD = $null
    $PREFERRED_VERSIONS = @('3.11', '3.12', '3.10')

    # Try the Windows Python Launcher (py.exe) first
    $pyLauncher = Get-Command "py.exe" -ErrorAction SilentlyContinue
    if ($pyLauncher) {
        foreach ($ver in $PREFERRED_VERSIONS) {
            $test = & py.exe "-$ver" -c "import sys; print(sys.version)" 2>&1
            if ($LASTEXITCODE -eq 0) {
                $PYTHON_BUILD = "py.exe -$ver"
                Write-OK "Found Python $ver via py launcher"
                break
            }
        }
    }

    # Try explicit versioned executables
    if (-not $PYTHON_BUILD) {
        foreach ($ver in $PREFERRED_VERSIONS) {
            $exe = "python$ver"
            $test = & $exe -c "import sys; print(sys.version)" 2>&1
            if ($LASTEXITCODE -eq 0) {
                $PYTHON_BUILD = $exe
                Write-OK "Found $exe"
                break
            }
        }
    }

    if (-not $PYTHON_BUILD) {
        Write-Fail @"
Python 3.11 or 3.12 is required to build rembg.exe.
Python 3.14+ is NOT supported due to missing onnxruntime/PyInstaller hooks.

Install Python 3.11 from: https://www.python.org/downloads/release/python-3110/
Make sure to check 'Add to PATH' during installation.
Then re-run: npm run prepare-resources
"@
        exit 1
    }

    # ---- Create isolated venv for the build ----
    $VENV_DIR = Join-Path $ROOT ".rembg-build-venv"
    Write-Host "    Creating isolated Python venv at .rembg-build-venv ..."

    if (Test-Path $VENV_DIR) { Remove-Item $VENV_DIR -Recurse -Force -ErrorAction SilentlyContinue }

    # Invoke the found Python to create the venv
    if ($PYTHON_BUILD -like "py.exe*") {
        $pyVer = $PYTHON_BUILD -replace "py.exe -", ""
        & py.exe "-$pyVer" -m venv $VENV_DIR
    } else {
        & $PYTHON_BUILD -m venv $VENV_DIR
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Failed to create venv."
        exit 1
    }

    $VENV_PY  = Join-Path $VENV_DIR "Scripts\python.exe"
    $VENV_PIP = Join-Path $VENV_DIR "Scripts\pip.exe"

    Write-Host "    Installing rembg[cli,cpu] and PyInstaller into venv..."
    & $VENV_PIP install --quiet --upgrade pip
    & $VENV_PIP install --quiet "rembg[cli,cpu]" pyinstaller
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "pip install failed inside venv."
        exit 1
    }

    # ---- Build with PyInstaller ----
    $ENTRY_SCRIPT = Join-Path $PSScriptRoot "rembg_entry.py"
    $DIST_DIR = Join-Path $ROOT "dist-py"
    $BUILD_DIR = Join-Path $ROOT "build-py"

    Write-Host "    Running PyInstaller (this takes a few minutes)..."
    $pyArgs = @(
        "-m", "PyInstaller",
        "--onefile",
        "--name", "rembg",
        "--distpath", $DIST_DIR,
        "--workpath", $BUILD_DIR,
        "--specpath", $BUILD_DIR,
        # Copy dist-info metadata needed by importlib.metadata.version() calls at runtime
        "--copy-metadata", "rembg",
        "--copy-metadata", "pymatting",
        "--copy-metadata", "huggingface_hub",
        "--copy-metadata", "onnxruntime",
        "--noconfirm",
        $ENTRY_SCRIPT
    )
    & $VENV_PY @pyArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "PyInstaller failed. Check output above for details."
        exit 1
    }

    $BUILT_EXE = Join-Path $DIST_DIR "rembg.exe"
    if (-not (Test-Path $BUILT_EXE)) {
        Write-Fail "rembg.exe not found after PyInstaller run."
        exit 1
    }

    New-Item -ItemType Directory -Force -Path $REMBG_DIR | Out-Null
    Copy-Item $BUILT_EXE -Destination $REMBG_EXE -Force

    # Cleanup build artifacts
    Remove-Item $DIST_DIR -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item $BUILD_DIR -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item $VENV_DIR -Recurse -Force -ErrorAction SilentlyContinue

    Write-OK "rembg.exe built at resources/bin/rembg/rembg.exe"
    Write-Warn "NOTE: AI models (~170MB each) will be downloaded on first use by the end user."
    Write-Warn "      Model cache location: %USERPROFILE%\.u2net\"
}

# Step 3: Pre-populate electron-builder winCodeSign cache
# The winCodeSign-2.6.0.7z archive contains macOS symlinks that Windows blocks
# without Developer Mode enabled. We extract it ourselves (ignoring symlink
# errors) so electron-builder finds it cached and skips re-downloading.

Write-Step "Pre-populating electron-builder winCodeSign cache"

$WIN_CODE_SIGN_CACHE = "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0"

if (Test-Path $WIN_CODE_SIGN_CACHE) {
    Write-OK "winCodeSign cache already present - skipping"
} else {
    $7ZA_EB = Join-Path $ROOT "node_modules\7zip-bin\win\x64\7za.exe"
    if (-not (Test-Path $7ZA_EB)) {
        Write-Warn "node_modules/7zip-bin not found - run npm install first, then re-run this script."
    } else {
        $WCS_URL = "https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.7z"
        $WCS_ARCHIVE = Join-Path $env:TEMP "winCodeSign-2.6.0.7z"
        Write-Host "    Downloading winCodeSign-2.6.0.7z ..."
        Invoke-WebRequest -Uri $WCS_URL -OutFile $WCS_ARCHIVE -UseBasicParsing
        New-Item -ItemType Directory -Force -Path $WIN_CODE_SIGN_CACHE | Out-Null
        # Use -snl flag to not create symlinks - ignores the macOS dylib symlinks
        & $7ZA_EB x $WCS_ARCHIVE "-o$WIN_CODE_SIGN_CACHE" -snl -y | Out-Null
        Remove-Item $WCS_ARCHIVE -Force -ErrorAction SilentlyContinue
        Write-OK "winCodeSign cache populated at $WIN_CODE_SIGN_CACHE"
    }
}

# Done

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  Resource preparation complete!" -ForegroundColor Green
Write-Host "  Run 'npm run package' to build the installer." -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Bundled resources:" -ForegroundColor White
Get-ChildItem $BIN_DIR -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Replace($ROOT + "\", "")
    $size = [math]::Round($_.Length / 1MB, 1)
    Write-Host ("  {0,-60} {1,6} MB" -f $rel, $size)
}
