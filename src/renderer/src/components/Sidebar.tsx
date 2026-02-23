import { clsx } from 'clsx'

type Tab = 'convert' | 'crop' | 'watermark' | 'bgremove'

interface SidebarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

interface NavItem {
  id: Tab
  label: string
  icon: React.ReactNode
  description: string
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'convert',
    label: 'Convert',
    description: 'Change image format',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
        />
      </svg>
    )
  },
  {
    id: 'crop',
    label: 'Crop',
    description: 'Crop to aspect ratio',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M3 3h3v12H3V3zm15 0h3v12h-3V3zM6 18v3H3m18-3v3h-3M6 3H3v3m18-3h-3v3M6 18h12"
        />
        <rect x="6" y="6" width="12" height="12" strokeWidth={1.8} rx="1" />
      </svg>
    )
  },
  {
    id: 'watermark',
    label: 'Watermark',
    description: 'Text or image overlay',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
        <circle cx="16" cy="8" r="2" strokeWidth={1.8} />
      </svg>
    )
  },
  {
    id: 'bgremove',
    label: 'BG Remove',
    description: 'Remove background',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        <line x1="2" y1="2" x2="22" y2="22" strokeWidth={1.8} strokeLinecap="round" />
      </svg>
    )
  }
]

export default function Sidebar({ activeTab, onTabChange }: SidebarProps): JSX.Element {
  return (
    <aside className="w-52 bg-surface-2 border-r border-white/5 flex flex-col py-4 shrink-0">
      {/* Logo */}
      <div className="px-5 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H5.5z" />
            </svg>
          </div>
          <span className="font-bold text-white text-sm tracking-wide">MagickGUI</span>
        </div>
        <p className="text-white/30 text-xs mt-1 leading-tight">ImageMagick 7 Wrapper</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-1">
        <p className="label-base px-3 mb-3">Tools</p>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group',
              activeTab === item.id
                ? 'bg-accent/20 text-accent border border-accent/30'
                : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
            )}
          >
            <span
              className={clsx(
                'transition-colors',
                activeTab === item.id ? 'text-accent' : 'text-white/40 group-hover:text-white/70'
              )}
            >
              {item.icon}
            </span>
            <div>
              <div className="text-sm font-medium leading-none">{item.label}</div>
              <div className="text-xs text-white/30 mt-0.5 leading-none">{item.description}</div>
            </div>
          </button>
        ))}
      </nav>

      {/* Footer link */}
      <div className="px-5 mt-4">
        <a
          href="https://imagemagick.org/script/command-line-options.php"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-white/25 hover:text-white/50 transition-colors"
        >
          CLI Reference ↗
        </a>
      </div>
    </aside>
  )
}
