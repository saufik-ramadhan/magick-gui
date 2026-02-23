import { useState, useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import FileDropZone from './FileDropZone'
import JobList from './JobList'
import OutputDirPicker from './OutputDirPicker'
import type { JobProgress } from '../../../../types/ipc'

interface AspectRatioOption {
  value: string
  label: string
  description: string
  w: number
  h: number
}

const ASPECT_RATIOS: AspectRatioOption[] = [
  { value: '1:1', label: '1:1', description: 'Square', w: 1, h: 1 },
  { value: '4:3', label: '4:3', description: 'Standard / TV', w: 4, h: 3 },
  { value: '16:9', label: '16:9', description: 'Widescreen', w: 16, h: 9 },
  { value: '3:2', label: '3:2', description: 'DSLR / 35mm', w: 3, h: 2 },
  { value: '2:3', label: '2:3', description: 'Portrait', w: 2, h: 3 },
  { value: '9:16', label: '9:16', description: 'Mobile / Reel', w: 9, h: 16 },
  { value: '21:9', label: '21:9', description: 'Ultrawide', w: 21, h: 9 },
  { value: '5:4', label: '5:4', description: 'Large format', w: 5, h: 4 }
]

const GRAVITY_OPTIONS = [
  { value: 'Center', label: 'Center', icon: '⊙' },
  { value: 'North', label: 'Top', icon: '↑' },
  { value: 'South', label: 'Bottom', icon: '↓' },
  { value: 'West', label: 'Left', icon: '←' },
  { value: 'East', label: 'Right', icon: '→' },
  { value: 'NorthWest', label: 'Top-Left', icon: '↖' },
  { value: 'NorthEast', label: 'Top-Right', icon: '↗' },
  { value: 'SouthWest', label: 'Bottom-Left', icon: '↙' },
  { value: 'SouthEast', label: 'Bottom-Right', icon: '↘' }
]

function AspectPreview({ w, h, selected }: { w: number; h: number; selected: boolean }): JSX.Element {
  const maxSize = 36
  const rW = w >= h ? maxSize : Math.round((w / h) * maxSize)
  const rH = h >= w ? maxSize : Math.round((h / w) * maxSize)

  return (
    <div
      className={clsx(
        'mx-auto border-2 rounded-sm transition-colors',
        selected ? 'border-accent' : 'border-white/20'
      )}
      style={{ width: rW, height: rH }}
    />
  )
}

export default function CropPanel(): JSX.Element {
  const [files, setFiles] = useState<string[]>([])
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [gravity, setGravity] = useState('Center')
  const [outputDir, setOutputDir] = useState('')
  const [suffix, setSuffix] = useState('')
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

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleCrop = async (): Promise<void> => {
    if (files.length === 0 || running) return

    setJobs([])
    setRunning(true)

    try {
      await window.magickAPI.cropImages({
        files,
        aspectRatio,
        gravity,
        outputDir: outputDir || null,
        suffix: suffix || aspectRatio.replace(':', 'x')
      })
    } finally {
      setRunning(false)
    }
  }

  const selectedRatio = ASPECT_RATIOS.find((r) => r.value === aspectRatio)!

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Aspect Ratio Crop</h1>
        <p className="text-sm text-white/40 mt-1">
          Crop images to predefined aspect ratios using ImageMagick 7
        </p>
      </div>

      {/* File Input */}
      <div className="card">
        <label className="label-base">Source Images</label>
        <FileDropZone
          files={files}
          onFilesAdded={handleAddFiles}
          onRemoveFile={handleRemoveFile}
          onClear={() => setFiles([])}
        />
      </div>

      {/* Aspect Ratio Selection */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold text-white/80">Crop Settings</h2>

        <div>
          <label className="label-base">Aspect Ratio</label>
          <div className="grid grid-cols-4 gap-2">
            {ASPECT_RATIOS.map((ratio) => (
              <button
                key={ratio.value}
                onClick={() => setAspectRatio(ratio.value)}
                className={clsx(
                  'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-100',
                  aspectRatio === ratio.value
                    ? 'bg-accent/15 border-accent/50 text-accent'
                    : 'bg-surface border-white/10 text-white/50 hover:text-white hover:border-white/25'
                )}
              >
                <AspectPreview w={ratio.w} h={ratio.h} selected={aspectRatio === ratio.value} />
                <div className="text-center">
                  <div className="text-xs font-bold font-mono">{ratio.label}</div>
                  <div className="text-xs opacity-60 leading-tight">{ratio.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Gravity / Crop Anchor */}
        <div>
          <label className="label-base">
            Crop Anchor — <span className="text-accent">{GRAVITY_OPTIONS.find((g) => g.value === gravity)?.label}</span>
          </label>
          <div className="grid grid-cols-3 gap-1.5 max-w-xs">
            {GRAVITY_OPTIONS.map((g) => (
              <button
                key={g.value}
                onClick={() => setGravity(g.value)}
                title={g.label}
                className={clsx(
                  'py-2 rounded-lg text-center text-sm font-medium border transition-all duration-100',
                  gravity === g.value
                    ? 'bg-accent/20 border-accent/50 text-accent'
                    : 'bg-surface border-white/10 text-white/40 hover:text-white hover:border-white/25'
                )}
              >
                <span className="mr-1">{g.icon}</span>
                <span className="text-xs">{g.label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-white/25 mt-2">
            Determines which part of the image to keep when cropping.
          </p>
        </div>

        {/* Suffix for output filename */}
        <div>
          <label className="label-base">Filename Suffix</label>
          <input
            type="text"
            value={suffix}
            onChange={(e) => setSuffix(e.target.value)}
            placeholder={`Default: _${aspectRatio.replace(':', 'x')} (e.g. photo_16x9.jpg)`}
            className="input-base"
          />
        </div>

        {/* Output directory */}
        <OutputDirPicker value={outputDir} onChange={setOutputDir} />
      </div>

      {/* Preview hint */}
      {selectedRatio && (
        <div className="flex items-center gap-3 px-4 py-3 bg-surface-2 rounded-xl border border-white/5">
          <div className="shrink-0">
            <AspectPreview w={selectedRatio.w} h={selectedRatio.h} selected={true} />
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              {selectedRatio.label} — {selectedRatio.description}
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              Anchor: <span className="text-accent">{gravity}</span> · Crop maximizes coverage within this ratio
            </p>
          </div>
        </div>
      )}

      {/* Action */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleCrop}
          disabled={files.length === 0 || running}
          className="btn-primary flex items-center gap-2"
        >
          {running ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Cropping…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 5a1 1 0 011-1h4a1 1 0 010 2H6v3a1 1 0 01-2 0V5zm11 11h3a1 1 0 010 2h-4a1 1 0 01-1-1v-4a1 1 0 012 0v3z"
                />
              </svg>
              Crop {files.length > 0 ? `${files.length} file${files.length !== 1 ? 's' : ''}` : 'Images'}
            </>
          )}
        </button>

        {!running && files.length > 0 && (
          <span className="text-xs text-white/30">
            → {files.length} × {aspectRatio}
          </span>
        )}
      </div>

      {/* Jobs */}
      <JobList jobs={jobs} onClear={() => setJobs([])} />
    </div>
  )
}
