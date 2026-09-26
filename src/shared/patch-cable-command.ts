import { z } from 'zod'
import { PATCH_COLORS } from './patch-cable-colors'

const endpoint = z.string().min(1).max(4096)
export const PatchCommandSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('list') }),
  z.object({
    action: z.literal('connect'),
    from: endpoint,
    to: endpoint,
    color: z.enum(PATCH_COLORS).default('orange')
  }),
  z.object({ action: z.literal('disconnect'), from: endpoint, to: endpoint })
])
export type PatchCommand = z.infer<typeof PatchCommandSchema>
export const PatchCommandReplySchema = z.object({
  requestId: z.string(),
  result: z
    .object({
      connections: z.array(z.object({ from: endpoint, to: endpoint, color: z.enum(PATCH_COLORS) })),
      endpoints: z.array(
        z.object({ id: endpoint, name: z.string(), handle: z.string().optional() })
      ),
      note: z.string(),
      mail: z.enum(['queued', 'visual-only', 'disconnected', 'unchanged']).optional()
    })
    .optional(),
  error: z.string().optional()
})
export type PatchCommandResult = NonNullable<z.infer<typeof PatchCommandReplySchema>['result']>
export type PatchCommandRequest = { requestId: string; command: PatchCommand }
export type PatchCommandReply = z.infer<typeof PatchCommandReplySchema>
