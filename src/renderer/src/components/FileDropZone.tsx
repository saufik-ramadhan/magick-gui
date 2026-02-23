import { useState, useCallback } from 'react'
import { clsx } from 'clsx'

interface FileDropZoneProps {
  files: string[]
  onFilesAdded: (paths: string[]) => void
  onRemoveFile: (index: number) => void
  onClear: () => void
}

export default function FileDropZone({
  files,
  onFilesAdded,
  onRemoveFile,
  onClear
}: FileDropZoneProps): JSX.Element {
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      const paths = Array.from(e.dataTransfer.files)
        .map((f) => f.path)
        .filter(Boolean)
      if (paths.length > 0) onFilesAdded(paths)
    },
    [onFilesAdded]
  )

  const handleBrowse = useCallback(async () => {
    const paths = await window.magickAPI.openFiles()
    if (paths.length > 0) onFilesAdded(paths)
  }, [onFilesAdded])

  return (
    <div className="space-y-3">
      {/* Drop Target */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={clsx(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-150',
          dragging
            ? 'border-accent bg-accent/10 scale-[1.01]'
            : 'border-white/10 hover:border-white/25 hover:bg-white/5'
        )}
        onClick={handleBrowse}
      >
        <div className="flex flex-col items-center gap-2 pointer-events-none">
          <svg
            className={clsx('w-10 h-10 transition-colors', dragging ? 'text-accent' : 'text-white/20')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm font-medium text-white/60">
            {dragging ? 'Drop images here' : 'Drag & drop images or click to browse'}
          </p>
          <p className="text-xs text-white/25">
            Supports JPG, PNG, WebP, GIF, BMP, TIFF, HEIC, PSD and more
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="card space-y-1 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white/50">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={onClear}
              className="text-xs text-white/30 hover:text-accent transition-colors"
            >
              Clear all
            </button>
          </div>
          {files.map((f, i) => (
            <div
              key={`${f}-${i}`}
              className="flex items-center gap-2 py-1 px-2 rounded hover:bg-white/5 group"
            >
              <svg
                className="w-3.5 h-3.5 text-accent/60 shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V7.414A2 2 0 0017.414 6L14 2.586A2 2 0 0012.586 2H6a2 2 0 00-2 2v"
                  clipRule="evenodd"
                />
              </svg>
              <span
                className="flex-1 text-xs text-white/70 truncate"
                title={f}
                style={{ userSelect: 'text' }}
              >
                {f.split(/[\\/]/).pop()}
              </span>
              <span className="text-xs text-white/20 truncate max-w-[180px] hidden group-hover:block">
                {f}
              </span>
              <button
                onClick={() => onRemoveFile(i)}
                className="text-white/20 hover:text-accent transition-colors opacity-0 group-hover:opacity-100 shrink-0 ml-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
