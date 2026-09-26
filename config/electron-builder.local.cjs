const base = require('./electron-builder.config.cjs')

module.exports = {
  ...base,
  appId: 'com.joelthecoder.orca.local',
  productName: 'Orca Local',
  protocols: [],
  publish: null,
  forceCodeSigning: false,
  directories: { ...base.directories, output: 'dist/local' },
  extraMetadata: { ...base.extraMetadata, name: 'orca-local' },
  mac: {
    ...base.mac,
    executableName: 'Orca',
    identity: '-',
    hardenedRuntime: false,
    notarize: false,
    target: ['dir']
  }
}
