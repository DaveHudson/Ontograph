import { useState } from 'react'
import {
  Sun, Moon, Bot, FolderOpen, Save, SaveAll, PanelRight, ChevronDown, SlidersHorizontal
} from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { useUIStore } from '@renderer/store/ui'
import { useClaude } from '../chat/useClaude'
import { GraphControlsPanel } from './GraphControlsPanel'
import { GraphSearchBar } from './GraphSearchBar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ToolbarProps {
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
}

export function Toolbar({ onOpen, onSave, onSaveAs }: ToolbarProps): React.JSX.Element {
  const theme = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const sidebarVisible = useUIStore((s) => s.sidebarVisible)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)

  const { authMode, setAuthMode, apiKey, setApiKey, cliDetected, isReady } = useClaude()

  const [showGraphControls, setShowGraphControls] = useState(false)

  return (
    <div className="h-10 border-b border-border bg-card/80 backdrop-blur-sm flex items-center gap-1 shrink-0 app-drag-region relative z-50" style={{ paddingLeft: 78, paddingRight: 12 }}>
      {/* macOS traffic lights occupy ~78px */}

      {/* File ops */}
      <Button variant="ghost" size="icon" className="size-8" title="Open (⌘O)" onClick={onOpen}>
        <FolderOpen />
      </Button>
      <Button variant="ghost" size="icon" className="size-8" title="Save (⌘S)" onClick={onSave}>
        <Save />
      </Button>
      <Button variant="ghost" size="icon" className="size-8" title="Save As (⇧⌘S)" onClick={onSaveAs}>
        <SaveAll />
      </Button>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Claude auth */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="h-8 px-2 gap-1.5 text-muted-foreground" title="Claude settings">
            <Bot className="size-4" />
            <span className={cn('size-1.5 rounded-full', isReady ? 'bg-success' : 'bg-muted-foreground/40')} />
            <ChevronDown className="size-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 space-y-2" align="start">
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={authMode === 'max' ? 'default' : 'secondary'}
              onClick={() => setAuthMode('max')}
              className="text-xs h-7 flex-1"
            >
              Claude Max
            </Button>
            <Button
              size="sm"
              variant={authMode === 'api-key' ? 'default' : 'secondary'}
              onClick={() => setAuthMode('api-key')}
              className="text-xs h-7 flex-1"
            >
              API Key
            </Button>
          </div>

          {authMode === 'max' && (
            <p className="text-xs text-muted-foreground">
              {cliDetected
                ? '✓ Claude CLI detected. Using your Max subscription.'
                : '✗ Claude CLI not found. Install Claude Code and log in.'}
            </p>
          )}

          {authMode === 'api-key' && (
            <div className="space-y-1.5">
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="h-8 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Stored locally. Used to call the Claude API directly.
              </p>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Graph controls */}
      <Popover open={showGraphControls} onOpenChange={setShowGraphControls}>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="h-8 px-2 gap-1.5 text-muted-foreground" title="Graph controls">
            <SlidersHorizontal className="size-4" />
            <ChevronDown className="size-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-72" align="start">
          <AnimatePresence>
            {showGraphControls && (
              <GraphControlsPanel onClose={() => setShowGraphControls(false)} />
            )}
          </AnimatePresence>
        </PopoverContent>
      </Popover>

      <div className="flex-1 flex justify-center">
        <GraphSearchBar />
      </div>

      {/* Theme toggle */}
      <Button variant="ghost" size="icon" className="size-8" title="Toggle theme" onClick={toggleTheme}>
        {theme === 'dark' ? <Sun /> : <Moon />}
      </Button>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className={cn('size-8', sidebarVisible && 'text-foreground bg-secondary')}
        title="Toggle sidebar"
        onClick={toggleSidebar}
      >
        <PanelRight />
      </Button>
    </div>
  )
}
