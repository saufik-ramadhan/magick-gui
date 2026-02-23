import { clsx } from 'clsx'
import type { MagickCheckResult } from '../../../../types/ipc'

interface StatusBarProps {
  magickStatus: MagickCheckResult | null
}

export default function StatusBar({ magickStatus }: StatusBarProps): JSX.Element {
  return (
    <footer className="h-7 bg-surface-2 border-t border-white/5 flex items-center px-4 gap-4 text-xs shrink-0">
      {/* ImageMagick status */}
      <div className="flex items-center gap-1.5">
        <span
          className={clsx(
            'w-1.5 h-1.5 rounded-full',
            magickStatus === null
              ? 'bg-yellow-400 animate-pulse'
              : magickStatus.available
                ? 'bg-green-400'
                : 'bg-red-400'
          )}
        />
        <span className="text-white/40">
          {magickStatus === null
            ? 'Checking ImageMagick…'
            : magickStatus.available
              ? `ImageMagick ${magickStatus.version}${magickStatus.isV7 ? ' ✓' : ' (v6 detected — v7 recommended)'}`
              : 'ImageMagick not found — install from imagemagick.org'}
        </span>
      </div>

      <span className="text-white/10">|</span>

      <span className="text-white/25">magick CLI backend</span>
    </footer>
  )
}
