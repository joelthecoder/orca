import { useEffect, useRef, type RefObject } from 'react'
import type { PatchConnection } from './patch-bay-model'
import type { usePatchPeerMail } from './use-patch-peer-mail'
import { runSidebarPatchCommand } from './sidebar-patch-commands'

export function useSidebarPatchCommands(
  rootRef: RefObject<HTMLDivElement | null>,
  available: boolean,
  connections: RefObject<PatchConnection[]>,
  update: (connections: PatchConnection[]) => void,
  mail: ReturnType<typeof usePatchPeerMail>,
  enable: () => void
): void {
  const latest = useRef({ update, mail, enable })
  latest.current = { update, mail, enable }
  useEffect(() => {
    const bridge = window.patchCableDesktop
    if (!bridge?.onCommand) {
      return
    }
    let queue = Promise.resolve()
    return bridge.onCommand((request) => {
      queue = queue.then(async () => {
        try {
          const root = rootRef.current
          if (!root || !available) {
            throw new Error('The main Projects sidebar must be open to attach cables.')
          }
          const result = await runSidebarPatchCommand(request.command, {
            root,
            connections: connections.current,
            update: (next) => {
              latest.current.enable()
              latest.current.update(next)
            },
            ensureMail: latest.current.mail.ensure,
            disconnectMail: latest.current.mail.disconnect
          })
          bridge.reply({ requestId: request.requestId, result })
        } catch (error) {
          bridge.reply({
            requestId: request.requestId,
            error: error instanceof Error ? error.message : 'Patch command failed'
          })
        }
      })
    })
  }, [available, connections, rootRef])
}
