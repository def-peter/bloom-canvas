import type { AppResult } from '../../../shared/types'

export class BloomCanvasClientError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly detail?: string
  ) {
    super(message)
  }
}

export async function unwrapResult<T>(promise: Promise<AppResult<T>>): Promise<T> {
  const result = await promise
  if (result.ok) return result.data
  throw new BloomCanvasClientError(result.error.message, result.error.code, result.error.detail)
}

function requireApiMethod<T extends (...args: never[]) => Promise<AppResult<unknown>>>(
  method: T | undefined,
  featureName: string
): T {
  if (typeof method !== 'function') {
    throw new BloomCanvasClientError(
      `${featureName}需要重新加载应用接口。请完全退出并重新打开生花后再试。`,
      'preload_api_mismatch'
    )
  }
  return method
}

export const bloomCanvasClient = {
  providers: {
    list: () => unwrapResult(window.bloomCanvas.providers.list()),
    save: (input: Parameters<typeof window.bloomCanvas.providers.save>[0]) =>
      unwrapResult(window.bloomCanvas.providers.save(input)),
    getActive: () => unwrapResult(window.bloomCanvas.providers.getActive())
  },
  settings: {
    get: () => unwrapResult(window.bloomCanvas.settings.get()),
    save: (input: Parameters<typeof window.bloomCanvas.settings.save>[0]) =>
      unwrapResult(window.bloomCanvas.settings.save(input))
  },
  assets: {
    getPathForFile: (file: File) => window.bloomCanvas.assets.getPathForFile(file),
    import: (input: Parameters<typeof window.bloomCanvas.assets.import>[0]) =>
      unwrapResult(window.bloomCanvas.assets.import(input)),
    export: (input: Parameters<typeof window.bloomCanvas.assets.export>[0]) =>
      unwrapResult(window.bloomCanvas.assets.export(input))
  },
  generations: {
    create: (input: Parameters<typeof window.bloomCanvas.generations.create>[0]) =>
      unwrapResult(window.bloomCanvas.generations.create(input)),
    list: () => unwrapResult(window.bloomCanvas.generations.list()),
    favorite: (generationId: string, favorite: boolean) =>
      unwrapResult(window.bloomCanvas.generations.favorite(generationId, favorite)),
    remove: (generationId: string) => {
      const remove = requireApiMethod(window.bloomCanvas.generations.remove, '删除历史记录')
      return unwrapResult(remove(generationId))
    },
    retry: (generationId: string) =>
      unwrapResult(window.bloomCanvas.generations.retry(generationId))
  },
  prompt: {
    optimize: (input: Parameters<typeof window.bloomCanvas.prompt.optimize>[0]) =>
      unwrapResult(window.bloomCanvas.prompt.optimize(input))
  },
  logoProjects: {
    list: () => unwrapResult(window.bloomCanvas.logoProjects.list()),
    save: (input: Parameters<typeof window.bloomCanvas.logoProjects.save>[0]) =>
      unwrapResult(window.bloomCanvas.logoProjects.save(input)),
    get: (id: string) => unwrapResult(window.bloomCanvas.logoProjects.get(id))
  },
  logoStrategy: {
    generate: (input: Parameters<typeof window.bloomCanvas.logoStrategy.generate>[0]) =>
      unwrapResult(window.bloomCanvas.logoStrategy.generate(input))
  },
  logoPrompt: {
    build: (input: Parameters<typeof window.bloomCanvas.logoPrompt.build>[0]) =>
      unwrapResult(window.bloomCanvas.logoPrompt.build(input)),
    buildStrategy: (input: Parameters<typeof window.bloomCanvas.logoPrompt.buildStrategy>[0]) =>
      unwrapResult(window.bloomCanvas.logoPrompt.buildStrategy(input))
  }
}
