import type { PatchPoint } from './patch-bay-model'

export type SidebarPatchAnchor = PatchPoint & { id: string; name: string }

export function sidebarPatchIdentity(row: HTMLElement): string | null {
  const workspace = row.closest<HTMLElement>('[data-worktree-host-identity]')
  const hostIdentity = workspace?.dataset.worktreeHostIdentity
  if (!hostIdentity) {
    return null
  }
  const sessionId = row.dataset.patchSessionId
  return JSON.stringify(
    sessionId ? ['session', hostIdentity, sessionId] : ['workspace', hostIdentity]
  )
}

export function readSidebarPatchAnchors(root: HTMLElement): {
  width: number
  height: number
  top: number
  bottom: number
  anchors: SidebarPatchAnchor[]
} {
  const bounds = root.getBoundingClientRect()
  if (bounds.width <= 0 || root.clientWidth <= 0) {
    return { width: 1, height: 1, top: 0, bottom: 1, anchors: [] }
  }
  const scale = root.clientWidth / bounds.width
  const viewport = root.querySelector<HTMLElement>('[data-worktree-sidebar]')
  const viewportBounds = viewport?.getBoundingClientRect() ?? bounds
  const top = Math.max(0, (viewportBounds.top - bounds.top) * scale)
  const bottom = Math.min(root.clientHeight, (viewportBounds.bottom - bounds.top) * scale)
  const anchors = new Map<string, SidebarPatchAnchor>()
  const sourceRects = new Map<string, DOMRect>()
  root
    .querySelectorAll<HTMLElement>('[data-worktree-host-identity], [data-patch-session-id]')
    .forEach((row) => {
      const id = sidebarPatchIdentity(row)
      if (!id) {
        return
      }
      const sessionId = row.dataset.patchSessionId
      const rect = row.getBoundingClientRect()
      const y =
        (rect.top - bounds.top) * scale +
        (sessionId ? (rect.height * scale) / 2 : Math.min(23, (rect.height * scale) / 2))
      if (y < top + 12 || y > bottom - 12 || rect.height === 0 || anchors.has(id)) {
        return
      }
      anchors.set(id, {
        id,
        name:
          row.dataset.patchName ??
          (sessionId ? 'Agent session' : (row.dataset.worktreeId ?? 'Workspace')),
        x: sessionId ? Math.max(12, (rect.left - bounds.left) * scale - 8) : 20,
        y,
        direction: -1
      })
      sourceRects.set(id, rect)
    })
  // The existing drag preview clones stable row identities; follow it while the source is hidden.
  document
    .querySelectorAll<HTMLElement>(
      '[data-worktree-sidebar-drag-preview] [data-worktree-host-identity], [data-worktree-sidebar-drag-preview] [data-patch-session-id]'
    )
    .forEach((row) => {
      const id = sidebarPatchIdentity(row)
      const anchor = id ? anchors.get(id) : undefined
      const source = id ? sourceRects.get(id) : undefined
      if (!anchor || !source) {
        return
      }
      const rect = row.getBoundingClientRect()
      anchor.x += (rect.left - source.left) * scale
      anchor.y += (rect.top - source.top) * scale
    })
  return {
    width: root.clientWidth,
    height: root.clientHeight,
    top,
    bottom,
    anchors: [...anchors.values()]
  }
}
