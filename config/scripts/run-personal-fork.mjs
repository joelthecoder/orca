import { homedir } from 'node:os'
import path from 'node:path'

const configHome =
  process.platform === 'darwin'
    ? path.join(homedir(), 'Library', 'Application Support')
    : process.platform === 'win32'
      ? process.env.APPDATA || path.join(homedir(), 'AppData', 'Roaming')
      : process.env.XDG_CONFIG_HOME || path.join(homedir(), '.config')

// Keep the fork's profile and updater lifecycle separate from the packaged app.
process.env.ORCA_DEV_USER_DATA_PATH ||= path.join(configHome, 'orca-joel')
process.env.ORCA_DEV_INSTANCE_KEY ||= 'joel-personal-fork'
process.env.ORCA_DEV_INSTANCE_LABEL ||= 'Joel’s fork'
process.env.ORCA_DEV_DOCK_TITLE ||= 'Orca — Joel'
await import('./run-electron-vite-dev.mjs')
