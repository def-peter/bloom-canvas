import { readFile } from 'fs/promises'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

describe('preload bridge', () => {
  it('keeps the preload script compatible with sandboxed Electron windows', async () => {
    const source = await readFile(join(process.cwd(), 'src/preload/index.ts'), 'utf8')

    expect(source).not.toContain('@electron-toolkit/preload')
    expect(source).toContain("contextBridge.exposeInMainWorld('bloomCanvas'")
  })

  it('exposes update commands and a removable status subscription', async () => {
    const [ipcSource, preloadSource] = await Promise.all([
      readFile(join(process.cwd(), 'src/shared/ipc.ts'), 'utf8'),
      readFile(join(process.cwd(), 'src/preload/index.ts'), 'utf8')
    ])

    expect(ipcSource).toContain("updateCheck: 'update:check'")
    expect(ipcSource).toContain("updateStatusChanged: 'update:statusChanged'")
    expect(preloadSource).toContain('IPC_CHANNELS.updateDownload')
    expect(preloadSource).toContain('IPC_CHANNELS.updateInstall')
    expect(preloadSource).toContain('ipcRenderer.removeListener(IPC_CHANNELS.updateStatusChanged')
  })

  it('exposes logo project and strategy APIs on their matching IPC channels', async () => {
    const [ipcSource, preloadSource] = await Promise.all([
      readFile(join(process.cwd(), 'src/shared/ipc.ts'), 'utf8'),
      readFile(join(process.cwd(), 'src/preload/index.ts'), 'utf8')
    ])

    expect(preloadSource).toContain('logoProjects')
    expect(preloadSource).toContain('logoPrompt')
    expect(preloadSource).toContain('IPC_CHANNELS.logoProjectList')
    expect(preloadSource).toContain('IPC_CHANNELS.logoPromptBuild')
    expect(ipcSource).toContain("logoStrategyGenerate: 'logoStrategy:generate'")
    expect(ipcSource).toContain("logoPromptBuildStrategy: 'logoPrompt:buildStrategy'")
    expect(preloadSource).toContain('logoStrategy: {')
    expect(preloadSource).toContain(
      'generate: (input) => ipcRenderer.invoke(IPC_CHANNELS.logoStrategyGenerate, input)'
    )
    expect(preloadSource).toContain(
      'buildStrategy: (input) => ipcRenderer.invoke(IPC_CHANNELS.logoPromptBuildStrategy, input)'
    )
    expect(ipcSource).toContain("logoPromptBuildRefinement: 'logoPrompt:buildRefinement'")
    expect(preloadSource).toContain('IPC_CHANNELS.logoPromptBuildRefinement')
  })

  it('exposes variant batch deletion and logo project deletion channels', async () => {
    const [ipcSource, preloadSource] = await Promise.all([
      readFile(join(process.cwd(), 'src/shared/ipc.ts'), 'utf8'),
      readFile(join(process.cwd(), 'src/preload/index.ts'), 'utf8')
    ])

    expect(ipcSource).toContain("generationRemoveVariants: 'generation:removeVariants'")
    expect(ipcSource).toContain("logoProjectRemove: 'logoProject:remove'")
    expect(preloadSource).toContain('removeVariants: (variantIds) =>')
    expect(preloadSource).toContain('IPC_CHANNELS.generationRemoveVariants, variantIds')
    expect(preloadSource).toContain(
      'remove: (id) => ipcRenderer.invoke(IPC_CHANNELS.logoProjectRemove, id)'
    )
  })

  it('exposes asset lookup for restoring project references', async () => {
    const [ipcSource, preloadSource] = await Promise.all([
      readFile(join(process.cwd(), 'src/shared/ipc.ts'), 'utf8'),
      readFile(join(process.cwd(), 'src/preload/index.ts'), 'utf8')
    ])

    expect(ipcSource).toContain("assetGetMany: 'asset:getMany'")
    expect(preloadSource).toContain(
      'getMany: (assetIds) => ipcRenderer.invoke(IPC_CHANNELS.assetGetMany, assetIds)'
    )
  })

  it('exposes in-memory image import for pasted files', async () => {
    const [ipcSource, preloadSource] = await Promise.all([
      readFile(join(process.cwd(), 'src/shared/ipc.ts'), 'utf8'),
      readFile(join(process.cwd(), 'src/preload/index.ts'), 'utf8')
    ])

    expect(ipcSource).toContain("assetImportData: 'asset:importData'")
    expect(preloadSource).toContain(
      'importData: (input) => ipcRenderer.invoke(IPC_CHANNELS.assetImportData, input)'
    )
  })

  it('exposes logo preview and review APIs', async () => {
    const [ipcSource, preloadSource] = await Promise.all([
      readFile(join(process.cwd(), 'src/shared/ipc.ts'), 'utf8'),
      readFile(join(process.cwd(), 'src/preload/index.ts'), 'utf8')
    ])

    expect(ipcSource).toContain("logoPreviewGet: 'logoPreview:get'")
    expect(ipcSource).toContain("logoReviewRun: 'logoReview:run'")
    expect(preloadSource).toContain('logoPreview: {')
    expect(preloadSource).toContain('logoReview: {')
    expect(preloadSource).toContain('IPC_CHANNELS.logoPreviewGet')
    expect(preloadSource).toContain('IPC_CHANNELS.logoReviewRun')
  })
})
