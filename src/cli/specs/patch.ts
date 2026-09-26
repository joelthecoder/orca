import { GLOBAL_FLAGS, type CommandSpec } from '../args'

export const PATCH_COMMAND_SPECS: CommandSpec[] = [
  {
    path: ['patch', 'list'],
    summary: 'List sidebar patch cables and available endpoints',
    usage: 'orca patch list [--json]',
    allowedFlags: [...GLOBAL_FLAGS]
  },
  {
    path: ['patch', 'connect'],
    summary: 'Attach a sidebar cable and introduce live agent peers',
    usage:
      'orca patch connect --from <endpoint-or-handle> --to <endpoint-or-handle> [--color <color>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'from', 'to', 'color']
  },
  {
    path: ['patch', 'disconnect'],
    summary: 'Remove a sidebar cable and notify its peers',
    usage: 'orca patch disconnect --from <endpoint-or-handle> --to <endpoint-or-handle> [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'from', 'to']
  }
]
