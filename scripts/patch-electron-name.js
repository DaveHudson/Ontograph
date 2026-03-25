// Patches the dev Electron binary's Info.plist so macOS menu bar shows "Ontograph" instead of "Electron"
const { execFileSync } = require('child_process')
const { existsSync } = require('fs')

if (process.platform !== 'darwin') process.exit(0)

const plist = 'node_modules/electron/dist/Electron.app/Contents/Info.plist'
if (!existsSync(plist)) process.exit(0)

try {
  execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Set CFBundleName Ontograph', plist])
  execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Set CFBundleDisplayName Ontograph', plist])
} catch {
  // Non-fatal — only affects dev menu bar label
}
