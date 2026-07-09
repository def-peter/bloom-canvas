import { readFile } from 'fs/promises'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

describe('preload bridge', () => {
  it('keeps the preload script compatible with sandboxed Electron windows', async () => {
    const source = await readFile(join(process.cwd(), 'src/preload/index.ts'), 'utf8')

    expect(source).not.toContain('@electron-toolkit/preload')
    expect(source).toContain("contextBridge.exposeInMainWorld('bloomCanvas'")
  })

  it('exposes logo project and prompt APIs', async () => {
    const source = await readFile(join(process.cwd(), 'src/preload/index.ts'), 'utf8')

    expect(source).toContain('logoProjects')
    expect(source).toContain('logoPrompt')
    expect(source).toContain('IPC_CHANNELS.logoProjectList')
    expect(source).toContain('IPC_CHANNELS.logoPromptBuild')
  })
})
