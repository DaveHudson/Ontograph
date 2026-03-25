import { useEffect, useCallback } from 'react'
import { GraphCanvas } from './components/graph/GraphCanvas'
import { DetailPanel } from './components/detail/DetailPanel'
import { ValidationPanel } from './components/validation/ValidationPanel'
import { ChatPanel } from './components/chat/ChatPanel'
import { StatusBar } from './components/status-bar/StatusBar'
import { useOntologyStore } from './store/ontology'
import { useUIStore } from './store/ui'
import './components/graph/graph-node-styles.css'
import peopleTtl from './samples/people.ttl?raw'

function App(): React.JSX.Element {
  const ontology = useOntologyStore((s) => s.ontology)
  const loadFromTurtle = useOntologyStore((s) => s.loadFromTurtle)
  const exportToTurtle = useOntologyStore((s) => s.exportToTurtle)
  const setFilePath = useOntologyStore((s) => s.setFilePath)
  const markClean = useOntologyStore((s) => s.markClean)
  const selectedNodeId = useUIStore((s) => s.selectedNodeId)
  const selectedEdgeId = useUIStore((s) => s.selectedEdgeId)
  const setSelectedNode = useUIStore((s) => s.setSelectedNode)
  const setSelectedEdge = useUIStore((s) => s.setSelectedEdge)
  const removeClass = useOntologyStore((s) => s.removeClass)

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
      // Escape — deselect
      if (e.key === 'Escape') {
        setSelectedNode(null)
        setSelectedEdge(null)
      }

      // Delete/Backspace — delete selected node (when not in an input)
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          removeClass(selectedNodeId)
          setSelectedNode(null)
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedNodeId, setSelectedNode, setSelectedEdge, removeClass])

  const classCount = ontology.classes.size
  const hasContent = classCount > 0
  const hasSelection = selectedNodeId !== null || selectedEdgeId !== null

  return (
    <div className="flex h-full w-full">
      {/* Graph Canvas - main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 relative">
          {hasContent ? (
            <GraphCanvas />
          ) : (
            <div className="w-full h-full bg-[var(--graph-bg)] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <h1 className="text-2xl font-semibold mb-2">Ontograph</h1>
                <p className="text-sm mb-4">
                  Open a .ttl file or start chatting with Claude to create an ontology
                </p>
                <button
                  onClick={() => loadFromTurtle(peopleTtl, 'Sample: people.ttl')}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
                >
                  Load sample ontology
                </button>
              </div>
            </div>
          )}
        </div>

        <StatusBar />
      </div>

      {/* Right Sidebar */}
      <div className="w-80 border-l border-border bg-card flex flex-col shrink-0">
        {/* Detail Panel (when something selected) */}
        {hasSelection && (
          <div className="border-b border-border overflow-y-auto max-h-[50%]">
            <div className="px-3 py-2 border-b border-border bg-card sticky top-0">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Properties
              </h2>
            </div>
            <DetailPanel />
          </div>
        )}

        {/* Chat Panel */}
        <ChatPanel />

        {/* Validation Panel */}
        {hasContent && (
          <div className="border-t border-border">
            <div className="px-3 py-2 border-b border-border">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Validation
              </h2>
            </div>
            <ValidationPanel />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
