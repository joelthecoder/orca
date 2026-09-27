import { useId } from 'react'
import { PATCH_COLORS, patchCablePath, type PatchColor, type PatchPoint } from './patch-bay-model'

function PatchPlug({
  point,
  metalId,
  gripId,
  scale
}: {
  point: PatchPoint
  scale: number
  metalId: string
  gripId: string
}): React.JSX.Element {
  return (
    <g
      transform={`translate(${point.x} ${point.y}) rotate(${point.angle ?? (point.direction < 0 ? 180 : 0)}) scale(${scale})`}
    >
      <circle r="7.6" fill="var(--patch-shadow)" stroke={`url(#${metalId})`} strokeWidth="1.8" />
      <ellipse cx="3.5" rx="10" ry="7" fill={`url(#${metalId})`} />
      <ellipse cx="3.5" rx="10" ry="7" fill={`url(#${gripId})`} opacity=".4" />
      <ellipse cx="7" rx="6.8" ry="7" fill={`url(#${metalId})`} />
      <ellipse cx="7" rx="4.2" ry="4.4" fill="var(--patch-metal-dark)" />
    </g>
  )
}

export function PatchCable({
  from,
  to,
  color,
  draft = false,
  compact = false,
  outside = false,
  lane = 0
}: {
  from: PatchPoint
  to: PatchPoint
  color: PatchColor
  draft?: boolean
  compact?: boolean
  outside?: boolean
  lane?: number
}): React.JSX.Element {
  const id = useId().replaceAll(':', '')
  const plugScale = compact ? (outside ? 0.5 : 0.3) : 1
  const exitPoint = (point: PatchPoint, other: PatchPoint): PatchPoint => ({
    ...point,
    angle:
      point.angle ??
      (point.direction < 0 ? 180 : 0) +
        (compact ? (other.y >= point.y ? -30 : 30) * -point.direction : 30 * point.direction)
  })
  const start = exitPoint(from, to)
  const end = exitPoint(to, from)
  const tip = (point: PatchPoint): PatchPoint => {
    const radians = ((point.angle ?? 0) * Math.PI) / 180
    return {
      ...point,
      x: point.x + Math.cos(radians) * 7 * plugScale,
      y: point.y + Math.sin(radians) * 7 * plugScale
    }
  }
  const path = patchCablePath(
    tip(start),
    tip(end),
    (PATCH_COLORS.indexOf(color) % 7) * 6,
    compact,
    outside ? 65 + (lane % 8) * 8 : 0
  )
  return (
    <g
      data-patch-color={color}
      className="patch-cable"
      style={{ color: `var(--patch-${color})` }}
      opacity={draft ? 0.42 : 1}
    >
      <defs>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--patch-metal-dark)" />
          <stop offset=".18" stopColor="var(--patch-metal-mid)" />
          <stop offset=".32" stopColor="var(--patch-metal-light)" />
          <stop offset=".62" stopColor="var(--patch-metal-mid)" />
          <stop offset="1" stopColor="var(--patch-metal-dark)" />
        </linearGradient>
        <pattern id={`${id}-grip`} width="3" height="3" patternUnits="userSpaceOnUse">
          <path d="M0 0L3 3M3 0L0 3" stroke="var(--patch-metal-dark)" strokeWidth=".5" />
        </pattern>
      </defs>
      <path d={path} className="patch-cable-shadow" transform="translate(0 6)" />
      <PatchPlug scale={plugScale} point={start} metalId={`${id}-metal`} gripId={`${id}-grip`} />
      <PatchPlug scale={plugScale} point={end} metalId={`${id}-metal`} gripId={`${id}-grip`} />
      <path d={path} className="patch-cable-edge" />
      <path d={path} className="patch-cable-body" />
      <path d={path} className="patch-cable-light" transform="translate(0 -2)" />
    </g>
  )
}
