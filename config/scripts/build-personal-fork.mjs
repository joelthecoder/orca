import { execFileSync } from 'node:child_process'
import { renameSync } from 'node:fs'
import { join } from 'node:path'
import { getLocalBuildIdentity } from './build-mac-local.mjs'

if (process.platform !== 'darwin') {
  throw new Error('Orca Local application packaging currently supports macOS only.')
}
const identity = getLocalBuildIdentity()
const env = {
  ...process.env,
  ORCA_PERSONAL_FORK: '1',
  ORCA_BACKGROUND_LAUNCH: '1',
  ORCA_LOCAL_BUILD_VERSION: identity.version,
  ORCA_BUILD_COMMIT: identity.commit,
  CSC_IDENTITY_AUTO_DISCOVERY: 'false'
}
for (const args of [
  ['--dir', 'mobile', 'run', 'postinstall'],
  ['run', 'build:release'],
  ['run', 'ensure:electron-runtime'],
  [
    'exec',
    'electron-builder',
    '--config',
    'config/electron-builder.local.cjs',
    '--mac',
    `--${process.arch}`,
    '--dir',
    '--publish',
    'never'
  ]
]) {
  execFileSync('pnpm', args, { env, stdio: 'inherit' })
}
// Preserve the bundled CLI's executable name while giving Finder the fork's display name.
const output = join('dist', 'local', process.arch === 'arm64' ? 'mac-arm64' : 'mac')
renameSync(join(output, 'Orca.app'), join(output, 'Orca Local.app'))
