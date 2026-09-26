import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  PATCH_CABLE_WINDOW_WIDTH,
  type PatchCableFrame
} from '../../../../shared/patch-cable-frame'
import { PatchCable } from './PatchCable'
import { PATCH_COLORS } from './patch-bay-model'
import { PatchCableCanvas } from './PatchCableCanvas'
import { PatchSparePort } from './PatchSparePort'
import '../../assets/main.css'
import './patch-bay.css'
import './sidebar-patch.css'
import './patch-cable-overlay.css'

function PatchCableOverlay(): React.JSX.Element | null {
  const [frame, setFrame] = useState<PatchCableFrame | null>(null)
  useEffect(
    () =>
      window.patchCableOverlay?.subscribe((next) => {
        document.documentElement.classList.toggle('dark', next.dark)
        setFrame(next)
      }),
    []
  )
  if (!frame) {
    return null
  }
  return (
    <div
      className="patch-desktop-surface"
      style={{
        clipPath: `inset(${frame.top}px 0 ${Math.max(0, frame.height - frame.bottom)}px 0)`
      }}
    >
      <svg
        className="patch-desktop-cables"
        viewBox={`0 0 ${PATCH_CABLE_WINDOW_WIDTH} ${frame.height}`}
        aria-hidden="true"
      >
        {frame.cables.map((c, index) => (
          <PatchCable
            key={index}
            from={c.from}
            to={c.to}
            color={PATCH_COLORS[c.colorIndex]}
            lane={c.lane}
            outside
            compact
          />
        ))}
      </svg>
      <PatchCableCanvas frame={frame} />
      {frame.sparePorts?.map((point) => (
        <PatchSparePort key={point.id} point={point} />
      ))}
    </div>
  )
}
const root = document.getElementById('root')
if (root) {
  createRoot(root).render(<PatchCableOverlay />)
}
