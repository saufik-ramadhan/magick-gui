import { clsx } from 'clsx'
import type { JobProgress } from '../../../../types/ipc'

interface JobListProps {
  jobs: JobProgress[]
  onClear: () => void
}

const STATUS_CONFIG = {
  pending: { color: 'text-white/30', dot: 'bg-white/20', label: 'Pending' },
  running: { color: 'text-yellow-300', dot: 'bg-yellow-400 animate-pulse', label: 'Running' },
  done: { color: 'text-green-400', dot: 'bg-green-400', label: 'Done' },
  error: { color: 'text-red-400', dot: 'bg-red-400', label: 'Error' }
}

export default function JobList({ jobs, onClear }: JobListProps): JSX.Element | null {
  if (jobs.length === 0) return null

  const doneCount = jobs.filter((j) => j.status === 'done').length
  const errorCount = jobs.filter((j) => j.status === 'error').length
  const runningCount = jobs.filter((j) => j.status === 'running').length
  const totalProgress = jobs.length > 0 ? (doneCount + errorCount) / jobs.length : 0

  return (
    <div className="card space-y-3 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">Progress</span>
          <span className="text-xs text-white/40">
            {doneCount} done · {errorCount} errors · {runningCount} running
          </span>
        </div>
        {runningCount === 0 && (
          <button
            onClick={onClear}
            className="text-xs text-white/30 hover:text-accent transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Overall Progress Bar */}
      <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-300"
          style={{ width: `${totalProgress * 100}%` }}
        />
      </div>

      {/* Job Rows */}
      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
        {jobs.map((job) => {
          const cfg = STATUS_CONFIG[job.status]
          return (
            <div
              key={job.id}
              className="flex items-start gap-2.5 py-1.5 px-2 rounded-lg bg-surface-3/50"
            >
              {/* Status dot */}
              <span className={clsx('w-2 h-2 rounded-full shrink-0 mt-1', cfg.dot)} />

              <div className="flex-1 min-w-0">
                <p className={clsx('text-xs font-medium truncate', cfg.color)}>{job.message}</p>
                <p className="text-xs text-white/20 truncate">
                  {job.inputFile.split(/[\\/]/).pop()}
                </p>
              </div>

              <span
                className={clsx(
                  'text-xs shrink-0 font-mono px-1.5 py-0.5 rounded',
                  job.status === 'done' && 'bg-green-900/40 text-green-400',
                  job.status === 'error' && 'bg-red-900/40 text-red-400',
                  job.status === 'running' && 'bg-yellow-900/40 text-yellow-400',
                  job.status === 'pending' && 'bg-white/5 text-white/30'
                )}
              >
                {cfg.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
