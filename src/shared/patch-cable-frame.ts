import { z } from 'zod'
import type { PatchCommandRequest, PatchCommandReply } from './patch-cable-command'

const coordinate = z.number().finite().min(-20000).max(20000)
const point = z.object({
  x: coordinate,
  y: coordinate,
  direction: z.number().min(-1).max(1),
  angle: coordinate.optional()
})
export const PATCH_CABLE_OVERHANG = 112
export const PATCH_CABLE_WINDOW_WIDTH = 176
export const PatchCableFrameSchema = z.object({
  left: coordinate,
  top: coordinate,
  bottom: coordinate,
  height: z.number().finite().positive().max(20000),
  dark: z.boolean(),
  sparePorts: z
    .array(point.extend({ id: z.string().max(4096) }))
    .max(2000)
    .optional(),
  cables: z
    .array(
      z.object({
        from: point,
        to: point,
        colorIndex: z.number().int().min(0).max(23),
        lane: z.number().int().min(0).max(1000)
      })
    )
    .max(1000)
})
export type PatchCableFrame = z.infer<typeof PatchCableFrameSchema>

declare global {
  // oxlint-disable-next-line typescript-eslint/consistent-type-definitions -- declaration merging requires interface
  interface Window {
    patchCableDesktop?: {
      publish: (frame: PatchCableFrame | null) => void
      onCommand: (listener: (request: PatchCommandRequest) => void) => () => void
      reply: (reply: PatchCommandReply) => void
    }
    patchCableOverlay?: { subscribe: (listener: (frame: PatchCableFrame) => void) => () => void }
  }
}
