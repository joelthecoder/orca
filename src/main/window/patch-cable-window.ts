import { BrowserWindow } from 'electron'
import { registerPatchCommandWindow } from './patch-cable-commands'
import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { isBackgroundLaunch } from './foreground-activation-policy'
import {
  PatchCableFrameSchema,
  PATCH_CABLE_OVERHANG,
  PATCH_CABLE_WINDOW_WIDTH,
  type PatchCableFrame
} from '../../shared/patch-cable-frame'

export function installPatchCableWindow(parent: BrowserWindow): void {
  registerPatchCommandWindow(parent)
  let overlay: BrowserWindow | null = null
  let frame: PatchCableFrame | null = null
  let ready = false
  const sync = (): void => {
    if (!overlay || overlay.isDestroyed() || parent.isDestroyed()) {
      return
    }
    const content = parent.getContentBounds()
    const zoom = parent.webContents.getZoomFactor()
    overlay.setBounds({
      x: Math.round(content.x + ((frame?.left ?? 0) - PATCH_CABLE_OVERHANG) * zoom),
      y: content.y,
      width: Math.ceil((frame?.width ?? PATCH_CABLE_WINDOW_WIDTH) * zoom),
      height: content.height
    })
    overlay.webContents.setZoomFactor(zoom)
    if (ready && frame) {
      overlay.webContents.send('patch-cable:frame', frame)
    }
    const visible = Boolean(
      ready &&
      frame?.cables.length &&
      parent.isVisible() &&
      !parent.isMinimized() &&
      !parent.isFullScreen()
    )
    if (visible && !isBackgroundLaunch()) {
      if (!overlay.isVisible()) {
        overlay.showInactive()
      }
    } else {
      overlay.hide()
    }
  }
  const create = (): void => {
    if (overlay) {
      return
    }
    overlay = new BrowserWindow({
      parent,
      title: 'Orca patch cables',
      width: PATCH_CABLE_WINDOW_WIDTH,
      height: 1,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      focusable: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      hasShadow: false,
      webPreferences: {
        preload: join(__dirname, 'patch-cable-overlay-preload.js'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        partition: 'orca-patch-cables'
      }
    })
    overlay.setIgnoreMouseEvents(true)
    overlay.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    overlay.webContents.on('will-navigate', (event) => event.preventDefault())
    overlay.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) =>
      callback(false)
    )
    overlay.webContents.session.setPermissionCheckHandler(() => false)
    overlay.webContents.ipc.on('patch-cable:ready', (event) => {
      if (event.senderFrame !== overlay?.webContents.mainFrame) {
        return
      }
      ready = true
      sync()
    })
    overlay.on('closed', () => {
      overlay = null
      ready = false
    })
    const loading =
      is.dev && process.env.ELECTRON_RENDERER_URL
        ? overlay.loadURL(
            new URL('patch-cable-overlay.html', process.env.ELECTRON_RENDERER_URL).href
          )
        : overlay.loadFile(join(__dirname, '../renderer/patch-cable-overlay.html'))
    void loading.catch(() => {
      overlay?.close()
      overlay = null
      ready = false
    })
  }
  parent.webContents.ipc.on('patch-cable:publish', (event, value: unknown) => {
    if (event.senderFrame !== parent.webContents.mainFrame) {
      return
    }
    if (value === null) {
      frame = null
      sync()
      return
    }
    const parsed = PatchCableFrameSchema.safeParse(value)
    if (!parsed.success) {
      return
    }
    frame = parsed.data
    if (frame.cables.length) {
      create()
    }
    sync()
  })
  parent.webContents.on('did-start-loading', () => {
    frame = null
    sync()
  })
  parent.on('move', sync)
  parent.on('resize', sync)
  parent.on('show', sync)
  parent.on('hide', sync)
  parent.on('minimize', sync)
  parent.on('restore', sync)
  parent.on('enter-full-screen', sync)
  parent.on('leave-full-screen', sync)
  parent.on('closed', () => {
    overlay?.destroy()
    overlay = null
  })
}
