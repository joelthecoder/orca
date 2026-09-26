import type { PatchColor } from '../../../../shared/patch-cable-colors'
export { PATCH_COLORS, type PatchColor } from '../../../../shared/patch-cable-colors'
export type PatchEndpoint = {
  id: string
  name: string
  workspace: string
  detail: string
  kind: 'session' | 'worktree' | 'folder'
}
export type PatchConnection = { from: string; to: string; color: PatchColor }
export const MAX_PATCH_CONNECTIONS = 8
export type PatchPoint = { x: number; y: number; direction: number; angle?: number }

export function patchCablePath(
  from: PatchPoint,
  to: PatchPoint,
  slack = 0,
  compact = false,
  overhang = 0
): string {
  const tangent = (point: PatchPoint, length: number): string => {
    const radians = ((point.angle ?? (point.direction < 0 ? 180 : 0)) * Math.PI) / 180
    return `${point.x + Math.cos(radians) * length} ${point.y + Math.sin(radians) * length}`
  }
  if (from.direction === to.direction) {
    if (overhang) {
      return `M ${from.x} ${from.y} C ${from.x - overhang} ${from.y + 24}, ${to.x - overhang} ${to.y - 24}, ${to.x} ${to.y}`
    }
    if (compact) {
      const bend = 6 + slack / 18
      return `M ${from.x} ${from.y} C ${tangent(from, bend)}, ${tangent(to, bend)}, ${to.x} ${to.y}`
    }
    const bow = Math.min(48, 23 + Math.abs(to.y - from.y) * 0.09) * from.direction
    return `M ${from.x} ${from.y} C ${from.x + bow} ${from.y + 32}, ${to.x + bow} ${to.y + 38}, ${to.x} ${to.y}`
  }
  const span = Math.abs(to.x - from.x)
  const reach = Math.min(80, Math.max(12, span * 0.2))
  const sag = Math.min(125, Math.max(40, span * 0.23)) + slack
  const bottom = Math.max(from.y, to.y) + sag
  const middle = (from.x + to.x) / 2
  const middleTangent = (to.x - from.x) * 0.24
  return `M ${from.x} ${from.y} C ${tangent(from, reach)}, ${middle - middleTangent} ${bottom}, ${middle} ${bottom} C ${middle + middleTangent} ${bottom}, ${tangent(to, reach)}, ${to.x} ${to.y}`
}

export function connectPatch(
  connections: PatchConnection[],
  from: string,
  to: string,
  color: PatchColor
): PatchConnection[] {
  if (
    from === to ||
    connections.filter((c) => c.from === from || c.to === from).length >= MAX_PATCH_CONNECTIONS ||
    connections.filter((c) => c.from === to || c.to === to).length >= MAX_PATCH_CONNECTIONS ||
    connections.some((c) => (c.from === from && c.to === to) || (c.from === to && c.to === from))
  ) {
    return connections
  }
  return [...connections, { from, to, color }]
}
