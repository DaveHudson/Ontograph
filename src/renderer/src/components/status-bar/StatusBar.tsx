import { useMemo, useState, useRef, useEffect } from 'react'
import { useOntologyStore } from '@renderer/store/ontology'
import { useUIStore } from '@renderer/store/ui'
import { serializeToTurtle } from '@renderer/model/serialize'
import { estimateTokenCount } from '@renderer/services/tokens'
import { validateOntology, type ValidationError } from '@renderer/services/validation'

function localName(uri: string): string {
  const idx = Math.max(uri.lastIndexOf('#'), uri.lastIndexOf('/'))
  return idx >= 0 ? uri.substring(idx + 1) : uri
}

export function StatusBar(): React.JSX.Element {
  const ontology = useOntologyStore((s) => s.ontology)
  const filePath = useOntologyStore((s) => s.filePath)
  const isDirty = useOntologyStore((s) => s.isDirty)
  const setSelectedNode = useUIStore((s) => s.setSelectedNode)
  const setSelectedEdge = useUIStore((s) => s.setSelectedEdge)

  const classCount = ontology.classes.size
  const propCount = ontology.objectProperties.size + ontology.datatypeProperties.size

  const tokenCount = useMemo(() => {
    if (classCount === 0) return 0
    const turtle = serializeToTurtle(ontology)
    return estimateTokenCount(turtle)
  }, [ontology, classCount])

  const errors = useMemo(() => validateOntology(ontology), [ontology])
  const errorCount = errors.filter((e) => e.severity === 'error').length
  const warnCount = errors.filter((e) => e.severity === 'warning').length

  const [popoverOpen, setPopoverOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!popoverOpen) return
    function handleClick(e: MouseEvent): void {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [popoverOpen])

  function handleErrorClick(error: ValidationError): void {
    if (error.elementType === 'class') {
      setSelectedNode(error.elementUri)
      setSelectedEdge(null)
    }
    setPopoverOpen(false)
  }

  const tokenDisplay = tokenCount > 0 ? `~${tokenCount.toLocaleString()} tokens` : '0 tokens'
  const hasIssues = errors.length > 0

  return (
    <div className="h-7 border-t border-border bg-card px-3 flex items-center text-xs text-muted-foreground gap-4 shrink-0 relative">
      <span>{filePath ? `${filePath}${isDirty ? ' *' : ''}` : 'No file open'}</span>

      <span className="ml-auto flex items-center gap-4">
        {!hasIssues && classCount > 0 && (
          <span className="text-green-700/50 dark:text-green-500/40">No issues</span>
        )}

        {hasIssues && (
          <span className="relative">
            <button
              ref={buttonRef}
              onClick={() => setPopoverOpen((v) => !v)}
              className="text-red-500 hover:text-red-400 transition-colors cursor-pointer font-medium"
            >
              {errorCount > 0 && `${errorCount} error${errorCount !== 1 ? 's' : ''}`}
              {errorCount > 0 && warnCount > 0 && ' · '}
              {warnCount > 0 && `${warnCount} warning${warnCount !== 1 ? 's' : ''}`}
            </button>

            {popoverOpen && (
              <div
                ref={popoverRef}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-80 bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden"
              >
                {errors.map((error, i) => (
                  <button
                    key={i}
                    onClick={() => handleErrorClick(error)}
                    className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex gap-2 items-start border-b border-border last:border-0"
                  >
                    <span className={error.severity === 'error' ? 'text-destructive' : 'text-yellow-500'}>
                      {error.severity === 'error' ? '●' : '▲'}
                    </span>
                    <span className="text-xs leading-relaxed">
                      <span className="text-muted-foreground font-medium">{localName(error.elementUri)}:</span>{' '}
                      <span className="text-foreground">{error.message}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </span>
        )}

        <span>{classCount} classes &middot; {propCount} properties &middot; {tokenDisplay}</span>
      </span>
    </div>
  )
}
