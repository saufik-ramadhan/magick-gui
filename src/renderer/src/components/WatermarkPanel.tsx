import { useState, useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import FileDropZone from './FileDropZone'
import JobList from './JobList'
import OutputDirPicker from './OutputDirPicker'
import type { JobProgress, WatermarkMode } from '../../../../types/ipc'

// ─── Gravity picker ────────────────────────────────────────────────────────────

const GRAVITY_GRID = [
  ['NorthWest', 'North', 'NorthEast'],
  ['West',      'Center', 'East'],
  ['SouthWest', 'South', 'SouthEast']
]

const GRAVITY_LABELS: Record<string, string> = {
  NorthWest: '↖', North: '↑', NorthEast: '↗',
  West: '←',      Center: '⊙', East: '→',
  SouthWest: '↙', South: '↓', SouthEast: '↘'
}

function GravityPicker({
  value,
  onChange
}: {
  value: string
  onChange: (v: string) => void
}): JSX.Element {
  return (
    <div className="inline-grid grid-cols-3 gap-1">
      {GRAVITY_GRID.flat().map((g) => (
        <button
          key={g}
          onClick={() => onChange(g)}
          title={g}
          className={clsx(
            'w-9 h-9 rounded-lg text-base font-medium border transition-all duration-100',
            value === g
              ? 'bg-accent/20 border-accent/50 text-accent'
              : 'bg-surface border-white/10 text-white/40 hover:text-white hover:border-white/25'
          )}
        >
          {GRAVITY_LABELS[g]}
        </button>
      ))}
    </div>
  )
}

// ─── Offset inputs ─────────────────────────────────────────────────────────────

function OffsetInputs({
  x, y, onX, onY
}: {
  x: number; y: number
  onX: (v: number) => void
  onY: (v: number) => void
}): JSX.Element {
  return (
    <div className="flex gap-3">
      <div className="flex-1">
        <label className="label-base">Offset X (px)</label>
        <input
          type="number"
          min={0}
          max={2000}
          value={x}
          onChange={(e) => onX(Number(e.target.value))}
          className="input-base"
        />
      </div>
      <div className="flex-1">
        <label className="label-base">Offset Y (px)</label>
        <input
          type="number"
          min={0}
          max={2000}
          value={y}
          onChange={(e) => onY(Number(e.target.value))}
          className="input-base"
        />
      </div>
    </div>
  )
}

// ─── Main Panel ────────────────────────────────────────────────────────────────

export default function WatermarkPanel(): JSX.Element {
  // Source files
  const [files, setFiles] = useState<string[]>([])

  // Mode
  const [mode, setMode] = useState<WatermarkMode>('text')

  // Text options
  const [text, setText] = useState('© My Brand')
  const [font, setFont] = useState('Arial')
  const [pointSize, setPointSize] = useState(48)
  const [color, setColor] = useState('#ffffff')
  const [textOpacity, setTextOpacity] = useState(60)
  const [textGravity, setTextGravity] = useState('SouthEast')
  const [textOffsetX, setTextOffsetX] = useState(20)
  const [textOffsetY, setTextOffsetY] = useState(20)

  // Image options
  const [watermarkPath, setWatermarkPath] = useState('')
  const [imageOpacity, setImageOpacity] = useState(50)
  const [imageScale, setImageScale] = useState(20)
  const [imageGravity, setImageGravity] = useState('SouthEast')
  const [imageOffsetX, setImageOffsetX] = useState(20)
  const [imageOffsetY, setImageOffsetY] = useState(20)

  // Output
  const [outputDir, setOutputDir] = useState('')
  const [suffix, setSuffix] = useState('watermarked')

  // Job tracking
  const [jobs, setJobs] = useState<JobProgress[]>([])
  const [running, setRunning] = useState(false)

  useEffect(() => {
    const unsub = window.magickAPI.onProgress((progress) => {
      setJobs((prev) => {
        const idx = prev.findIndex((j) => j.id === progress.id)
        if (idx === -1) return [...prev, progress]
        const next = [...prev]
        next[idx] = progress
        return next
      })
    })
    return unsub
  }, [])

  const handleAddFiles = useCallback((paths: string[]) => {
    setFiles((prev) => {
      const existing = new Set(prev)
      return [...prev, ...paths.filter((p) => !existing.has(p))]
    })
  }, [])

  const handlePickWatermark = async (): Promise<void> => {
    const paths = await window.magickAPI.openFiles({ title: 'Select Watermark Image' })
    if (paths[0]) setWatermarkPath(paths[0])
  }

  const handleRun = async (): Promise<void> => {
    if (files.length === 0 || running) return
    if (mode === 'image' && !watermarkPath) return

    setJobs([])
    setRunning(true)

    try {
      await window.magickAPI.watermarkImages({
        files,
        mode,
        outputDir: outputDir || null,
        suffix: suffix || 'watermarked',
        text:
          mode === 'text'
            ? {
                text,
                font,
                pointSize,
                color,
                opacity: textOpacity,
                gravity: textGravity,
                offsetX: textOffsetX,
                offsetY: textOffsetY
              }
            : undefined,
        image:
          mode === 'image'
            ? {
                watermarkPath,
                opacity: imageOpacity,
                scale: imageScale,
                gravity: imageGravity,
                offsetX: imageOffsetX,
                offsetY: imageOffsetY
              }
            : undefined
      })
    } finally {
      setRunning(false)
    }
  }

  const canRun = files.length > 0 && !running && (mode === 'text' ? text.trim() !== '' : watermarkPath !== '')

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Watermark</h1>
        <p className="text-sm text-white/40 mt-1">
          Add text or image watermarks with full opacity and position control
        </p>
      </div>

      {/* Source Files */}
      <div className="card">
        <label className="label-base">Source Images</label>
        <FileDropZone
          files={files}
          onFilesAdded={handleAddFiles}
          onRemoveFile={(i) => setFiles((p) => p.filter((_, idx) => idx !== i))}
          onClear={() => setFiles([])}
        />
      </div>

      {/* Mode Switch */}
      <div className="flex gap-2 p-1 bg-surface-2 rounded-xl border border-white/5 w-fit">
        {(['text', 'image'] as WatermarkMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={clsx(
              'px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 capitalize',
              mode === m
                ? 'bg-accent text-white shadow-lg shadow-accent/20'
                : 'text-white/40 hover:text-white'
            )}
          >
            {m === 'text' ? '✦ Text' : '🖼 Image'}
          </button>
        ))}
      </div>

      {/* ── Text Mode ─────────────────────────────────────────────────────────── */}
      {mode === 'text' && (
        <div className="card space-y-5">
          <h2 className="text-sm font-semibold text-white/80">Text Watermark</h2>

          {/* Watermark text */}
          <div>
            <label className="label-base">Watermark Text</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="© My Brand"
              className="input-base"
            />
          </div>

          {/* Font & Size */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label-base">Font Family</label>
              <input
                type="text"
                value={font}
                onChange={(e) => setFont(e.target.value)}
                placeholder="Arial"
                className="input-base"
              />
              <p className="text-xs text-white/25 mt-1">Must be a font installed on this system</p>
            </div>
            <div className="w-28">
              <label className="label-base">Size — <span className="text-accent font-mono">{pointSize}pt</span></label>
              <input
                type="number"
                min={8}
                max={500}
                value={pointSize}
                onChange={(e) => setPointSize(Number(e.target.value))}
                className="input-base"
              />
            </div>
          </div>

          {/* Color & Opacity */}
          <div className="flex gap-4 items-end">
            <div>
              <label className="label-base">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-9 rounded-lg border border-white/10 bg-surface cursor-pointer p-0.5"
                />
                <span className="font-mono text-xs text-white/50">{color.toUpperCase()}</span>
              </div>
            </div>
            <div className="flex-1">
              <label className="label-base">
                Opacity — <span className="text-accent font-mono">{textOpacity}%</span>
              </label>
              <input
                type="range"
                min={5}
                max={100}
                value={textOpacity}
                onChange={(e) => setTextOpacity(Number(e.target.value))}
                className="w-full accent-accent"
              />
            </div>
          </div>

          {/* Text preview chip */}
          <div
            className="flex items-center justify-center h-14 rounded-xl border border-white/10 bg-surface"
            style={{ background: 'repeating-conic-gradient(#333 0% 25%, #222 0% 50%) 0 0 / 16px 16px' }}
          >
            <span
              style={{
                fontFamily: font || 'Arial',
                fontSize: Math.min(pointSize, 32),
                color: color,
                opacity: textOpacity / 100,
                textShadow: '0 1px 4px rgba(0,0,0,0.8)'
              }}
            >
              {text || 'Preview'}
            </span>
          </div>

          {/* Position */}
          <div className="flex gap-6 items-start">
            <div>
              <label className="label-base">Position (Gravity)</label>
              <GravityPicker value={textGravity} onChange={setTextGravity} />
            </div>
            <div className="flex-1 pt-5">
              <OffsetInputs
                x={textOffsetX} y={textOffsetY}
                onX={setTextOffsetX} onY={setTextOffsetY}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Image Mode ────────────────────────────────────────────────────────── */}
      {mode === 'image' && (
        <div className="card space-y-5">
          <h2 className="text-sm font-semibold text-white/80">Image Watermark</h2>

          {/* Watermark image picker */}
          <div>
            <label className="label-base">Watermark / Logo Image</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={watermarkPath}
                placeholder="Select a PNG, SVG, or any image…"
                className="input-base cursor-default"
                onClick={handlePickWatermark}
              />
              <button
                type="button"
                onClick={handlePickWatermark}
                className="btn-secondary shrink-0 text-sm"
              >
                Browse
              </button>
              {watermarkPath && (
                <button
                  onClick={() => setWatermarkPath('')}
                  className="text-white/30 hover:text-accent transition-colors px-2"
                >
                  ✕
                </button>
              )}
            </div>
            <p className="text-xs text-white/25 mt-1">
              PNG with transparency recommended for best results
            </p>
          </div>

          {/* Scale */}
          <div>
            <label className="label-base">
              Size — <span className="text-accent font-mono">{imageScale}%</span>
              <span className="ml-2 text-white/25 normal-case">of source image width</span>
            </label>
            <input
              type="range"
              min={1}
              max={100}
              value={imageScale}
              onChange={(e) => setImageScale(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>

          {/* Opacity */}
          <div>
            <label className="label-base">
              Opacity — <span className="text-accent font-mono">{imageOpacity}%</span>
            </label>
            <input
              type="range"
              min={5}
              max={100}
              value={imageOpacity}
              onChange={(e) => setImageOpacity(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>

          {/* Position */}
          <div className="flex gap-6 items-start">
            <div>
              <label className="label-base">Position (Gravity)</label>
              <GravityPicker value={imageGravity} onChange={setImageGravity} />
            </div>
            <div className="flex-1 pt-5">
              <OffsetInputs
                x={imageOffsetX} y={imageOffsetY}
                onX={setImageOffsetX} onY={setImageOffsetY}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Common Output Settings ─────────────────────────────────────────────── */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold text-white/80">Output Settings</h2>

        <div>
          <label className="label-base">Filename Suffix</label>
          <input
            type="text"
            value={suffix}
            onChange={(e) => setSuffix(e.target.value)}
            placeholder="watermarked"
            className="input-base"
          />
          <p className="text-xs text-white/25 mt-1">
            e.g. photo_<span className="text-accent">{suffix || 'watermarked'}</span>.jpg
          </p>
        </div>

        <OutputDirPicker value={outputDir} onChange={setOutputDir} />
      </div>

      {/* ── Action ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleRun}
          disabled={!canRun}
          className="btn-primary flex items-center gap-2"
        >
          {running ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Applying…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
              </svg>
              Apply Watermark{files.length > 0 ? ` to ${files.length} file${files.length !== 1 ? 's' : ''}` : ''}
            </>
          )}
        </button>

        {mode === 'image' && !watermarkPath && !running && (
          <span className="text-xs text-yellow-400/70">⚠ Select a watermark image first</span>
        )}
      </div>

      <JobList jobs={jobs} onClear={() => setJobs([])} />
    </div>
  )
}
