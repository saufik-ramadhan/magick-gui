import { useState, useEffect } from 'react'
import ConvertPanel from './components/ConvertPanel'
import CropPanel from './components/CropPanel'
import WatermarkPanel from './components/WatermarkPanel'
import BgRemovePanel from './components/BgRemovePanel'
import Sidebar from './components/Sidebar'
import StatusBar from './components/StatusBar'
import type { MagickCheckResult } from '../../../types/ipc'

type Tab = 'convert' | 'crop' | 'watermark' | 'bgremove'

export default function App(): JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('convert')
  const [magickStatus, setMagickStatus] = useState<MagickCheckResult | null>(null)

  useEffect(() => {
    window.magickAPI.checkMagick().then(setMagickStatus)
  }, [])

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'convert' && <ConvertPanel />}
          {activeTab === 'crop' && <CropPanel />}
          {activeTab === 'watermark' && <WatermarkPanel />}
          {activeTab === 'bgremove' && <BgRemovePanel />}
        </main>
      </div>

      {/* Status Bar */}
      <StatusBar magickStatus={magickStatus} />
    </div>
  )
}
