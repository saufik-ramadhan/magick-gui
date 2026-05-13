import { useState, useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import FileDropZone from './FileDropZone'
import JobList from './JobList'
import OutputDirPicker from './OutputDirPicker'
import type { JobProgress, CompressFormat } from '../../../../types/ipc'

const OUTPUT_FORMATS: { value: CompressFormat; label: string; ext: string }[] = [
  { value: 'jpg', label: 'JPEG', ext: '.jpg' },
  { value: 'webp', label: 'WebP', ext: '.webp' },
  { value: 'avif', label: 'AVIF', ext: '.avif' }
]

export default function CompressPanel(): JSX.Element {
  const [files, setFiles] = useState<string[]>([])
  const [outputFormat, setOutputFormat] = useState<CompressFormat>('jpg')
  const [quality, setQuality] = useState(85)
  const [enableSizeCap, setEnableSizeCap] = useState(false)
  const [maxSizeKb, setMaxSizeKb] = useState(500)
  const [outputDir, setOutputDir] = useState('')
  const [suffix, setSuffix] = useState('compressed')
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

  const handleCompress = async (): Promise<void> => {
    if (files.length === 0 || running) return

    setJobs([])
    setRunning(true)

    try {
      await window.magickAPI.compressImages({
        files,
        outputFormat,
        quality,
        maxSizeKb: enableSizeCap ? maxSizeKb : undefined,
        outputDir: outputDir || null,
        suffix: suffix || 'compressed'
      })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Image Compressor</h1>
        <p className="text-sm text-white/40 mt-1">
          Reduce file size with quality control and optional size cap — supports batch processing
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

      {/* Settings */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold text-white/80">Compression Settings</h2>

        {/* Output format */}
        <div>
          <label className="label-base">Output Format</label>
          <div className="flex gap-2">
            {OUTPUT_FORMATS.map((fmt) => (
              <button
                key={fmt.value}
                onClick={() => setOutputFormat(fmt.value)}
                className={clsx(
                  'flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-100',
                  outputFormat === fmt.value
                    ? 'bg-accent/20 border-accent/50 text-accent'
                    : 'bg-surface border-white/10 text-white/50 hover:text-white hover:border-white/25'
                )}
              >
                <span className="font-semibold">{fmt.label}</span>
                <span className="block font-mono text-xs opacity-60">{fmt.ext}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quality slider */}
        <div>
          <label className="label-base">
            Quality —{' '}
            <span className="text-accent font-mono">{quality}%</span>
          </label>
          <input
            type="range"
            min={1}
            max={100}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-xs text-white/25 mt-1">
            <span>1 (smallest)</span>
            <span>100 (best)</span>
          </div>
        </div>

        {/* Size cap toggle */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer select-none" htmlFor="size-cap-toggle">
            <button
              id="size-cap-toggle"
              type="button"
              role="switch"
              aria-checked={enableSizeCap}
              onClick={() => setEnableSizeCap((v) => !v)}
              className={clsx(
                'relative w-9 h-5 rounded-full transition-colors duration-150 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                enableSizeCap ? 'bg-accent' : 'bg-white/15'
              )}
            >
              <span
                className={clsx(
                  'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-150',
                  enableSizeCap ? 'translate-x-4' : 'translate-x-0'
                )}
              />
            </button>
            <span className="text-sm text-white/70">Limit output file size</span>
          </label>

          {enableSizeCap && (
            <div className="flex items-center gap-3 pl-12">
              <input
                type="number"
                min={1}
                max={102400}
                value={maxSizeKb}
                onChange={(e) => setMaxSizeKb(Math.max(1, Number(e.target.value)))}
                className="w-28 bg-surface border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent/50"
              />
              <span className="text-sm text-white/40">KB maximum</span>
              <span className="text-xs text-white/25">
                ≈ {(maxSizeKb / 1024).toFixed(1)} MB
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Output */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold text-white/80">Output</h2>

        <OutputDirPicker value={outputDir} onChange={setOutputDir} />

        <div>
          <label className="label-base" htmlFor="suffix-input">Filename Suffix</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/30 font-mono">image_</span>
            <input
              id="suffix-input"
              type="text"
              value={suffix}
              onChange={(e) => setSuffix(e.target.value.replaceAll(/[<>:"/\\|?*]/gu, ''))}
              placeholder="compressed"
              className="w-40 bg-surface border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent/50"
            />
            <span className="text-sm text-white/30 font-mono">.{outputFormat}</span>
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleCompress}
          disabled={files.length === 0 || running}
          className="btn-primary flex items-center gap-2"
        >
          {running ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Compressing…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              Compress{' '}
              {files.length > 0
                ? `${files.length} file${files.length === 1 ? '' : 's'}`
                : 'Images'}
            </>
          )}
        </button>

        {!running && files.length > 0 && (
          <span className="text-xs text-white/30">
            → {files.length} × .{outputFormat}
            {enableSizeCap ? ` · max ${maxSizeKb} KB` : ''}
          </span>
        )}
      </div>

      {/* Jobs */}
      <JobList jobs={jobs} onClear={() => setJobs([])} />
    </div>
  )
}
