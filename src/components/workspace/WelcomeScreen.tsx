import { Upload, GitBranch, Activity, Zap } from 'lucide-react'
import { modKey } from '@/lib/platform'

interface WelcomeScreenProps {
  onOpenFile: () => void
}

export function WelcomeScreen({ onOpenFile }: WelcomeScreenProps) {
  return (
    <div className="flex-1 flex items-center justify-center pointer-events-none">
      <div className="text-center space-y-6 max-w-sm">
        {/* App name + tagline */}
        <div className="flex items-center gap-4">
          <img src="/lorewalker.svg" alt="Lorewalker" className="h-40 w-40 shrink-0" />
          <div className="text-left space-y-1">
            <h1 className="text-3xl font-bold text-ctp-accent">Lorewalker</h1>
            <p className="text-sm text-ctp-subtext0">
              Lorebook editor, visualizer &amp; analyzer
            </p>
          </div>
        </div>

        {/* Drag-drop zone */}
        <div className="pointer-events-auto border-2 border-dashed border-ctp-surface1 hover:border-ctp-accent/60 rounded-xl p-8 transition-colors group cursor-pointer">
          <Upload size={32} className="mx-auto mb-3 text-ctp-overlay0 group-hover:text-ctp-accent transition-colors" />
          <p className="text-sm font-medium text-ctp-subtext0 group-hover:text-ctp-text transition-colors">
            Drop a lorebook here
          </p>
          <p className="text-xs text-ctp-overlay0 mt-1">JSON, PNG, or .charx</p>
        </div>

        {/* Open file button */}
        <button
          onClick={onOpenFile}
          className="pointer-events-auto px-4 py-2 text-sm bg-ctp-accent text-ctp-base rounded-lg hover:bg-ctp-accent/80 transition-colors font-medium"
        >
          Open file
        </button>

        {/* Feature bullets */}
        <div className="space-y-2 text-left w-fit mx-auto">
          <div className="flex items-center gap-2 text-xs text-ctp-subtext0">
            <GitBranch size={13} className="text-ctp-mauve shrink-0" />
            <span>Graph visualization of entry connections</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-ctp-subtext0">
            <Activity size={13} className="text-ctp-green shrink-0" />
            <span>Real-time health analysis &amp; scoring</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-ctp-subtext0">
            <Zap size={13} className="text-ctp-yellow shrink-0" />
            <span>Activation simulator with ST engine</span>
          </div>
        </div>

        {/* Keyboard hint */}
        <p className="text-[10px] text-ctp-overlay0">
          {modKey}+O to open &nbsp;·&nbsp; {modKey}+S to save &nbsp;·&nbsp; {modKey}+Z to undo
        </p>
      </div>
    </div>
  )
}
