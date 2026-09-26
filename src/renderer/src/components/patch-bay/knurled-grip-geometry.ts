import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three'

export function knurledGripGeometry(radius: number, height: number): BufferGeometry {
  const positions: number[] = []
  const columns = 28
  const rows = 6
  const step = (Math.PI * 2) / columns
  const rise = height / rows
  const point = (angle: number, y: number, r: number): Vector3 =>
    new Vector3(
      Math.sin(angle) * r,
      Math.max(-height / 2, Math.min(height / 2, y)),
      Math.cos(angle) * r
    )
  for (let row = 0; row <= rows; row++) {
    for (let column = 0; column < columns; column++) {
      const angle = (column + (row % 2) / 2) * step
      const y = row * rise - height / 2
      const peak = point(angle, y, radius + 0.22)
      const edges = [
        point(angle - step / 2, y, radius),
        point(angle, y - rise, radius),
        point(angle + step / 2, y, radius),
        point(angle, y + rise, radius)
      ]
      edges.forEach((edge, i) => {
        const next = edges[(i + 1) % edges.length]
        positions.push(...peak.toArray(), ...edge.toArray(), ...next.toArray())
      })
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}
