import { useEffect, type RefObject } from 'react'
import {
  PATCH_CABLE_OVERHANG,
  PATCH_CABLE_WINDOW_WIDTH,
  type PatchCableFrame
} from '../../../../shared/patch-cable-frame'
import { MAX_PATCH_CONNECTIONS, PATCH_COLORS, type PatchConnection } from './patch-bay-model'
import type { readSidebarPatchAnchors } from './sidebar-patch-anchors'

export function useDesktopPatchFrame(
  rootRef: RefObject<HTMLDivElement | null>,
  layout: ReturnType<typeof readSidebarPatchAnchors>,
  connections: PatchConnection[],
  visible: boolean
): boolean {
  const desktop = Boolean(window.patchCableDesktop)
  useEffect(
    () => () => {
      window.patchCableDesktop?.publish(null)
    },
    []
  )
  useEffect(() => {
    const root = rootRef.current
    if (!root || !desktop) {
      return
    }
    const publish = (): void => {
      if (!visible) {
        window.patchCableDesktop?.publish(null)
        return
      }
      const rect = root.getBoundingClientRect()
      const anchors = new Map(layout.anchors.map((anchor) => [anchor.id, anchor]))
      const cables: PatchCableFrame['cables'] = []
      connections.forEach((c, lane) => {
        const from = anchors.get(c.from),
          to = anchors.get(c.to)
        if (!from || !to) {
          return
        }
        cables.push({
          from: { ...from, x: from.x + PATCH_CABLE_OVERHANG, y: from.y + rect.top },
          to: { ...to, x: to.x + PATCH_CABLE_OVERHANG, y: to.y + rect.top },
          colorIndex: PATCH_COLORS.indexOf(c.color),
          lane
        })
      })
      window.patchCableDesktop?.publish({
        left: rect.left,
        top: layout.top + rect.top,
        bottom: layout.bottom + rect.top,
        height: window.innerHeight,
        width: Math.max(
          PATCH_CABLE_WINDOW_WIDTH,
          ...layout.anchors.map((anchor) => anchor.x + PATCH_CABLE_OVERHANG + 12)
        ),
        dark: document.documentElement.classList.contains('dark'),
        sparePorts: layout.anchors
          .filter((anchor) => {
            const count = connections.filter(
              (c) => c.from === anchor.id || c.to === anchor.id
            ).length
            return count > 0 && count < MAX_PATCH_CONNECTIONS
          })
          .map((anchor) => ({
            ...anchor,
            x: anchor.x + PATCH_CABLE_OVERHANG,
            y: anchor.y + rect.top
          })),
        cables
      })
    }
    publish()
    const theme = new MutationObserver(publish)
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => theme.disconnect()
  }, [connections, desktop, layout, rootRef, visible])
  return desktop
}
