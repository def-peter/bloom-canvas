import { join, resolve } from 'node:path'

const LEGACY_MAC_APP_NAME = 'bloom-canvas.app'

interface LegacyApplicationMigrationInput {
  platform: NodeJS.Platform
  isPackaged: boolean
  currentExecutablePath: string
  homeDirectory: string
  pathExists(path: string): Promise<boolean>
  confirmRemoval(path: string): Promise<boolean>
  trashItem(path: string): Promise<void>
}

export type LegacyApplicationMigrationResult = 'not-applicable' | 'not-found' | 'kept' | 'removed'

function getMacBundlePath(executablePath: string): string | null {
  const marker = '.app/Contents/MacOS/'
  const markerIndex = executablePath.lastIndexOf(marker)
  if (markerIndex === -1) return null

  return executablePath.slice(0, markerIndex + '.app'.length)
}

export async function migrateLegacyMacApplication(
  input: LegacyApplicationMigrationInput
): Promise<LegacyApplicationMigrationResult> {
  if (input.platform !== 'darwin' || !input.isPackaged) return 'not-applicable'

  const currentBundlePath = getMacBundlePath(input.currentExecutablePath)
  const candidates = [
    join('/Applications', LEGACY_MAC_APP_NAME),
    join(input.homeDirectory, 'Applications', LEGACY_MAC_APP_NAME)
  ]

  for (const candidate of candidates) {
    if (currentBundlePath && resolve(candidate) === resolve(currentBundlePath)) continue
    if (!(await input.pathExists(candidate))) continue
    if (!(await input.confirmRemoval(candidate))) return 'kept'

    await input.trashItem(candidate)
    return 'removed'
  }

  return 'not-found'
}
