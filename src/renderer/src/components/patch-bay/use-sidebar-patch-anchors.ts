import { useLayoutEffect, useState, type RefObject } from 'react'
import { readSidebarPatchAnchors } from './sidebar-patch-anchors'

export function useSidebarPatchAnchors(
  rootRef: RefObject<HTMLDivElement | null>,
  enabled: boolean
) {
  const [layout, setLayout] = useState<ReturnType<typeof readSidebarPatchAnchors>>({
    width: 1,
    height: 1,
    top: 0,
    bottom: 1,
    anchors: []
  })
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || !enabled) {
      return
    }
    let frame = 0
    let last = ''
    const measure = (): void => {
      frame = 0
      const next = readSidebarPatchAnchors(root)
      const serialized = JSON.stringify(next)
      if (serialized !== last) {
        last = serialized
        setLayout(next)
      }
      if (document.documentElement.hasAttribute('data-worktree-sidebar-pointer-dragging')) {
        frame = requestAnimationFrame(measure)
      }
    }
    const schedule = (): void => {
      if (!frame) {
        frame = requestAnimationFrame(measure)
      }
    }
    const mutations = new MutationObserver((records) => {
      if (
        records.some(
          (r) => r.target instanceof Element && !r.target.closest('[data-sidebar-patch-layer]')
        )
      ) {
        schedule()
      }
    })
    mutations.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'style',
        'class',
        'data-worktree-host-identity',
        'data-patch-session-id',
        'data-patch-name'
      ]
    })
    const resize = new ResizeObserver(schedule)
    resize.observe(root)
    const viewport = root.querySelector('[data-worktree-sidebar]')
    if (viewport) {
      resize.observe(viewport)
    }
    root.addEventListener('scroll', schedule, true)
    window.addEventListener('resize', schedule)
    root.addEventListener('pointermove', schedule)
    measure()
    return () => {
      cancelAnimationFrame(frame)
      mutations.disconnect()
      resize.disconnect()
      root.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
      root.removeEventListener('pointermove', schedule)
    }
  }, [enabled, rootRef])
  return layout
}
