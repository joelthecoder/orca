import { useRef, useState } from 'react'
import { Cable, Folder, GitBranch, Terminal, Unplug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PatchCable } from './PatchCable'
import { PatchColorPicker } from './PatchColorPicker'
import { usePatchGeometry } from './use-patch-geometry'
import {
  connectPatch,
  type PatchColor,
  type PatchConnection,
  type PatchEndpoint,
  type PatchPoint
} from './patch-bay-model'
import './patch-bay.css'

type PatchBayProps = {
  endpoints: PatchEndpoint[]
  initialConnections?: PatchConnection[]
  example?: boolean
}
const EMPTY_CONNECTIONS: PatchConnection[] = []

export function PatchBay({
  endpoints,
  initialConnections = EMPTY_CONNECTIONS,
  example = false
}: PatchBayProps): React.JSX.Element {
  const [connections, setConnections] = useState(initialConnections)
  const [color, setColor] = useState<PatchColor>('orange')
  const [selected, setSelected] = useState<string | null>(null)
  const [pointer, setPointer] = useState<PatchPoint | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const dragRef = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null)
  const suppressClickRef = useRef(false)
  const { boardRef, svgRef, geometry, pointFromClient } = usePatchGeometry(
    endpoints.map((e) => e.id).join('|')
  )
  const byId = new Map(endpoints.map((endpoint) => [endpoint.id, endpoint]))
  const visibleConnections = connections.filter((c) => byId.has(c.from) && byId.has(c.to))
  const selectedEndpoint = selected ? byId.get(selected) : undefined
  const fromPoint = selected ? geometry.ports.get(selected) : undefined

  function connect(from: string, to: string): void {
    if (from === to) {
      setSelected(null)
      setPointer(null)
      return
    }
    setConnections((current) => connectPatch(current, from, to, color))
    setAnnouncement(
      `Preview cable: ${byId.get(from)?.name} to ${byId.get(to)?.name}. No message sent.`
    )
    setSelected(null)
    setPointer(null)
  }

  function activate(id: string): void {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (selected) {
      connect(selected, id)
    } else {
      setSelected(id)
    }
  }

  return (
    <section
      className="patch-bay"
      aria-label="Patch bay prototype"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && selected) {
          event.preventDefault()
          event.stopPropagation()
          setSelected(null)
          setPointer(null)
        }
      }}
    >
      <header className="patch-header">
        <div className="flex items-center gap-3">
          <Cable className="size-5 text-muted-foreground" />
          <div>
            <h2 className="text-base font-semibold">Patch bay</h2>
            <p className="text-xs text-muted-foreground">A little closer to working together.</p>
          </div>
        </div>
        <span className="patch-prototype-label">UX prototype</span>
      </header>
      <div className="patch-controls">
        <p className="text-xs text-muted-foreground">
          Drag a jack to another session. Or click two jacks.
        </p>
        <PatchColorPicker color={color} onChange={setColor} />
      </div>
      <div
        className="patch-rack"
        ref={boardRef}
        onPointerMove={(event) => {
          const drag = dragRef.current
          if (!selected && !drag) {
            return
          }
          if (drag && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 4) {
            drag.moved = true
            setSelected(drag.id)
          }
          setPointer(pointFromClient(event.clientX, event.clientY))
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current
          dragRef.current = null
          if (!drag?.moved) {
            return
          }
          suppressClickRef.current = true
          const target = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest<HTMLElement>('[data-patch-port]')?.dataset.patchPort
          if (target) {
            connect(drag.id, target)
          } else {
            setSelected(null)
            setPointer(null)
          }
        }}
        onPointerCancel={() => {
          dragRef.current = null
          setSelected(null)
          setPointer(null)
        }}
      >
        <div className="patch-rack-label">
          <span>SESSION PATCH / 01</span>
          <span>{example ? 'EXAMPLE SESSIONS' : 'YOUR SESSIONS'}</span>
        </div>
        <div className="patch-endpoints">
          {endpoints.map((endpoint, index) => {
            const side = index % 2 === 0 ? 'left' : 'right'
            const Icon =
              endpoint.kind === 'folder'
                ? Folder
                : endpoint.kind === 'worktree'
                  ? GitBranch
                  : Terminal
            const count = visibleConnections.filter(
              (c) => c.from === endpoint.id || c.to === endpoint.id
            ).length
            return (
              <div className="patch-endpoint" key={endpoint.id} data-side={side}>
                <div className="patch-endpoint-copy">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="size-3.5" />
                    <span className="truncate text-xs">{endpoint.workspace}</span>
                  </div>
                  <h3 className="truncate text-sm font-medium">{endpoint.name}</h3>
                  <p className="truncate text-xs text-muted-foreground">{endpoint.detail}</p>
                </div>
                <button
                  className="patch-jack"
                  type="button"
                  data-patch-port={endpoint.id}
                  data-patch-side={side}
                  data-patched={count > 0}
                  aria-label={`Patch ${endpoint.name}`}
                  aria-pressed={selected === endpoint.id}
                  onClick={() => activate(endpoint.id)}
                  onPointerDown={(event) => {
                    if (event.button !== 0) {
                      return
                    }
                    suppressClickRef.current = false
                    dragRef.current = {
                      id: endpoint.id,
                      x: event.clientX,
                      y: event.clientY,
                      moved: false
                    }
                    event.currentTarget.setPointerCapture(event.pointerId)
                  }}
                >
                  <span className="patch-jack-ring">
                    <span />
                  </span>
                </button>
                <span className="patch-port-number">{String(index + 1).padStart(2, '0')}</span>
              </div>
            )
          })}
        </div>
        <svg
          ref={svgRef}
          className="patch-cables"
          viewBox={`0 0 ${geometry.width} ${geometry.height}`}
          aria-hidden="true"
        >
          {visibleConnections.map((connection) => {
            const from = geometry.ports.get(connection.from)
            const to = geometry.ports.get(connection.to)
            return from && to ? (
              <PatchCable
                key={`${connection.from}:${connection.to}`}
                from={from}
                to={to}
                color={connection.color}
              />
            ) : null
          })}
          {fromPoint && pointer ? (
            <PatchCable
              from={fromPoint}
              to={{ ...pointer, direction: -fromPoint.direction }}
              color={color}
              draft
            />
          ) : null}
        </svg>
        <div className="patch-rack-caption">
          {selectedEndpoint
            ? `Choose a jack for ${selectedEndpoint.name} · Esc to cancel`
            : 'Independent sessions. Shared ideas.'}
        </div>
      </div>
      <footer className="patch-footer">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xs font-medium">
            {visibleConnections.length} preview{' '}
            {visibleConnections.length === 1 ? 'connection' : 'connections'}
          </h3>
          <Button
            variant="ghost"
            size="xs"
            disabled={visibleConnections.length === 0}
            onClick={() => setConnections([])}
          >
            Unplug all
          </Button>
        </div>
        <div className="patch-connection-list">
          {visibleConnections.map((connection) => (
            <div key={`${connection.from}:${connection.to}`} className="patch-connection">
              <span
                className="patch-connection-dot"
                style={{ background: `var(--patch-${connection.color})` }}
              />
              <span className="min-w-0 flex-1 truncate text-xs">
                {byId.get(connection.from)?.name} <span className="text-muted-foreground">↔</span>{' '}
                {byId.get(connection.to)?.name}
              </span>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setConnections((current) => current.filter((c) => c !== connection))}
                aria-label={`Unplug ${byId.get(connection.from)?.name} and ${byId.get(connection.to)?.name}`}
              >
                <Unplug />
                Unplug
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Visual exploration only. No messages are sent. Cables reset when you close the panel.
        </p>
        <span className="sr-only" role="status">
          {announcement}
        </span>
      </footer>
    </section>
  )
}
