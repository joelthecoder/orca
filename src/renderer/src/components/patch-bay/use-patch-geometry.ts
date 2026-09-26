import { useLayoutEffect, useRef, useState } from 'react'
import type { PatchPoint } from './patch-bay-model'

export function usePatchGeometry(endpointKey: string) {
  const boardRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [geometry, setGeometry] = useState({
    width: 1,
    height: 1,
    ports: new Map<string, PatchPoint>()
  })
  useLayoutEffect(() => {
    const board = boardRef.current
    if (!board) {
      return
    }
    const measure = (): void => {
      const bounds = board.getBoundingClientRect()
      const scale = board.clientWidth / bounds.width
      const ports = new Map<string, PatchPoint>()
      board.querySelectorAll<HTMLButtonElement>('[data-patch-port]').forEach((port) => {
        const rect = port.getBoundingClientRect()
        const id = port.dataset.patchPort
        if (id) {
          ports.set(id, {
            x: (rect.left + rect.width / 2 - bounds.left) * scale,
            y: (rect.top + rect.height / 2 - bounds.top) * scale,
            direction: port.dataset.patchSide === 'left' ? 1 : -1
          })
        }
      })
      setGeometry({ width: board.clientWidth, height: board.clientHeight, ports })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(board)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [endpointKey])

  function pointFromClient(clientX: number, clientY: number): PatchPoint | null {
    const matrix = svgRef.current?.getScreenCTM()
    if (!matrix) {
      return null
    }
    const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse())
    return { x: point.x, y: point.y, direction: -1 }
  }
  return { boardRef, svgRef, geometry, pointFromClient }
}
