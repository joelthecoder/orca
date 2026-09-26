import type { PatchCommand, PatchCommandResult } from '../../../../shared/patch-cable-command'
import { connectPatch, type PatchConnection } from './patch-bay-model'
import { sidebarPatchIdentity } from './sidebar-patch-anchors'
import type { PatchMailLink } from './patch-peer-mail'

export function listPatchEndpoints(root: HTMLElement): PatchCommandResult['endpoints'] {
  const endpoints = new Map<string, PatchCommandResult['endpoints'][number]>()
  for (const row of root.querySelectorAll<HTMLElement>(
    '[data-worktree-host-identity], [data-patch-session-id]'
  )) {
    const id = sidebarPatchIdentity(row)
    if (id) {
      endpoints.set(id, {
        id,
        name: row.dataset.patchName ?? 'Workspace',
        ...(row.dataset.patchTerminalHandle ? { handle: row.dataset.patchTerminalHandle } : {})
      })
    }
  }
  return [...endpoints.values()]
}

export async function runSidebarPatchCommand(
  command: PatchCommand,
  context: {
    root: HTMLElement
    connections: PatchConnection[]
    update: (connections: PatchConnection[]) => void
    ensureMail: (connection: PatchConnection) => Promise<PatchMailLink>
    disconnectMail: (connection: PatchConnection) => Promise<void>
  }
): Promise<PatchCommandResult> {
  const endpoints = listPatchEndpoints(context.root)
  const result = (note: string, mail?: PatchCommandResult['mail']): PatchCommandResult => ({
    connections: context.connections,
    endpoints,
    note,
    mail
  })
  if (command.action === 'list') {
    return result(
      'Endpoints currently mounted in the main sidebar. Expand a workspace to expose its agents.'
    )
  }
  const resolve = (selector: string): string => {
    const matches = endpoints.filter(
      (endpoint) => endpoint.id === selector || endpoint.handle === selector
    )
    if (matches.length === 1) {
      return matches[0].id
    }
    if (
      command.action === 'disconnect' &&
      context.connections.some((c) => c.from === selector || c.to === selector)
    ) {
      return selector
    }
    throw new Error(
      'Endpoint missing or ambiguous. Use patch list and copy its exact endpoint id; expand the workspace if needed.'
    )
  }
  const from = resolve(command.from),
    to = resolve(command.to)
  const existing = context.connections.find(
    (c) => (c.from === from && c.to === to) || (c.to === from && c.from === to)
  )
  if (command.action === 'disconnect') {
    if (!existing) {
      return result('No cable between these endpoints.', 'unchanged')
    }
    context.connections = context.connections.filter((c) => c !== existing)
    // Remove the mail record before React's reconciliation can deliver the same notice.
    const pending = context.disconnectMail(existing)
    context.update(context.connections)
    await pending
    return result(
      'Cable removed; disconnect notices completed where peer mail was connected.',
      'disconnected'
    )
  }
  const next = connectPatch(context.connections, from, to, command.color)
  const connection = existing ?? next.at(-1)
  if (!existing && next === context.connections) {
    throw new Error('Cannot connect an endpoint to itself or exceed eight cables per endpoint.')
  }
  if (!connection) {
    throw new Error('No cable created.')
  }
  context.connections = next
  context.update(next)
  const link = await context.ensureMail(connection)
  return result(link.note, link.disconnect ? 'queued' : 'visual-only')
}
