import { useState, useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import FileDropZone from './FileDropZone'
import JobList from './JobList'
import OutputDirPicker from './OutputDirPicker'
import type { BgRemoveMode, RembgCheckResult, JobProgress } from '../../../../types/ipc'

// ─── Rembg model options ───────────────────────────────────────────────────────

const REMBG_MODELS = [
  // ── BiRefNet (MIT License — commercial friendly) ──
  {
    value: 'birefnet-general',
    label: 'birefnet-general',
    description: 'Best quality for most subjects. Commercial-friendly MIT license.',
    tag: 'Recommended',
    group: 'BiRefNet  ·  MIT License',
    size: '~350 MB'
  },
  {
    value: 'birefnet-general-lite',
    label: 'birefnet-general-lite',
    description: 'Smaller & faster BiRefNet, good quality/speed trade-off.',
    tag: 'Fast',
    group: 'BiRefNet  ·  MIT License',
    size: '~100 MB'
  },
  {
    value: 'birefnet-portrait',
    label: 'birefnet-portrait',
    description: 'BiRefNet fine-tuned for human portraits and selfies.',
    tag: 'Portraits',
    group: 'BiRefNet  ·  MIT License',
    size: '~350 MB'
  },
  {
    value: 'birefnet-dis',
    label: 'birefnet-dis',
    description: 'Dichotomous segmentation — excellent for product shots with fine detail.',
    tag: 'Products',
    group: 'BiRefNet  ·  MIT License',
    size: '~350 MB'
  },
  {
    value: 'birefnet-hrsod',
    label: 'birefnet-hrsod',
    description: 'High-resolution salient object detection.',
    tag: 'Hi-Res',
    group: 'BiRefNet  ·  MIT License',
    size: '~350 MB'
  },
  // ── Legacy / U2Net ──
  {
    value: 'u2net',
    label: 'u2net',
    description: 'Classic general-purpose model. Solid all-around.',
    tag: 'Classic',
    group: 'U2Net  ·  Legacy',
    size: '~170 MB'
  },
  {
    value: 'u2net_human_seg',
    label: 'u2net_human_seg',
    description: 'U2Net optimised for people and portraits.',
    tag: 'Portraits',
    group: 'U2Net  ·  Legacy',
    size: '~170 MB'
  },
  {
    value: 'isnet-general-use',
    label: 'isnet-general-use',
    description: 'ISNet with high edge detail.',
    tag: 'High detail',
    group: 'U2Net  ·  Legacy',
    size: '~170 MB'
  },
  {
    value: 'silueta',
    label: 'silueta',
    description: 'Lightweight and fast, good for simple objects.',
    tag: 'Fast',
    group: 'U2Net  ·  Legacy',
    size: '~45 MB'
  }
]

type RembgModel = (typeof REMBG_MODELS)[number]
const MODEL_GROUPS = REMBG_MODELS.reduce<Record<string, RembgModel[]>>((acc, m) => {
  if (!acc[m.group]) acc[m.group] = []
  acc[m.group].push(m)
  return acc
}, {})

// ─── Install instructions ──────────────────────────────────────────────────────

function RembgInstallCard(): JSX.Element {
  return (
    <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-yellow-400 text-lg shrink-0">⚠</span>
        <div>
          <p className="text-sm font-semibold text-yellow-300">rembg is not installed</p>
          <p className="text-xs text-white/50 mt-1">
            AI background removal requires the <code className="text-yellow-300">rembg</code> Python
            package. Install it with:
          </p>
        </div>
      </div>
      <div className="rounded-lg bg-black/40 border border-white/10 p-3 font-mono text-xs text-green-300 space-y-1 select-text">
        <div>pip install rembg[cli]</div>
        <div className="text-white/30"># or with pipx for isolated install:</div>
        <div>pipx install rembg[cli]</div>
      </div>
      <p className="text-xs text-white/30">
        After installing, the first run will download the selected model (~170 MB for u2net).
        Subsequent runs use the cached model.
      </p>
    </div>
  )
}

// ─── Color method explainer ────────────────────────────────────────────────────

function ColorMethodInfo({ floodfill }: { floodfill: boolean }): JSX.Element {
  return (
    <div className="rounded-lg bg-surface border border-white/5 px-4 py-3">
      {floodfill ? (
        <div>
          <p className="text-xs font-semibold text-accent mb-1">🪣 Flood-fill from corners</p>
          <p className="text-xs text-white/40 leading-relaxed">
            Samples from all 4 corners outward. Better for product shots where the background
            touches the edges but the target color also appears inside the subject.
          </p>
        </div>
      ) : (
        <div>
          <p className="text-xs font-semibold text-accent mb-1">🎨 Global color replace</p>
          <p className="text-xs text-white/40 leading-relaxed">
            Replaces every pixel in the image matching the target color within the fuzz
            tolerance. Best for flat studio backgrounds with no matching tones in the subject.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Main Panel ────────────────────────────────────────────────────────────────

export default function BgRemovePanel(): JSX.Element {
  const [files, setFiles] = useState<string[]>([])
  const [mode, setMode] = useState<BgRemoveMode>('color')

  // Color mode state
  const [bgColor, setBgColor] = useState('#ffffff')
  const [fuzz, setFuzz] = useState(15)
  const [floodfill, setFloodfill] = useState(false)

  // AI mode state
  const [model, setModel] = useState('birefnet-general')
  const [rembgStatus, setRembgStatus] = useState<RembgCheckResult | null>(null)
  const [checkingRembg, setCheckingRembg] = useState(false)

  // Output
  const [outputDir, setOutputDir] = useState('')
  const [suffix, setSuffix] = useState('nobg')

  // Jobs
  const [jobs, setJobs] = useState<JobProgress[]>([])
  const [running, setRunning] = useState(false)

  // Check rembg when switching to AI mode
  useEffect(() => {
    if (mode === 'ai' && rembgStatus === null) {
      setCheckingRembg(true)
      window.magickAPI.checkRembg().then((r) => {
        setRembgStatus(r)
        setCheckingRembg(false)
      })
    }
  }, [mode, rembgStatus])

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

  const handleRun = async (): Promise<void> => {
    if (files.length === 0 || running) return

    setJobs([])
    setRunning(true)

    try {
      if (mode === 'color') {
        await window.magickAPI.removeBgColor({
          files,
          color: bgColor,
          fuzz,
          floodfill,
          outputDir: outputDir || null,
          suffix
        })
      } else {
        await window.magickAPI.removeBgAi({
          files,
          model,
          outputDir: outputDir || null,
          suffix
        })
      }
    } finally {
      setRunning(false)
    }
  }

  const canRun =
    files.length > 0 &&
    !running &&
    (mode === 'color' || (mode === 'ai' && rembgStatus?.available === true))

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Background Remover</h1>
        <p className="text-sm text-white/40 mt-1">
          Remove image backgrounds — solid color (ImageMagick) or AI-powered (rembg)
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
        <button
          onClick={() => setMode('color')}
          className={clsx(
            'px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150',
            mode === 'color'
              ? 'bg-accent text-white shadow-lg shadow-accent/20'
              : 'text-white/40 hover:text-white'
          )}
        >
          🎨 Color Remove
        </button>
        <button
          onClick={() => setMode('ai')}
          className={clsx(
            'px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150',
            mode === 'ai'
              ? 'bg-accent text-white shadow-lg shadow-accent/20'
              : 'text-white/40 hover:text-white'
          )}
        >
          🤖 AI Remove
        </button>
      </div>

      {/* ── Color Mode ────────────────────────────────────────────────────────── */}
      {mode === 'color' && (
        <div className="card space-y-5">
          <div className="flex items-start justify-between">
            <h2 className="text-sm font-semibold text-white/80">Color-Based Removal</h2>
            <span className="text-xs text-white/30 bg-surface px-2 py-0.5 rounded">
              Powered by ImageMagick
            </span>
          </div>

          {/* Color picker */}
          <div>
            <label className="label-base">Background Color to Remove</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-12 h-10 rounded-lg border border-white/10 bg-surface cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="input-base w-32 font-mono uppercase"
                maxLength={7}
              />
              {/* Quick presets */}
              <div className="flex gap-1.5">
                {['#ffffff', '#000000', '#00ff00', '#0000ff'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setBgColor(c)}
                    title={c}
                    className={clsx(
                      'w-7 h-7 rounded-md border-2 transition-all',
                      bgColor.toLowerCase() === c
                        ? 'border-accent scale-110'
                        : 'border-white/20 hover:border-white/50'
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Fuzz tolerance */}
          <div>
            <label className="label-base">
              Fuzz Tolerance — <span className="text-accent font-mono">{fuzz}%</span>
              <span className="text-white/25 ml-2 normal-case">
                (how much color variation to include)
              </span>
            </label>
            <input
              type="range"
              min={0}
              max={60}
              value={fuzz}
              onChange={(e) => setFuzz(Number(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-xs text-white/25 mt-1">
              <span>0% (exact match)</span>
              <span>30% (typical)</span>
              <span>60% (aggressive)</span>
            </div>
          </div>

          {/* Method toggle */}
          <div>
            <label className="label-base">Method</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFloodfill(false)}
                className={clsx(
                  'flex-1 px-4 py-2.5 rounded-lg text-sm border transition-all duration-100 text-left',
                  !floodfill
                    ? 'bg-accent/15 border-accent/40 text-accent'
                    : 'bg-surface border-white/10 text-white/50 hover:text-white hover:border-white/25'
                )}
              >
                <span className="font-medium">🎨 Global Replace</span>
                <span className="block text-xs opacity-60 mt-0.5">
                  All matching pixels anywhere
                </span>
              </button>
              <button
                onClick={() => setFloodfill(true)}
                className={clsx(
                  'flex-1 px-4 py-2.5 rounded-lg text-sm border transition-all duration-100 text-left',
                  floodfill
                    ? 'bg-accent/15 border-accent/40 text-accent'
                    : 'bg-surface border-white/10 text-white/50 hover:text-white hover:border-white/25'
                )}
              >
                <span className="font-medium">🪣 Flood-fill Corners</span>
                <span className="block text-xs opacity-60 mt-0.5">
                  Fill outward from all 4 corners
                </span>
              </button>
            </div>
          </div>

          <ColorMethodInfo floodfill={floodfill} />

          <div className="rounded-lg bg-blue-900/20 border border-blue-500/20 px-4 py-2.5">
            <p className="text-xs text-blue-300/80">
              💡 Output is always <strong>PNG</strong> — only PNG supports full transparency.
              Works best on studio/product photos with a uniform background.
            </p>
          </div>
        </div>
      )}

      {/* ── AI Mode ───────────────────────────────────────────────────────────── */}
      {mode === 'ai' && (
        <div className="card space-y-5">
          <div className="flex items-start justify-between">
            <h2 className="text-sm font-semibold text-white/80">AI Background Removal</h2>
            <span className="text-xs text-white/30 bg-surface px-2 py-0.5 rounded">
              Powered by rembg
            </span>
          </div>

          {/* rembg status */}
          {checkingRembg ? (
            <div className="flex items-center gap-2 text-sm text-white/40">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Checking for rembg…
            </div>
          ) : rembgStatus?.available ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
              <span className="text-green-400 font-medium">rembg is installed</span>
              {rembgStatus.version && (
                <span className="text-white/30 font-mono text-xs">
                  {rembgStatus.version === 'bundled' ? '(bundled)' : `v${rembgStatus.version}`}
                </span>
              )}
              <button
                onClick={() => {
                  setRembgStatus(null)
                  setCheckingRembg(true)
                  window.magickAPI.checkRembg().then((r) => {
                    setRembgStatus(r)
                    setCheckingRembg(false)
                  })
                }}
                className="ml-auto text-xs text-white/25 hover:text-white/50 transition-colors"
              >
                Re-check
              </button>
            </div>
          ) : (
            <>
              <RembgInstallCard />
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setRembgStatus(null)
                    setCheckingRembg(true)
                    window.magickAPI.checkRembg().then((r) => {
                      setRembgStatus(r)
                      setCheckingRembg(false)
                    })
                  }}
                  className="btn-secondary text-sm"
                >
                  Check Again
                </button>
              </div>
            </>
          )}

          {/* Model selection */}
          {rembgStatus?.available && (
            <>
              <div>
                <label className="label-base">Model</label>
                <div className="space-y-4">
                  {Object.entries(MODEL_GROUPS).map(([groupName, models]) => (
                    <div key={groupName}>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-1.5 px-1">
                        {groupName}
                      </p>
                      <div className="space-y-1.5">
                        {models.map((m) => (
                          <button
                            key={m.value}
                            onClick={() => setModel(m.value)}
                            className={clsx(
                              'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all duration-100 text-left',
                              model === m.value
                                ? 'bg-accent/15 border-accent/40'
                                : 'bg-surface border-white/10 hover:border-white/25'
                            )}
                          >
                            <div
                              className={clsx(
                                'w-3.5 h-3.5 rounded-full border-2 shrink-0',
                                model === m.value
                                  ? 'border-accent bg-accent'
                                  : 'border-white/30'
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={clsx(
                                    'text-sm font-medium font-mono',
                                    model === m.value ? 'text-accent' : 'text-white/80'
                                  )}
                                >
                                  {m.label}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/40">
                                  {m.tag}
                                </span>
                              </div>
                              <span className="text-xs text-white/35">{m.description}</span>
                            </div>
                            <span className="text-[10px] text-white/25 shrink-0 tabular-nums">{m.size}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-white/25 mt-2">
                  First-time use downloads the selected model. Size shown above. Cached for future runs.
                </p>
              </div>

              <div className="rounded-lg bg-blue-900/20 border border-blue-500/20 px-4 py-2.5">
                <p className="text-xs text-blue-300/80">
                  💡 AI removal works on <strong>any background</strong> — complex scenes, hair,
                  transparent objects. Output is always <strong>PNG</strong>.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Output Settings ────────────────────────────────────────────────────── */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold text-white/80">Output Settings</h2>

        <div>
          <label className="label-base">Filename Suffix</label>
          <input
            type="text"
            value={suffix}
            onChange={(e) => setSuffix(e.target.value)}
            placeholder="nobg"
            className="input-base"
          />
          <p className="text-xs text-white/25 mt-1">
            e.g. photo_<span className="text-accent">{suffix || 'nobg'}</span>.png
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
              Processing…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remove Background
              {files.length > 0 && ` — ${files.length} file${files.length !== 1 ? 's' : ''}`}
            </>
          )}
        </button>

        {mode === 'ai' && !rembgStatus?.available && !running && (
          <span className="text-xs text-yellow-400/70">⚠ rembg must be installed first</span>
        )}
      </div>

      <JobList jobs={jobs} onClear={() => setJobs([])} />
    </div>
  )
}
