import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import type { AppPaths } from './appPaths'

const ALGORITHM = 'aes-256-gcm'

interface CredentialFile {
  version: 1
  entries: Record<string, string>
}

export class CredentialService {
  private readonly credentialsPath: string
  private readonly keyPath: string

  constructor(paths: AppPaths) {
    this.credentialsPath = join(paths.dataDir, 'credentials.enc.json')
    this.keyPath = join(paths.dataDir, 'credentials.key')
  }

  async saveApiKey(providerId: string, apiKey: string): Promise<void> {
    const file = await this.readCredentials()
    file.entries[this.accountName(providerId)] = await this.encrypt(apiKey)
    await this.writeCredentials(file)
  }

  async getApiKey(providerId: string): Promise<string | null> {
    const file = await this.readCredentials()
    const encrypted = file.entries[this.accountName(providerId)]
    return encrypted ? this.decrypt(encrypted) : null
  }

  async deleteApiKey(providerId: string): Promise<void> {
    const file = await this.readCredentials()
    delete file.entries[this.accountName(providerId)]
    await this.writeCredentials(file)
  }

  private accountName(providerId: string): string {
    return `provider:${providerId}:api-key`
  }

  private async readCredentials(): Promise<CredentialFile> {
    try {
      const raw = await readFile(this.credentialsPath, 'utf8')
      const parsed = JSON.parse(raw) as CredentialFile
      return { version: 1, entries: parsed.entries ?? {} }
    } catch {
      return { version: 1, entries: {} }
    }
  }

  private async writeCredentials(file: CredentialFile): Promise<void> {
    await mkdir(dirname(this.credentialsPath), { recursive: true })
    await writeFile(this.credentialsPath, `${JSON.stringify(file, null, 2)}\n`, 'utf8')
  }

  private async readKey(): Promise<Buffer> {
    try {
      return Buffer.from(await readFile(this.keyPath, 'utf8'), 'base64')
    } catch {
      const key = randomBytes(32)
      await mkdir(dirname(this.keyPath), { recursive: true })
      await writeFile(this.keyPath, key.toString('base64'), { encoding: 'utf8', mode: 0o600 })
      return key
    }
  }

  private async encrypt(value: string): Promise<string> {
    const key = await this.readKey()
    const iv = randomBytes(12)
    const cipher = createCipheriv(ALGORITHM, key, iv)
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return Buffer.concat([iv, tag, encrypted]).toString('base64')
  }

  private async decrypt(value: string): Promise<string> {
    const key = await this.readKey()
    const payload = Buffer.from(value, 'base64')
    const iv = payload.subarray(0, 12)
    const tag = payload.subarray(12, 28)
    const encrypted = payload.subarray(28)
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
  }
}
