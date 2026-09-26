import { useEffect, useRef, useState } from 'react'
import type { PatchCableFrame } from '../../../../shared/patch-cable-frame'
import { PatchCableScene } from './patch-cable-scene'

export function PatchCableCanvas({ frame }: { frame: PatchCableFrame }): React.JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<PatchCableScene | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!canvasRef.current) {
      return
    }
    try {
      sceneRef.current = new PatchCableScene(canvasRef.current)
    } catch {
      setFailed(true)
      return
    }
    return () => {
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [])
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sceneRef.current) {
      return
    }
    const render = (): void => {
      try {
        sceneRef.current?.update(frame)
        canvas.dataset.rendered = 'true'
      } catch {
        setFailed(true)
      }
    }
    render()
    const resize = new ResizeObserver(render)
    resize.observe(canvas)
    return () => resize.disconnect()
  }, [frame])
  return failed ? null : (
    <canvas ref={canvasRef} className="patch-cable-canvas" aria-hidden="true" />
  )
}
