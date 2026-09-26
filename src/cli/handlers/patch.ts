import type { CommandHandler } from '../dispatch'
import { getRequiredStringFlag, getOptionalStringFlag } from '../flags'
import { printResult } from '../format'
import { rejectRemoteSelectionFlags } from '../remote-selection-flag-rejection'
import { PatchCommandSchema, type PatchCommandResult } from '../../shared/patch-cable-command'

function handler(action: 'list' | 'connect' | 'disconnect'): CommandHandler {
  return async ({ client, flags, json }) => {
    rejectRemoteSelectionFlags(
      flags,
      'patch cables; run against the desktop displaying the endpoints.'
    )
    const command = PatchCommandSchema.parse(
      action === 'list'
        ? { action }
        : {
            action,
            from: getRequiredStringFlag(flags, 'from'),
            to: getRequiredStringFlag(flags, 'to'),
            ...(action === 'connect' ? { color: getOptionalStringFlag(flags, 'color') } : {})
          }
    )
    const result = await client.call<PatchCommandResult>('patch.command', command)
    printResult(result, json, (value) => JSON.stringify(value, null, 2))
  }
}
export const PATCH_HANDLERS: Record<string, CommandHandler> = {
  'patch list': handler('list'),
  'patch connect': handler('connect'),
  'patch disconnect': handler('disconnect')
}
