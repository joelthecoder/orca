import type { PatchCableFrame } from '../shared/patch-cable-frame'
import type { ContextBridge, IpcRenderer } from 'electron'

// Sandboxed preloads cannot load the main bundle's shared import helpers.
const {
  contextBridge,
  ipcRenderer
}: { contextBridge: ContextBridge; ipcRenderer: IpcRenderer } = require('electron')

contextBridge.exposeInMainWorld('patchCableOverlay', {
  subscribe(listener: (frame: PatchCableFrame) => void): () => void {
    const receive = (_event: Electron.IpcRendererEvent, frame: PatchCableFrame): void =>
      listener(frame)
    ipcRenderer.on('patch-cable:frame', receive)
    ipcRenderer.send('patch-cable:ready')
    return () => ipcRenderer.removeListener('patch-cable:frame', receive)
  }
})
