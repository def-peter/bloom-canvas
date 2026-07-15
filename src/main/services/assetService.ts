import { createHash } from 'crypto'
import { createReadStream } from 'fs'
import { copyFile, mkdir, stat, writeFile } from 'fs/promises'
import { basename, extname, join } from 'path'
import { nanoid } from 'nanoid'
import sharp from 'sharp'
import type { Asset, AssetId, AssetType, GenerationId } from '../../shared/types'
import type { AppPaths } from './appPaths'
import type { StorageService } from './storageService'

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
}

export class AssetService {
  constructor(
    private readonly paths: AppPaths,
    private readonly storage: StorageService
  ) {}

  async importReference(filePath: string): Promise<Asset> {
    return this.saveAssetFromFile('reference', filePath)
  }

  async getMany(assetIds: AssetId[]): Promise<Asset[]> {
    const state = await this.storage.read()
    return assetIds
      .map((assetId) => state.assets.find((asset) => asset.id === assetId))
      .filter((asset): asset is Asset => Boolean(asset))
  }

  async saveOutputFromBuffer(
    buffer: Buffer,
    extension: '.png' | '.jpg' | '.jpeg' | '.webp',
    sourceGenerationId: GenerationId
  ): Promise<Asset> {
    const id = nanoid()
    const filePath = join(this.paths.outputsDir, `${id}${extension}`)
    await mkdir(this.paths.outputsDir, { recursive: true })
    await writeFile(filePath, buffer)
    return this.saveAssetAtPath(id, 'output', filePath, sourceGenerationId)
  }

  async exportAsset(assetId: AssetId, targetDirectory?: string): Promise<string> {
    const state = await this.storage.read()
    const asset = state.assets.find((item) => item.id === assetId)
    if (!asset) {
      throw new Error('Asset not found')
    }

    const outputDir = targetDirectory ?? this.paths.outputsDir
    await mkdir(outputDir, { recursive: true })
    const targetPath = join(outputDir, basename(asset.filePath))
    await copyFile(asset.filePath, targetPath)
    return targetPath
  }

  private async saveAssetFromFile(
    type: AssetType,
    sourcePath: string,
    sourceGenerationId?: GenerationId
  ): Promise<Asset> {
    const extension = extname(sourcePath).toLowerCase()
    if (!MIME_BY_EXT[extension]) {
      throw new Error('Unsupported image format')
    }

    const id = nanoid()
    const targetDir = type === 'reference' ? this.paths.referencesDir : this.paths.outputsDir
    const filePath = join(targetDir, `${id}${extension}`)
    await mkdir(targetDir, { recursive: true })
    await copyFile(sourcePath, filePath)
    return this.saveAssetAtPath(id, type, filePath, sourceGenerationId)
  }

  private async saveAssetAtPath(
    id: string,
    type: AssetType,
    filePath: string,
    sourceGenerationId?: GenerationId
  ): Promise<Asset> {
    const extension = extname(filePath).toLowerCase()
    const mimeType = MIME_BY_EXT[extension]
    if (!mimeType) {
      throw new Error('Unsupported image format')
    }

    await mkdir(this.paths.thumbnailsDir, { recursive: true })
    const metadata = await sharp(filePath).metadata()
    const thumbnailPath = join(this.paths.thumbnailsDir, `${id}.webp`)
    await sharp(filePath)
      .resize({ width: 360, height: 360, fit: 'inside' })
      .webp({ quality: 82 })
      .toFile(thumbnailPath)

    const fileStat = await stat(filePath)
    const asset: Asset = {
      id,
      type,
      filePath,
      thumbnailPath,
      mimeType,
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
      size: fileStat.size,
      sha256: await this.sha256(filePath),
      createdAt: new Date().toISOString(),
      sourceGenerationId
    }

    await this.storage.update((state) => ({
      ...state,
      assets: [...state.assets, asset]
    }))

    return asset
  }

  private async sha256(filePath: string): Promise<string> {
    const hash = createHash('sha256')
    await new Promise<void>((resolve, reject) => {
      createReadStream(filePath)
        .on('data', (chunk) => hash.update(chunk))
        .on('error', reject)
        .on('end', () => resolve())
    })
    return hash.digest('hex')
  }
}
