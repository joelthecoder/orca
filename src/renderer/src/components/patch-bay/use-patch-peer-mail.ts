import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { toast } from 'sonner'
import type { PatchConnection } from './patch-bay-model'
import { introducePatchPeers, type PatchMailLink } from './patch-peer-mail'

function keyFor(connection: PatchConnection): string {
  return JSON.stringify([connection.from, connection.to].sort())
}
export function usePatchPeerMail(
  rootRef: RefObject<HTMLDivElement | null>,
  connections: PatchConnection[]
) {
  const [notice, setNotice] = useState('Drag between agents to connect their inboxes.')
  const records = useRef(
    new Map<string, { connection: PatchConnection; pending: Promise<PatchMailLink> }>()
  )
  const ensure = useCallback(
    (connection: PatchConnection): Promise<PatchMailLink> => {
      const key = keyFor(connection)
      const existing = records.current.get(key)
      if (existing) {
        return existing.pending
      }
      const root = rootRef.current
      const pending =
        root && window.api?.runtime
          ? introducePatchPeers(root, connection.from, connection.to)
          : Promise.resolve({ note: 'Visual cable only: no desktop mailbox transport.' })
      records.current.set(key, { connection, pending })
      void pending.then(
        (link) => {
          setNotice(link.note)
          toast.info(link.note)
        },
        (error: unknown) => {
          const message =
            error instanceof Error ? error.message : 'Peer mail could not be verified.'
          setNotice(`Visual cable only: ${message}`)
          toast.error('Peer mail was not connected', { description: message })
        }
      )
      return pending
    },
    [rootRef]
  )
  const disconnect = useCallback(async (connection: PatchConnection): Promise<void> => {
    const key = keyFor(connection)
    const record = records.current.get(key)
    records.current.delete(key)
    if (!record) {
      return
    }
    const link = await record.pending.catch(() => undefined)
    await link?.disconnect?.()
  }, [])
  useEffect(() => {
    const active = new Set(connections.map(keyFor))
    for (const [key, record] of records.current) {
      if (active.has(key)) {
        continue
      }
      void disconnect(record.connection).catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : 'Disconnect notice failed')
      })
    }
    for (const connection of connections) {
      void ensure(connection).catch(() => undefined)
    }
  }, [connections, ensure, disconnect])
  return { notice, ensure, disconnect }
}
