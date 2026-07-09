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
    retry: (generationId: string) =>
      unwrapResult(window.bloomCanvas.generations.retry(generationId))
  },
  prompt: {
    optimize: (input: Parameters<typeof window.bloomCanvas.prompt.optimize>[0]) =>
      unwrapResult(window.bloomCanvas.prompt.optimize(input))
  }
}
