import { mkdir, readFile, rename, writeFile } from 'fs/promises'
import { dirname } from 'path'
import type {
  AppSettings,
  Asset,
  Generation,
  LogoProject,
  ProviderConfig,
  Variant
} from '../../shared/types'
import type { AppPaths } from './appPaths'

export interface MetadataState {
  providers: ProviderConfig[]
  settings: AppSettings
  assets: Asset[]
  generations: Generation[]
  variants: Variant[]
  logoProjects: LogoProject[]
}

export const defaultSettings: AppSettings = {
  defaultProviderId: null,
  defaultSize: '1024x1024',
  defaultQuality: 'standard',
  defaultCount: 1,
  defaultOutputFormat: 'png',
  outputDirectory: null,
  theme: 'system'
}

export class StorageService {
  constructor(private readonly paths: AppPaths) {}

  async init(): Promise<void> {
    await mkdir(this.paths.dataDir, { recursive: true })
    await mkdir(this.paths.referencesDir, { recursive: true })
    await mkdir(this.paths.outputsDir, { recursive: true })
    await mkdir(this.paths.thumbnailsDir, { recursive: true })
    await mkdir(this.paths.tempDir, { recursive: true })
    await this.writeIfMissing()
  }

  async read(): Promise<MetadataState> {
    await this.initDirectories()
    try {
      const raw = await readFile(this.paths.metadataPath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<MetadataState>
      return {
        providers: parsed.providers ?? [],
        settings: { ...defaultSettings, ...parsed.settings },
        assets: parsed.assets ?? [],
        generations: parsed.generations ?? [],
        variants: parsed.variants ?? [],
        logoProjects: parsed.logoProjects ?? []
      }
    } catch {
      return this.emptyState()
    }
  }

  async write(nextState: MetadataState): Promise<void> {
    await mkdir(dirname(this.paths.metadataPath), { recursive: true })
    const tempPath = `${this.paths.metadataPath}.tmp`
    await writeFile(tempPath, `${JSON.stringify(nextState, null, 2)}\n`, 'utf8')
    await rename(tempPath, this.paths.metadataPath)
  }

  async update(
    mutator: (state: MetadataState) => MetadataState | Promise<MetadataState>
  ): Promise<MetadataState> {
    const current = await this.read()
    const next = await mutator(current)
    await this.write(next)
    return next
  }

  private async writeIfMissing(): Promise<void> {
    try {
      await readFile(this.paths.metadataPath, 'utf8')
    } catch {
      await this.write(this.emptyState())
    }
  }

  private async initDirectories(): Promise<void> {
    await mkdir(this.paths.dataDir, { recursive: true })
    await mkdir(this.paths.referencesDir, { recursive: true })
    await mkdir(this.paths.outputsDir, { recursive: true })
    await mkdir(this.paths.thumbnailsDir, { recursive: true })
    await mkdir(this.paths.tempDir, { recursive: true })
  }

  private emptyState(): MetadataState {
    return {
      providers: [],
      settings: defaultSettings,
      assets: [],
      generations: [],
      variants: [],
      logoProjects: []
    }
  }
}
