import { useState, useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import FileDropZone from './FileDropZone'
import JobList from './JobList'
import OutputDirPicker from './OutputDirPicker'
import type { JobProgress } from '../../../../types/ipc'

const OUTPUT_FORMATS = [
  { value: 'jpg', label: 'JPEG (.jpg)', group: 'Lossy' },
  { value: 'webp', label: 'WebP (.webp)', group: 'Lossy' },
  { value: 'png', label: 'PNG (.png)', group: 'Lossless' },
  { value: 'gif', label: 'GIF (.gif)', group: 'Lossless' },
  { value: 'bmp', label: 'BMP (.bmp)', group: 'Lossless' },
  { value: 'tiff', label: 'TIFF (.tiff)', group: 'Lossless' },
  { value: 'avif', label: 'AVIF (.avif)', group: 'Lossy' },
  { value: 'ico', label: 'ICO (.ico)', group: 'Other' },
  { value: 'pdf', label: 'PDF (.pdf)', group: 'Other' }
]

const QUALITY_FORMATS = ['jpg', 'jpeg', 'webp', 'avif']

export default function ConvertPanel(): JSX.Element {
  const [files, setFiles] = useState<string[]>([])
  const [outputFormat, setOutputFormat] = useState('jpg')
  const [quality, setQuality] = useState(90)
  const [resizePercent, setResizePercent] = useState(100)
  const [outputDir, setOutputDir] = useState('')
  const [jobs, setJobs] = useState<JobProgress[]>([])
  const [running, setRunning] = useState(false)

  // Subscribe to progress events
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

  const handleConvert = async (): Promise<void> => {
    if (files.length === 0 || running) return

    setJobs([])
    setRunning(true)

    try {
      await window.magickAPI.convertImages({
        files,
        outputFormat,
        outputDir: outputDir || null,
        quality: QUALITY_FORMATS.includes(outputFormat) ? quality : undefined,
        resizePercent: resizePercent !== 100 ? resizePercent : undefined
      })
    } finally {
      setRunning(false)
    }
  }

  const showQuality = QUALITY_FORMATS.includes(outputFormat)

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Format Converter</h1>
        <p className="text-sm text-white/40 mt-1">
          Convert images between formats using ImageMagick 7
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
        <h2 className="text-sm font-semibold text-white/80">Conversion Settings</h2>

        {/* Output format */}
        <div>
          <label className="label-base">Target Format</label>
          <div className="grid grid-cols-3 gap-2">
            {OUTPUT_FORMATS.map((fmt) => (
              <button
                key={fmt.value}
                onClick={() => setOutputFormat(fmt.value)}
                className={clsx(
                  'px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-100 text-left',
                  outputFormat === fmt.value
                    ? 'bg-accent/20 border-accent/50 text-accent'
                    : 'bg-surface border-white/10 text-white/50 hover:text-white hover:border-white/25'
                )}
              >
                <span className="font-mono text-xs">.{fmt.value}</span>
                <span className="block text-xs opacity-60 mt-0.5">{fmt.group}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quality slider (only for lossy formats) */}
        {showQuality && (
          <div>
            <label className="label-base">
              Quality — <span className="text-accent font-mono">{quality}%</span>
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
        )}

        {/* Resize */}
        <div>
          <label className="label-base">
            Resize — <span className="text-accent font-mono">{resizePercent}%</span>
            {resizePercent === 100 && (
              <span className="ml-2 text-white/25 normal-case">(no resize)</span>
            )}
          </label>
          <input
            type="range"
            min={10}
            max={200}
            step={5}
            value={resizePercent}
            onChange={(e) => setResizePercent(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-xs text-white/25 mt-1">
            <span>10%</span>
            <span>100% (original)</span>
            <span>200%</span>
          </div>
        </div>

        {/* Output directory */}
        <OutputDirPicker value={outputDir} onChange={setOutputDir} />
      </div>

      {/* Action */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleConvert}
          disabled={files.length === 0 || running}
          className="btn-primary flex items-center gap-2"
        >
          {running ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Converting…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Convert {files.length > 0 ? `${files.length} file${files.length !== 1 ? 's' : ''}` : 'Images'}
            </>
          )}
        </button>

        {!running && files.length > 0 && (
          <span className="text-xs text-white/30">
            → {files.length} × .{outputFormat}
          </span>
        )}
      </div>

      {/* Jobs */}
      <JobList jobs={jobs} onClear={() => setJobs([])} />
    </div>
  )
}
