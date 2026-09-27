import {
  AmbientLight,
  CircleGeometry,
  Color,
  CubicBezierCurve3,
  CurvePath,
  CylinderGeometry,
  DirectionalLight,
  Group,
  LatheGeometry,
  Mesh,
  MeshPhysicalMaterial,
  OrthographicCamera,
  PMREMGenerator,
  Scene,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  SRGBColorSpace,
  ACESFilmicToneMapping
} from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import {
  PATCH_CABLE_OVERHANG,
  PATCH_CABLE_WINDOW_WIDTH,
  type PatchCableFrame
} from '../../../../shared/patch-cable-frame'
import { PATCH_COLORS } from './patch-bay-model'
import { createCableMetal } from './patch-cable-metal'
import { knurledGripGeometry } from './knurled-grip-geometry'

type Endpoint = PatchCableFrame['cables'][number]['from']
const UP = new Vector3(0, 1, 0)
const CONNECTOR_LENGTH = 16
const CABLE_RADIUS = 1.85

function cableAxis(point: Endpoint, other: Endpoint): Vector3 {
  const spread = Math.abs(other.y - point.y) < 48 ? -1 : 1
  const degrees =
    point.angle ??
    (point.direction < 0 ? 180 : 0) + (other.y >= point.y ? 20 : -20) * point.direction * spread
  const radians = (degrees * Math.PI) / 180
  return new Vector3(Math.cos(radians), -Math.sin(radians), 0)
}

export class PatchCableScene {
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera = new OrthographicCamera(0, PATCH_CABLE_WINDOW_WIDTH, 0, -1, 0.1, 2000)
  private readonly cables = new Group()
  private readonly metal = createCableMetal()
  private readonly jackets = new Map<number, MeshPhysicalMaterial>()
  private readonly environment: ReturnType<PMREMGenerator['fromScene']>
  private readonly generator: PMREMGenerator

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      powerPreference: 'low-power'
    })
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.8
    this.renderer.setClearColor(0, 0)
    this.camera.position.z = 500
    this.generator = new PMREMGenerator(this.renderer)
    const room = new RoomEnvironment()
    this.environment = this.generator.fromScene(room, 0.05)
    room.dispose()
    this.scene.environment = this.environment.texture
    this.scene.environmentIntensity = 0.55
    const key = new DirectionalLight(0xffffff, 1.2)
    key.position.set(-100, 300, 500)
    this.scene.add(key, new AmbientLight(0xffffff, 0.35), this.cables)
  }

  private jacket(index: number): MeshPhysicalMaterial {
    const existing = this.jackets.get(index)
    if (existing) {
      return existing
    }
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue(`--patch-${PATCH_COLORS[index]}`)
      .trim()
    const material = new MeshPhysicalMaterial({
      color: new Color(color),
      roughness: 0.65,
      metalness: 0,
      clearcoat: 0.06,
      clearcoatRoughness: 0.55
    })
    this.jackets.set(index, material)
    return material
  }

  private plug(point: Endpoint, axis: Vector3, z: number): void {
    const socket = new Group()
    socket.position.set(point.x, -point.y, 1)
    socket.rotation.z = Math.atan2(axis.y, axis.x)
    socket.scale.x = 0.55
    const recess = new Mesh(new CircleGeometry(3.45, 48), this.metal.recess)
    const rim = new Mesh(new TorusGeometry(3, 0.45, 12, 48), this.metal.body)
    rim.position.z = 0.5
    socket.add(recess, rim)
    this.cables.add(socket)
    const group = new Group()
    group.position.set(point.x, -point.y, z)
    group.quaternion.setFromUnitVectors(UP, axis)
    const profile = [
      [2.6, -1.8],
      [2.8, -1.2],
      [2.8, 0.4],
      [2.6, 3.4],
      [3.1, 4],
      [3.1, 5.8],
      [3.45, 6.2],
      [3.45, 12.6],
      [3.1, 13],
      [3.1, 14.7],
      [2.8, 15.7],
      [2, 16.3]
    ]
    group.add(
      new Mesh(
        new LatheGeometry(
          profile.map(([r, y]) => new Vector2(r, y)),
          48
        ),
        this.metal.body
      )
    )
    for (const center of [7.8, 11]) {
      const grip = new Mesh(knurledGripGeometry(3.48, 2.9), this.metal.body)
      grip.position.y = center
      group.add(grip)
    }
    const seam = new Mesh(new CylinderGeometry(3.47, 3.47, 0.35, 48, 1, true), this.metal.seam)
    seam.position.y = 9.4
    group.add(seam)
    this.cables.add(group)
  }

  update(frame: PatchCableFrame): void {
    this.clearGeometry()
    this.renderer.setPixelRatio(Math.min(3, window.devicePixelRatio))
    this.renderer.setSize(
      this.canvas.clientWidth || PATCH_CABLE_WINDOW_WIDTH,
      this.canvas.clientHeight || frame.height,
      false
    )
    this.camera.bottom = -frame.height
    this.camera.right = frame.width ?? PATCH_CABLE_WINDOW_WIDTH
    this.camera.updateProjectionMatrix()
    frame.cables.forEach((cable) => {
      const a = cableAxis(cable.from, cable.to),
        b = cableAxis(cable.to, cable.from)
      const z = 4 + (cable.lane % 8) * 0.6
      const start = new Vector3(cable.from.x, -cable.from.y, z).addScaledVector(a, CONNECTOR_LENGTH)
      const end = new Vector3(cable.to.x, -cable.to.y, z).addScaledVector(b, CONNECTOR_LENGTH)
      const outward = PATCH_CABLE_OVERHANG - 30 - (cable.lane % 8) * 7
      const middleY = (start.y + end.y) / 2
      const sign = start.y >= end.y ? 1 : -1
      const run = Math.min(40, Math.max(18, Math.abs(end.y - start.y) * 0.25))
      const middle = new Vector3(outward, middleY, z)
      const path = new CurvePath<Vector3>()
      path.add(
        new CubicBezierCurve3(
          start,
          start.clone().addScaledVector(a, 24),
          new Vector3(outward, middleY + run * sign, z),
          middle
        )
      )
      path.add(
        new CubicBezierCurve3(
          middle,
          new Vector3(outward, middleY - run * sign, z),
          end.clone().addScaledVector(b, 24),
          end
        )
      )
      const segments = Math.min(256, Math.max(64, Math.ceil(path.getLength() / 2)))
      this.cables.add(
        new Mesh(
          new TubeGeometry(path, segments, CABLE_RADIUS, 20, false),
          this.jacket(cable.colorIndex)
        )
      )
      this.plug(cable.from, a, z)
      this.plug(cable.to, b, z)
    })
    this.renderer.render(this.scene, this.camera)
  }

  private clearGeometry(): void {
    this.cables.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose()
      }
    })
    this.cables.clear()
  }

  dispose(): void {
    this.clearGeometry()
    this.metal.dispose()
    for (const material of this.jackets.values()) {
      material.dispose()
    }
    this.environment.dispose()
    this.generator.dispose()
    this.renderer.dispose()
  }
}
