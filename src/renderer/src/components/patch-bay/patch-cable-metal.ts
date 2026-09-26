import { MeshPhysicalMaterial, MeshStandardMaterial } from 'three'

export function createCableMetal(): {
  body: MeshPhysicalMaterial
  seam: MeshStandardMaterial
  recess: MeshStandardMaterial
  dispose: () => void
} {
  const tokens = getComputedStyle(document.documentElement)
  const body = new MeshPhysicalMaterial({
    color: tokens.getPropertyValue('--patch-metal-mid').trim(),
    metalness: 0.88,
    roughness: 0.3,
    clearcoat: 0.12
  })
  const seam = new MeshStandardMaterial({
    color: tokens.getPropertyValue('--patch-metal-dark').trim(),
    metalness: 0.75,
    roughness: 0.5
  })
  const recess = new MeshStandardMaterial({
    color: tokens.getPropertyValue('--patch-shadow').trim(),
    metalness: 0,
    roughness: 1,
    envMapIntensity: 0.1
  })
  return {
    body,
    seam,
    recess,
    dispose: () => {
      body.dispose()
      seam.dispose()
      recess.dispose()
    }
  }
}
