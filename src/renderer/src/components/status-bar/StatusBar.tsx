import { useMemo } from 'react'
import { useOntologyStore } from '@renderer/store/ontology'
import { serializeToTurtle } from '@renderer/model/serialize'
import { estimateTokenCount } from '@renderer/services/tokens'

export function StatusBar(): React.JSX.Element {
  const ontology = useOntologyStore((s) => s.ontology)
  const filePath = useOntologyStore((s) => s.filePath)
  const isDirty = useOntologyStore((s) => s.isDirty)

  const classCount = ontology.classes.size
  const propCount = ontology.objectProperties.size + ontology.datatypeProperties.size

  const tokenCount = useMemo(() => {
    if (classCount === 0) return 0
    const turtle = serializeToTurtle(ontology)
    return estimateTokenCount(turtle)
  }, [ontology, classCount])

  const tokenDisplay = tokenCount > 0 ? `~${tokenCount.toLocaleString()} tokens` : '0 tokens'

  return (
    <div className="h-7 border-t border-border bg-card px-3 flex items-center text-xs text-muted-foreground gap-4 shrink-0">
      <span>{filePath ? `${filePath}${isDirty ? ' *' : ''}` : 'No file open'}</span>
      <span className="ml-auto">
        {classCount} classes &middot; {propCount} properties &middot; {tokenDisplay}
      </span>
    </div>
  )
}
