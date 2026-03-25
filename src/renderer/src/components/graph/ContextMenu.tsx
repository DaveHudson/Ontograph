import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'

export interface ContextMenuItem {
  label: string
  action: () => void
  destructive?: boolean
  separator?: boolean
}

interface Props {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: Props): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleEsc(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  return (
    <motion.div
      ref={ref}
      className="fixed z-50 min-w-[160px] bg-popover border border-border rounded-lg shadow-lg py-1 text-sm"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.1, ease: 'easeOut' }}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="h-px bg-border my-1" />
        ) : (
          <button
            key={i}
            onClick={() => {
              item.action()
              onClose()
            }}
            className={`w-full text-left px-3 py-1.5 hover:bg-accent transition-colors ${
              item.destructive ? 'text-destructive-foreground' : ''
            }`}
          >
            {item.label}
          </button>
        )
      )}
    </motion.div>
  )
}
