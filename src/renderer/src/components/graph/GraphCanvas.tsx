import { useEffect, useRef, useCallback, useState } from 'react'
import cytoscape, { type Core, type EventObject } from 'cytoscape'
// @ts-expect-error no types available
import nodeHtmlLabel from 'cytoscape-node-html-label'
import { AnimatePresence } from 'motion/react'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { useOntologyStore } from '@renderer/store/ontology'
import { useUIStore } from '@renderer/store/ui'
import { ontologyToCytoscapeElements } from '@renderer/model/cytoscape'
import { getCytoscapeStylesheet } from './graph-styles'
import { renderNodeHtml } from './node-renderer'
import { getLayoutOptions } from './layout'
import { setCyInstance, useCyStore } from './cyRef'
import { useGraphFilters } from '@renderer/hooks/useGraphFilters'
import { ContextMenu, type ContextMenuItem } from './ContextMenu'

// Register extension once
if (typeof cytoscape('core', 'nodeHtmlLabel') !== 'function') {
  nodeHtmlLabel(cytoscape)
}

interface ContextMenuState {
  x: number
  y: number
  items: ContextMenuItem[]
}

export function GraphCanvas(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const isFirstMountRef = useRef(true)
  const ontology = useOntologyStore((s) => s.ontology)
  const addClass = useOntologyStore((s) => s.addClass)
  const removeClass = useOntologyStore((s) => s.removeClass)
  const removeObjectProperty = useOntologyStore((s) => s.removeObjectProperty)
  const setSelectedNode = useUIStore((s) => s.setSelectedNode)
  const setSelectedEdge = useUIStore((s) => s.setSelectedEdge)
  const showDatatypeProperties = useUIStore((s) => s.graphFilters.showDatatypeProperties)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  useGraphFilters()

  // Derive a base namespace from prefixes
  const baseNs = Array.from(ontology.prefixes.entries()).find(
    ([k]) => k !== 'owl' && k !== 'rdf' && k !== 'rdfs' && k !== 'xsd'
  )?.[1] || 'http://example.org/ontology#'

  const baseNsRef = useRef(baseNs)
  useEffect(() => { baseNsRef.current = baseNs }, [baseNs])

  const initCytoscape = useCallback(() => {
    if (!containerRef.current) return

    const elements = ontologyToCytoscapeElements(useOntologyStore.getState().ontology)

    const cy = cytoscape({
      container: containerRef.current,
      elements: elements as cytoscape.ElementDefinition[],
      style: getCytoscapeStylesheet(),
      layout: elements.length > 0 ? getLayoutOptions(useUIStore.getState().graphLayout) : { name: 'preset' },
      minZoom: 0.2,
      maxZoom: 3,
      wheelSensitivity: 0.3
    })

    // HTML labels for card-style nodes
    ;(cy as unknown as { nodeHtmlLabel: (opts: unknown[]) => void }).nodeHtmlLabel([
      {
        query: 'node[type = "class"]:visible',
        halign: 'center',
        valign: 'center',
        cssClass: 'cytoscape-node-html',
        tpl: (data: Record<string, unknown>) => renderNodeHtml(data)
      }
    ])

    // Click handlers
    cy.on('tap', 'node', (evt: EventObject) => {
      setSelectedNode(evt.target.id())
      setSelectedEdge(null)
      setContextMenu(null)
    })

    cy.on('tap', 'edge', (evt: EventObject) => {
      setSelectedEdge(evt.target.id())
      setSelectedNode(null)
      setContextMenu(null)
    })

    cy.on('tap', (evt: EventObject) => {
      if (evt.target === cy) {
        setSelectedNode(null)
        setSelectedEdge(null)
        setContextMenu(null)
      }
    })

    // Right-click on node
    cy.on('cxttap', 'node', (evt: EventObject) => {
      const node = evt.target
      const nodeId = node.id()
      const pos = evt.renderedPosition || evt.position
      setSelectedNode(nodeId)
      setSelectedEdge(null)

      setContextMenu({
        x: pos.x + containerRef.current!.getBoundingClientRect().left,
        y: pos.y + containerRef.current!.getBoundingClientRect().top,
        items: [
          {
            label: 'Add subclass...',
            action: () => {
              const name = prompt('Subclass name:')
              if (name) {
                const uri = `${baseNsRef.current}${name.replace(/\s+/g, '')}`
                addClass(uri, { label: name, subClassOf: [nodeId] })
              }
            }
          },
          { label: '', action: () => {}, separator: true },
          {
            label: 'Delete class',
            destructive: true,
            action: () => removeClass(nodeId)
          }
        ]
      })
    })

    // Right-click on edge
    cy.on('cxttap', 'edge', (evt: EventObject) => {
      const edge = evt.target
      const edgeData = edge.data()
      const pos = evt.renderedPosition || evt.position

      const items: ContextMenuItem[] = []
      if (edgeData.type === 'objectProperty' && edgeData.uri) {
        items.push({
          label: 'Delete property',
          destructive: true,
          action: () => removeObjectProperty(edgeData.uri)
        })
      }

      if (items.length > 0) {
        setContextMenu({
          x: pos.x + containerRef.current!.getBoundingClientRect().left,
          y: pos.y + containerRef.current!.getBoundingClientRect().top,
          items
        })
      }
    })

    // Right-click on canvas
    cy.on('cxttap', (evt: EventObject) => {
      if (evt.target === cy) {
        const pos = evt.renderedPosition || evt.position
        setContextMenu({
          x: pos.x + containerRef.current!.getBoundingClientRect().left,
          y: pos.y + containerRef.current!.getBoundingClientRect().top,
          items: [
            {
              label: 'Add class...',
              action: () => {
                const name = prompt('Class name:')
                if (name) {
                  const uri = `${baseNsRef.current}${name.replace(/\s+/g, '')}`
                  addClass(uri, { label: name })
                }
              }
            }
          ]
        })
      }
    })

    cyRef.current = cy
    setCyInstance(cy)

    return () => {
      cyRef.current = null
      setCyInstance(null)
      cy.destroy()
    }
  }, [setSelectedNode, setSelectedEdge, addClass, removeClass, removeObjectProperty])

  useEffect(() => {
    const cleanup = initCytoscape()
    return cleanup
  }, [initCytoscape])

  // Incremental graph updates — preserves node positions on data-only changes
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false
      return
    }
    const cy = cyRef.current
    if (!cy) return

    const newElements = ontologyToCytoscapeElements(ontology)
    const newElementMap = new Map(newElements.map((el) => [el.data.id as string, el]))

    // Remove elements no longer in the ontology
    let structureChanged = false
    cy.elements().forEach((el) => {
      if (!newElementMap.has(el.id())) {
        el.remove()
        structureChanged = true
      }
    })

    // Update existing / collect new
    const toAdd: cytoscape.ElementDefinition[] = []
    for (const el of newElements) {
      const id = el.data.id as string
      const existing = cy.getElementById(id)
      if (existing.length > 0) {
        existing.data(el.data)
      } else {
        toAdd.push(el as cytoscape.ElementDefinition)
        structureChanged = true
      }
    }

    if (toAdd.length > 0) cy.add(toAdd)
    if (structureChanged) cy.layout(getLayoutOptions(useUIStore.getState().graphLayout)).run()
  }, [ontology])


  const cy = useCyStore((s) => s.instance)

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className={`w-full h-full${showDatatypeProperties ? '' : ' hide-dt-props'}`}
        style={{ background: 'var(--graph-bg)' }}
      />
      <div className="absolute bottom-4 left-4 flex flex-col gap-1">
        <ZoomButton icon={<ZoomIn size={14} />} title="Zoom in" onClick={() => cy?.animate({ zoom: { level: cy.zoom() * 1.3, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } } }, { duration: 200, easing: 'ease-in-out-cubic' })} />
        <ZoomButton icon={<ZoomOut size={14} />} title="Zoom out" onClick={() => cy?.animate({ zoom: { level: cy.zoom() / 1.3, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } } }, { duration: 200, easing: 'ease-in-out-cubic' })} />
        <ZoomButton icon={<Maximize2 size={14} />} title="Fit to screen" onClick={() => cy?.animate({ fit: { eles: cy.elements(), padding: 40 } }, { duration: 300, easing: 'ease-in-out-cubic' })} />
      </div>
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={contextMenu.items}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function ZoomButton({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-md bg-card/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shadow-sm"
    >
      {icon}
    </button>
  )
}
