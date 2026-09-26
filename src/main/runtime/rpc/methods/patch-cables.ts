import { defineMethod } from '../core'
import { PatchCommandSchema } from '../../../../shared/patch-cable-command'
import { requestPatchCommand } from '../../../window/patch-cable-commands'

export const PATCH_CABLE_METHODS = [
  defineMethod({
    name: 'patch.command',
    params: PatchCommandSchema,
    handler: (params) => requestPatchCommand(params)
  })
]
