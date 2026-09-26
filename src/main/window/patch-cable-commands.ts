import type { BrowserWindow, IpcMainEvent } from 'electron'
import { randomUUID } from 'node:crypto'
import {
  PatchCommandReplySchema,
  type PatchCommand,
  type PatchCommandResult
} from '../../shared/patch-cable-command'

const windows = new Set<BrowserWindow>()
export function registerPatchCommandWindow(window: BrowserWindow): void {
  windows.add(window)
  window.once('closed', () => windows.delete(window))
}

export async function requestPatchCommand(command: PatchCommand): Promise<PatchCommandResult> {
  const candidates = [...windows].filter((window) => !window.isDestroyed())
  if (candidates.length !== 1) {
    throw new Error('Patch commands require exactly one open desktop Orca window in this profile.')
  }
  const window = candidates[0]
  const requestId = randomUUID()
  return new Promise((resolve, reject) => {
    const cleanup = (): void => {
      clearTimeout(timer)
      window.webContents.ipc.removeListener('patch-cable:reply', reply)
      window.removeListener('closed', closed)
    }
    const closed = (): void => {
      cleanup()
      reject(new Error('The patch cable window closed before acknowledging the command.'))
    }
    const reply = (event: IpcMainEvent, value: unknown): void => {
      if (event.senderFrame !== window.webContents.mainFrame) {
        return
      }
      const parsed = PatchCommandReplySchema.safeParse(value)
      if (!parsed.success || parsed.data.requestId !== requestId) {
        return
      }
      cleanup()
      if (parsed.data.error || !parsed.data.result) {
        reject(new Error(parsed.data.error ?? 'Empty patch reply'))
      } else {
        resolve(parsed.data.result)
      }
    }
    const timer = setTimeout(() => {
      cleanup()
      reject(
        new Error(
          'Patch command timed out. Inspect patch list before retrying; the cable or mail may already exist.'
        )
      )
    }, 30_000)
    window.webContents.ipc.on('patch-cable:reply', reply)
    window.once('closed', closed)
    window.webContents.send('patch-cable:command', { requestId, command })
  })
}
