import { useEffect, useRef, useState, type RefObject, type SetStateAction } from 'react'
import { useSidebarPatchCommands } from './use-sidebar-patch-commands'
import {
  connectPatch,
  type PatchColor,
  type PatchConnection,
  type PatchPoint
} from './patch-bay-model'
import { sidebarPatchIdentity } from './sidebar-patch-anchors'
import { usePatchPeerMail } from './use-patch-peer-mail'

export function isPatchDragModifier(
  event: Pick<PointerEvent, 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>,
  isMac: boolean
): boolean {
  return (
    event.altKey &&
    !event.shiftKey &&
    (isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey)
  )
}

function endpointAt(element: Element | null, root: HTMLElement): string | null {
  if (!element || !root.contains(element)) {
    return null
  }
  const port = element.closest<HTMLElement>('[data-sidebar-patch-port]')
  if (port) {
    return port.dataset.sidebarPatchPort ?? null
  }
  const row = element.closest<HTMLElement>('[data-patch-session-id], [data-worktree-host-identity]')
  return row ? sidebarPatchIdentity(row) : null
}

export function useSidebarPatchGesture(
  rootRef: RefObject<HTMLDivElement | null>,
  available: boolean
) {
  const [enabled, setEnabled] = useState(false)
  const [color, setColor] = useState<PatchColor>('orange')
  const [connections, updateConnections] = useState<PatchConnection[]>([])
  const currentConnections = useRef(connections)
  const setConnections = (action: SetStateAction<PatchConnection[]>): void => {
    const next = typeof action === 'function' ? action(currentConnections.current) : action
    currentConnections.current = next
    updateConnections(next)
  }
  const mail = usePatchPeerMail(rootRef, connections)
  const { notice } = mail
  useSidebarPatchCommands(rootRef, available, currentConnections, setConnections, mail, () =>
    setEnabled(true)
  )
  const [selected, setSelected] = useState<string | null>(null)
  const [pointer, setPointer] = useState<PatchPoint | null>(null)
  const drag = useRef<{
    id: string
    x: number
    y: number
    pointerId: number
    moved: boolean
  } | null>(null)
  const suppressClickUntil = useRef(0)

  useEffect(() => {
    const root = rootRef.current
    if (!root || !available) {
      return
    }
    const cancel = (): void => {
      const pointerId = drag.current?.pointerId
      if (pointerId !== undefined && root.hasPointerCapture(pointerId)) {
        root.releasePointerCapture(pointerId)
      }
      drag.current = null
      setSelected(null)
      setPointer(null)
    }
    const down = (event: PointerEvent): void => {
      suppressClickUntil.current = 0
      if (event.button !== 0 || !isPatchDragModifier(event, navigator.userAgent.includes('Mac'))) {
        return
      }
      const id = endpointAt(event.target instanceof Element ? event.target : null, root)
      if (!id) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      drag.current = {
        id,
        x: event.clientX,
        y: event.clientY,
        pointerId: event.pointerId,
        moved: false
      }
      setEnabled(true)
      setSelected(id)
      root.setPointerCapture(event.pointerId)
    }
    const move = (event: PointerEvent): void => {
      const current = drag.current
      if (!current) {
        return
      }
      event.preventDefault()
      current.moved ||= Math.hypot(event.clientX - current.x, event.clientY - current.y) > 4
      const rect = root.getBoundingClientRect()
      const scale = root.clientWidth / rect.width
      setPointer({
        x: (event.clientX - rect.left) * scale,
        y: (event.clientY - rect.top) * scale,
        direction: 1
      })
    }
    const up = (event: PointerEvent): void => {
      const current = drag.current
      if (!current) {
        return
      }
      const to = endpointAt(document.elementFromPoint(event.clientX, event.clientY), root)
      if (current.moved && to) {
        setConnections((existing) => connectPatch(existing, current.id, to, color))
      }
      suppressClickUntil.current = performance.now() + 250
      if (root.hasPointerCapture(current.pointerId)) {
        root.releasePointerCapture(current.pointerId)
      }
      cancel()
    }
    const click = (event: MouseEvent): void => {
      if (performance.now() < suppressClickUntil.current) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    const key = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && (drag.current || selected)) {
        event.preventDefault()
        event.stopPropagation()
        cancel()
      }
    }
    root.addEventListener('pointerdown', down, true)
    root.addEventListener('click', click, true)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('blur', cancel)
    window.addEventListener('keydown', key, true)
    return () => {
      root.removeEventListener('pointerdown', down, true)
      root.removeEventListener('click', click, true)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('blur', cancel)
      window.removeEventListener('keydown', key, true)
    }
  }, [available, color, rootRef, selected])

  function activate(id: string): void {
    if (selected) {
      setConnections((current) => connectPatch(current, selected, id, color))
      setSelected(null)
    } else {
      setSelected(id)
    }
  }
  return {
    enabled,
    setEnabled,
    color,
    setColor,
    connections,
    notice,
    setConnections,
    selected,
    pointer,
    activate
  }
}
