import { describe, expect, it, vi } from 'vitest'
import { migrateLegacyMacApplication } from './legacyApplicationMigration'

type MigrationInput = Parameters<typeof migrateLegacyMacApplication>[0]

function createInput(overrides: Partial<MigrationInput> = {}): MigrationInput {
  return {
    platform: 'darwin' as NodeJS.Platform,
    isPackaged: true,
    currentExecutablePath: '/Applications/绽画.app/Contents/MacOS/绽画',
    homeDirectory: '/Users/peter',
    pathExists: vi.fn(async (path: string) => path === '/Applications/bloom-canvas.app'),
    confirmRemoval: vi.fn(async () => true),
    trashItem: vi.fn(async () => undefined),
    ...overrides
  }
}

describe('legacy macOS application migration', () => {
  it('offers to remove the old application without touching user data', async () => {
    const input = createInput()

    await expect(migrateLegacyMacApplication(input)).resolves.toBe('removed')
    expect(input.confirmRemoval).toHaveBeenCalledWith('/Applications/bloom-canvas.app')
    expect(input.trashItem).toHaveBeenCalledWith('/Applications/bloom-canvas.app')
  })

  it('keeps the old application when removal is declined', async () => {
    const input = createInput({ confirmRemoval: vi.fn(async () => false) })

    await expect(migrateLegacyMacApplication(input)).resolves.toBe('kept')
    expect(input.trashItem).not.toHaveBeenCalled()
  })

  it('does nothing outside a packaged macOS application', async () => {
    const input = createInput({ platform: 'win32' as NodeJS.Platform })

    await expect(migrateLegacyMacApplication(input)).resolves.toBe('not-applicable')
    expect(input.pathExists).not.toHaveBeenCalled()
  })

  it('never removes the application that is currently running', async () => {
    const input = createInput({
      currentExecutablePath: '/Applications/bloom-canvas.app/Contents/MacOS/绽画'
    })

    await expect(migrateLegacyMacApplication(input)).resolves.toBe('not-found')
    expect(input.confirmRemoval).not.toHaveBeenCalled()
    expect(input.trashItem).not.toHaveBeenCalled()
  })
})
