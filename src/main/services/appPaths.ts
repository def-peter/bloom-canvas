import { app } from 'electron'
import { join } from 'path'

export interface AppPaths {
  dataDir: string
  metadataPath: string
  referencesDir: string
  outputsDir: string
  thumbnailsDir: string
  tempDir: string
}

export function getAppPaths(): AppPaths {
  const dataDir = join(app.getPath('userData'), 'BloomCanvasData')

  return {
    dataDir,
    metadataPath: join(dataDir, 'bloom-canvas.json'),
    referencesDir: join(dataDir, 'assets', 'references'),
    outputsDir: join(dataDir, 'assets', 'outputs'),
    thumbnailsDir: join(dataDir, 'thumbnails'),
    tempDir: join(dataDir, 'temp')
  }
}
