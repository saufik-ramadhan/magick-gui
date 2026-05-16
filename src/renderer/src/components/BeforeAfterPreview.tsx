import { useState, useEffect, useCallback } from 'react'
import type { JobProgress } from '../../../../types/ipc'

interface BeforeAfterPreviewProps {
  job: JobProgress
  onClose: () => void
}

export default function BeforeAfterPreview({ job, onClose }: BeforeAfterPreviewProps): JSX.Element {
  const [beforeSrc, setBeforeSrc] = useState<string | null>(null)
  const [afterSrc, setAfterSrc] = useState<string | null>(null)

  useEffect(() => {
    setBeforeSrc(null)
    setAfterSrc(null)
    window.magickAPI.readFileAsDataUrl(job.inputFile).then(setBeforeSrc)
    window.magickAPI.readFileAsDataUrl(job.outputFile).then(setAfterSrc)
  }, [job.inputFile, job.outputFile])

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  const inputName = job.inputFile.split(/[\\/]/).pop() ?? ''
  const outputName = job.outputFile.split(/[\\/]/).pop() ?? ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface-2 rounded-2xl border border-white/10 shadow-2xl p-5 w-full max-w-3xl mx-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Before / After Preview</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close preview"
          >
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Side-by-side panes */}
        <div className="grid grid-cols-2 gap-4">
          {/* Before */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-white/50 text-center tracking-wide uppercase">
              Before
            </p>
            <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5 aspect-square flex items-center justify-center">
              {beforeSrc ? (
                <img
                  src={beforeSrc}
                  alt="Before"
                  className="max-w-full max-h-full object-contain"
                  draggable={false}
                />
              ) : (
                <span className="text-white/20 text-xs animate-pulse">Loading…</span>
              )}
            </div>
            <p className="text-xs text-white/25 truncate text-center" title={inputName}>
              {inputName}
            </p>
          </div>

          {/* After */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-white/50 text-center tracking-wide uppercase">
              After
            </p>
            {/* Checkerboard background reveals transparency */}
            <div
              className="rounded-xl overflow-hidden border border-white/10 aspect-square flex items-center justify-center"
              style={{
                background:
                  'repeating-conic-gradient(#404040 0% 25%, #2a2a2a 0% 50%) 0 0 / 20px 20px'
              }}
            >
              {afterSrc ? (
                <img
                  src={afterSrc}
                  alt="After"
                  className="max-w-full max-h-full object-contain"
                  draggable={false}
                />
              ) : (
                <span className="text-white/20 text-xs animate-pulse">Loading…</span>
              )}
            </div>
            <p className="text-xs text-white/25 truncate text-center" title={outputName}>
              {outputName}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
