import { useEffect, useCallback, useRef, useState } from 'react'
import { GraphCanvas } from './components/graph/GraphCanvas'
import { DetailPanel } from './components/detail/DetailPanel'
import { ChatPanel } from './components/chat/ChatPanel'
import { EvalPanel } from './components/eval/EvalPanel'
import { ActivityBar } from './components/activity-bar/ActivityBar'
import { ImprovementHUD } from './components/hud/ImprovementHUD'
import { StatusBar } from './components/status-bar/StatusBar'
import { Toolbar } from './components/toolbar/Toolbar'
import { GraphControlsPanel } from './components/toolbar/GraphControlsPanel'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './components/ui/resizable'
import { Button } from './components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from './components/ui/popover'
import type { PanelImperativeHandle } from 'react-resizable-panels'
import { SlidersHorizontal, ChevronDown } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { useOntologyStore } from './store/ontology'
import { useUIStore } from './store/ui'
import { useHistoryStore } from './store/history'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from './components/ui/empty'
import { UpdateBanner } from './components/UpdateBanner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './components/ui/dialog'
import { MousePointer2 } from 'lucide-react'
import peopleTtl from './samples/people.ttl?raw'

function App(): React.JSX.Element {
  const ontology = useOntologyStore((s) => s.ontology)
  const loadFromTurtle = useOntologyStore((s) => s.loadFromTurtle)
  const exportToTurtle = useOntologyStore((s) => s.exportToTurtle)
  const setFilePath = useOntologyStore((s) => s.setFilePath)
  const markClean = useOntologyStore((s) => s.markClean)
  const isDirty = useOntologyStore((s) => s.isDirty)
  const resetOntology = useOntologyStore((s) => s.reset)
  const selectedNodeId = useUIStore((s) => s.selectedNodeId)
  const selectedEdgeId = useUIStore((s) => s.selectedEdgeId)
  const setSelectedNode = useUIStore((s) => s.setSelectedNode)
  const setSelectedEdge = useUIStore((s) => s.setSelectedEdge)
  const removeClass = useOntologyStore((s) => s.removeClass)
  const undo = useHistoryStore((s) => s.undo)
  const canUndo = useHistoryStore((s) => s.canUndo)

  const handleOpen = useCallback(async () => {
    const result = await window.api.openFile()
    if (result) {
      loadFromTurtle(result.content, result.filePath)
    }
  }, [loadFromTurtle])

  const handleSave = useCallback(async () => {
    const turtle = exportToTurtle()
    const currentPath = useOntologyStore.getState().filePath
    if (currentPath && !currentPath.startsWith('sample://') && !currentPath.startsWith('Sample:')) {
      await window.api.saveFile(currentPath, turtle)
      markClean()
    } else {
      const newPath = await window.api.saveFileAs(turtle)
      if (newPath) {
        setFilePath(newPath)
        markClean()
      }
    }
  }, [exportToTurtle, setFilePath, markClean])

  const handleSaveAs = useCallback(async () => {
    const turtle = exportToTurtle()
    const newPath = await window.api.saveFileAs(turtle)
    if (newPath) {
      setFilePath(newPath)
      markClean()
    }
  }, [exportToTurtle, setFilePath, markClean])

  // Menu events
  useEffect(() => {
    const cleanups = [
      window.api.onMenuFileOpen(handleOpen),
      window.api.onMenuFileSave(handleSave),
      window.api.onMenuFileSaveAs(handleSaveAs)
    ]
    return () => cleanups.forEach((fn) => fn())
  }, [handleOpen, handleSave, handleSaveAs])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      const target = e.target as HTMLElement
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'

      if (e.key === 'Escape') {
        setSelectedNode(null)
        setSelectedEdge(null)
      }

      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey && !inInput && canUndo) {
        e.preventDefault()
        undo()
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId && !inInput) {
        e.preventDefault()
        removeClass(selectedNodeId)
        setSelectedNode(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedNodeId, setSelectedNode, setSelectedEdge, removeClass, undo, canUndo])

  const sidebarVisible = useUIStore((s) => s.sidebarVisible)
  const sidebarRef = useRef<PanelImperativeHandle>(null)

  useEffect(() => {
    if (sidebarVisible) {
      sidebarRef.current?.expand()
    } else {
      sidebarRef.current?.collapse()
    }
  }, [sidebarVisible])

  const activeTab = useUIStore((s) => s.sidebarTab)
  const setActiveTab = useUIStore((s) => s.setSidebarTab)

  const [showNewDialog, setShowNewDialog] = useState(false)
  const [showGraphControls, setShowGraphControls] = useState(false)

  const handleNew = useCallback(() => {
    if (isDirty) {
      setShowNewDialog(true)
    } else {
      resetOntology()
    }
  }, [isDirty, resetOntology])

  const hasContent = ontology.classes.size > 0
  const hasSelection = selectedNodeId !== null || selectedEdgeId !== null

  return (
    <div className="flex flex-col h-full w-full">
      <UpdateBanner />
      <Toolbar onNew={handleNew} onOpen={handleOpen} onSave={handleSave} onSaveAs={handleSaveAs} />

      <ResizablePanelGroup orientation="horizontal" className="flex-1 overflow-hidden" id="main-layout">
        {/* Graph Canvas */}
        <ResizablePanel id="graph-panel" defaultSize="70%" minSize="30%" order={1}>
          <div className="relative w-full h-full">
            {/* Graph controls overlay — top left */}
            <div className="absolute top-2 left-2 z-10">
              <Popover open={showGraphControls} onOpenChange={setShowGraphControls}>
                <PopoverTrigger asChild>
                  <Button variant="secondary" className="h-8 px-2 gap-1.5 shadow-sm" title="Graph filters">
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
            </div>

            {hasContent ? (
              <GraphCanvas />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--graph-bg)' }}>
                <div className="text-center text-muted-foreground">
                  <h1 className="text-2xl font-semibold mb-2">Ontograph</h1>
                  <p className="text-sm mb-4">
                    Open a .ttl file or start chatting with Claude to create an ontology
                  </p>
                  <Button onClick={() => loadFromTurtle(peopleTtl, 'Sample: people.ttl')}>
                    Load sample ontology
                  </Button>
                </div>
              </div>
            )}
            <ImprovementHUD />
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Sidebar */}
        <ResizablePanel
          id="sidebar-panel"
          defaultSize="30%"
          minSize="15%"
          maxSize="60%"
          collapsible
          collapsedSize={0}
          panelRef={sidebarRef}
          order={2}
        >
          <div className="flex h-full bg-background">
            {/* Panel content */}
            <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
              <div className={activeTab !== 'properties' ? 'hidden' : 'flex-1 overflow-y-auto'}>
                {hasSelection ? (
                  <DetailPanel />
                ) : (
                  <Empty className="border-0 p-4">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <MousePointer2 />
                      </EmptyMedia>
                      <EmptyTitle className="text-sm font-medium">No selection</EmptyTitle>
                      <EmptyDescription className="text-xs">
                        Select a node or edge to view and edit its properties.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </div>
              <div className={activeTab !== 'chat' ? 'hidden' : 'flex-1 min-h-0 flex flex-col'}>
                <ChatPanel />
              </div>
              <div className={activeTab !== 'eval' ? 'hidden' : 'flex-1 min-h-0 flex flex-col'}>
                <EvalPanel />
              </div>
            </div>

            {/* Activity bar */}
            <ActivityBar activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <StatusBar />

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. What would you like to do?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={async () => { await handleSave(); resetOntology(); setShowNewDialog(false) }}>
              Save & New
            </Button>
            <Button variant="destructive" onClick={() => { resetOntology(); setShowNewDialog(false) }}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App
