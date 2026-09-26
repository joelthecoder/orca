import { Fragment, type RefObject } from 'react'
import { PatchSparePort } from './PatchSparePort'
import { Button } from '@/components/ui/button'
import { PatchCable } from './PatchCable'
import { PatchColorPicker } from './PatchColorPicker'
import { useSidebarPatchAnchors } from './use-sidebar-patch-anchors'
import { useDesktopPatchFrame } from './use-desktop-patch-frame'
import type { useSidebarPatchGesture } from './use-sidebar-patch-gesture'
import './patch-bay.css'
import './sidebar-patch.css'
import { MAX_PATCH_CONNECTIONS, type PatchConnection, type PatchPoint } from './patch-bay-model'

function occupiedJack(
  point: PatchPoint,
  id: string,
  connection: PatchConnection,
  connections: PatchConnection[]
): PatchPoint {
  const attached = connections.filter((c) => c.from === id || c.to === id)
  const slot = attached.indexOf(connection)
  return { ...point, y: point.y + (slot - (attached.length - 1) / 2) * 3 }
}

export function SidebarPatchLayer({
  rootRef,
  patch,
  visible
}: {
  rootRef: RefObject<HTMLDivElement | null>
  patch: ReturnType<typeof useSidebarPatchGesture>
  visible: boolean
}): React.JSX.Element | null {
  const layout = useSidebarPatchAnchors(rootRef, visible)
  const desktop = useDesktopPatchFrame(rootRef, layout, patch.connections, visible)
  const anchors = new Map(layout.anchors.map((anchor) => [anchor.id, anchor]))
  const fromPoint = patch.selected ? anchors.get(patch.selected) : undefined
  if (!visible) {
    return null
  }
  return (
    <div data-sidebar-patch-layer="" data-desktop-patch={desktop} className="sidebar-patch-layer">
      <div className="sidebar-patch-controls" style={{ top: layout.bottom - 28 }}>
        <PatchColorPicker color={patch.color} onChange={patch.setColor} />
        <Button
          variant="ghost"
          size="xs"
          disabled={!patch.connections.length}
          onClick={() => patch.setConnections([])}
        >
          Unplug all
        </Button>
      </div>
      <div
        className="sidebar-patch-field"
        style={{
          clipPath: `inset(${layout.top}px 0 ${Math.max(0, layout.height - layout.bottom)}px 0)`
        }}
      >
        <svg
          className="patch-cables"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          aria-hidden="true"
        >
          {!desktop &&
            patch.connections.map((c) => {
              const from = anchors.get(c.from)
              const to = anchors.get(c.to)
              return from && to ? (
                <PatchCable
                  key={`${c.from}:${c.to}`}
                  from={occupiedJack(from, c.from, c, patch.connections)}
                  to={occupiedJack(to, c.to, c, patch.connections)}
                  color={c.color}
                  compact
                />
              ) : null
            })}
          {fromPoint && patch.pointer && (
            <PatchCable from={fromPoint} to={patch.pointer} color={patch.color} compact draft />
          )}
        </svg>
        {layout.anchors.map((anchor) => {
          const count = patch.connections.filter(
            (c) => c.from === anchor.id || c.to === anchor.id
          ).length
          return (
            <Fragment key={anchor.id}>
              <button
                type="button"
                className="patch-jack"
                style={{ left: anchor.x - 8, top: anchor.y - 8 }}
                data-sidebar-patch-port={anchor.id}
                data-patched={patch.connections.some(
                  (c) => c.from === anchor.id || c.to === anchor.id
                )}
                aria-label={`Patch ${anchor.name}${count ? ` (${count}/${MAX_PATCH_CONNECTIONS} connected)` : ''}`}
                title={`${anchor.name} · ${count}/${MAX_PATCH_CONNECTIONS} connections`}
                aria-pressed={patch.selected === anchor.id}
                onClick={() => patch.activate(anchor.id)}
              >
                <span className="patch-jack-ring">
                  <span />
                </span>
              </button>
              {count > 0 && count < MAX_PATCH_CONNECTIONS && (
                <PatchSparePort
                  point={anchor}
                  label={`Add cable to ${anchor.name} (${count}/${MAX_PATCH_CONNECTIONS} connected)`}
                  onClick={() => patch.activate(anchor.id)}
                />
              )}
            </Fragment>
          )
        })}
      </div>
      <div className="sidebar-patch-status sr-only" role="status">
        {patch.selected
          ? 'Choose another jack · Esc cancels'
          : `${patch.connections.length} ${patch.connections.length === 1 ? 'cable' : 'cables'} · ${patch.notice}`}
      </div>
    </div>
  )
}
