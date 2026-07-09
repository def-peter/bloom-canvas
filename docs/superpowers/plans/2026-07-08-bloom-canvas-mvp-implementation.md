# BloomCanvas MVP 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 构建 BloomCanvas / 生花首版桌面工作台，使用户可以配置自定义 OpenAI-compatible Provider，通过文字和参考图生成图片，并在本地保存历史记录、图片资产和生成参数。

**架构：** 保持 Electron Main 作为可信后端边界，Renderer 只通过 typed IPC 调用白名单能力。Main 负责 Provider 配置、API Key 存取、图片文件写入、本地 JSON 元数据存储和 OpenAI-compatible 图像接口调用。Renderer 用 React + antd 实现三栏工作台：左侧历史、中间结果、右侧创作面板。

**技术栈：** Electron 39、electron-vite、React 19、TypeScript 5、antd、@ant-design/icons、keytar、sharp、nanoid、Zod、Vitest。

---

## 文件结构

### 依赖与配置

- 修改：`package.json`
  - 新增运行依赖：`antd`、`@ant-design/icons`、`keytar`、`sharp`、`nanoid`、`zod`。
  - 新增开发依赖：`vitest`、`@testing-library/react`、`@testing-library/jest-dom`、`jsdom`。
  - 新增脚本：`test`、`test:run`。
- 修改：`tsconfig.node.json`
  - 确认 Main 侧测试和新增 TypeScript 文件被包含。
- 修改：`tsconfig.web.json`
  - 确认 Renderer 测试和 JSX 类型可用。

### 共享类型

- 创建：`src/shared/types.ts`
  - 定义 `ProviderConfig`、`Generation`、`Asset`、`Variant`、`GenerationParameters`、`CreateGenerationInput`、`AppSettings`、IPC 返回类型。
- 创建：`src/shared/ipc.ts`
  - 定义 IPC channel 常量和 `BloomCanvasApi` 接口。
- 创建：`src/shared/schemas.ts`
  - 使用 Zod 校验 Renderer 到 Main 的输入。

### Main 进程

- 创建：`src/main/services/appPaths.ts`
  - 计算应用数据目录、资产目录、缩略图目录、临时目录。
- 创建：`src/main/services/storageService.ts`
  - 用 JSON 文件保存元数据，首版避免 SQLite 原生依赖复杂度；对外接口保留仓储边界，后续可迁移 SQLite。
- 创建：`src/main/services/credentialService.ts`
  - 使用 `keytar` 保存、读取、删除 API Key；失败时返回结构化错误。
- 创建：`src/main/services/assetService.ts`
  - 导入参考图、保存输出图、生成缩略图、导出图片。
- 创建：`src/main/services/providerConfigService.ts`
  - 保存 Provider 配置，API Key 委托给 `credentialService`。
- 创建：`src/main/services/openAICompatibleProvider.ts`
  - 实现文生图和参考图生图调用，兼容自定义 Base URL。
- 创建：`src/main/services/promptOptimizeService.ts`
  - 用当前 Provider 的 prompt model 优化提示词，保留原文。
- 创建：`src/main/services/generationService.ts`
  - 编排一次生成：校验输入、读取 Provider、调用图像接口、保存图片、写入历史。
- 创建：`src/main/ipc/registerIpcHandlers.ts`
  - 注册白名单 IPC：`provider:list`、`provider:save`、`provider:getActive`、`settings:get`、`settings:save`、`asset:import`、`asset:export`、`generation:create`、`generation:list`、`generation:favorite`、`generation:retry`、`prompt:optimize`。
- 修改：`src/main/index.ts`
  - 收紧 `webPreferences`，启用 `contextIsolation`，禁用 Renderer Node 能力，注册 IPC。

### Preload

- 修改：`src/preload/index.ts`
  - 暴露 typed `window.bloomCanvas` API。
- 修改：`src/preload/index.d.ts`
  - 声明 `window.bloomCanvas` 类型，移除 `api: unknown`。

### Renderer

- 修改：`src/renderer/src/main.tsx`
  - 引入 antd reset 样式和全局 App。
- 修改：`src/renderer/src/App.tsx`
  - 替换 electron-vite 默认页面为 BloomCanvas 工作台。
- 创建：`src/renderer/src/api/bloomCanvasClient.ts`
  - 封装 `window.bloomCanvas`，集中处理 IPC 错误。
- 创建：`src/renderer/src/state/workbenchStore.ts`
  - 管理当前 Provider、设置、历史、选中记录、生成状态。
- 创建：`src/renderer/src/components/AppShell.tsx`
  - 三栏工作台布局和顶部状态栏。
- 创建：`src/renderer/src/components/HistoryPanel.tsx`
  - 历史列表、搜索、收藏筛选。
- 创建：`src/renderer/src/components/GalleryPanel.tsx`
  - 结果网格、空状态、生成中状态、大图预览入口。
- 创建：`src/renderer/src/components/CreationPanel.tsx`
  - 提示词、参考图上传、基础参数、生成按钮。
- 创建：`src/renderer/src/components/ProviderSettingsModal.tsx`
  - Base URL、API Key、图像模型、提示词模型配置。
- 创建：`src/renderer/src/components/ImagePreviewModal.tsx`
  - 大图预览、导出、复制提示词、收藏。
- 创建：`src/renderer/src/components/ErrorNotice.tsx`
  - 统一展示 Provider、文件、网络、凭据错误。
- 创建：`src/renderer/src/theme.ts`
  - antd 主题 token。
- 修改：`src/renderer/src/assets/base.css`
  - 替换模板变量为应用级基础样式。
- 修改：`src/renderer/src/assets/main.css`
  - 实现三栏布局、图片网格、表单和响应式行为。

### 测试

- 创建：`src/main/services/storageService.test.ts`
  - 验证元数据读写、默认值、坏 JSON 恢复。
- 创建：`src/main/services/providerConfigService.test.ts`
  - 验证 API Key 不写入元数据文件。
- 创建：`src/main/services/openAICompatibleProvider.test.ts`
  - 使用 mock fetch 验证请求 URL、认证头、文生图和参考图 payload。
- 创建：`src/main/services/generationService.test.ts`
  - 验证一次生成会写入 Generation、Variant、Asset。
- 创建：`src/renderer/src/components/CreationPanel.test.tsx`
  - 验证未配置 Provider 时点击生成会打开设置弹窗。

---

## 任务 1：安装依赖与测试脚本

**文件：**
- 修改：`package.json`
- 修改：`pnpm-lock.yaml`

- [ ] **步骤 1：安装运行依赖**

运行：

```bash
pnpm add antd @ant-design/icons keytar sharp nanoid zod
```

预期：`package.json` dependencies 增加这些依赖，`pnpm-lock.yaml` 更新。

- [ ] **步骤 2：安装测试依赖**

运行：

```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

预期：`package.json` devDependencies 增加这些依赖，`pnpm-lock.yaml` 更新。

- [ ] **步骤 3：添加测试脚本**

在 `package.json` 的 `scripts` 中加入：

```json
{
  "test": "vitest",
  "test:run": "vitest run"
}
```

保留现有 `format`、`lint`、`typecheck`、`build` 等脚本。

- [ ] **步骤 4：运行类型检查确认基线**

运行：

```bash
pnpm typecheck
```

预期：当前模板项目类型检查通过。

- [ ] **步骤 5：Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add BloomCanvas app dependencies"
```

---

## 任务 2：定义共享类型、IPC 协议和输入校验

**文件：**
- 创建：`src/shared/types.ts`
- 创建：`src/shared/ipc.ts`
- 创建：`src/shared/schemas.ts`

- [ ] **步骤 1：创建共享类型**

创建 `src/shared/types.ts`：

```ts
export type ProviderId = string
export type GenerationId = string
export type AssetId = string
export type VariantId = string

export type GenerationMode = 'text-to-image' | 'image-to-image'
export type GenerationStatus = 'pending' | 'running' | 'succeeded' | 'failed'
export type AssetType = 'reference' | 'output'
export type ImageQuality = 'standard' | 'hd'
export type OutputFormat = 'png' | 'jpeg' | 'webp'

export interface GenerationParameters {
  size: '1024x1024' | '1024x1536' | '1536x1024' | 'auto'
  count: number
  quality: ImageQuality
  outputFormat: OutputFormat
}

export interface ProviderConfig {
  id: ProviderId
  name: string
  baseUrl: string
  imageModel: string
  promptModel: string
  hasApiKey: boolean
  createdAt: string
  updatedAt: string
}

export interface AppSettings {
  defaultProviderId: ProviderId | null
  defaultSize: GenerationParameters['size']
  defaultQuality: ImageQuality
  defaultCount: number
  defaultOutputFormat: OutputFormat
  outputDirectory: string | null
  theme: 'light' | 'dark' | 'system'
}

export interface Asset {
  id: AssetId
  type: AssetType
  filePath: string
  thumbnailPath: string
  mimeType: string
  width: number
  height: number
  size: number
  sha256: string
  createdAt: string
  sourceGenerationId?: GenerationId
}

export interface Variant {
  id: VariantId
  generationId: GenerationId
  assetId: AssetId
  index: number
  revisedPrompt?: string
  favorite: boolean
  createdAt: string
}

export interface Generation {
  id: GenerationId
  mode: GenerationMode
  promptOriginal: string
  promptOptimized?: string
  promptFinal: string
  referenceImageIds: AssetId[]
  parameters: GenerationParameters
  outputVariantIds: VariantId[]
  providerId: ProviderId
  status: GenerationStatus
  favorite: boolean
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

export interface GenerationRecord extends Generation {
  references: Asset[]
  variants: Array<Variant & { asset: Asset }>
}

export interface CreateGenerationInput {
  prompt: string
  useOptimizedPrompt: boolean
  optimizedPrompt?: string
  referenceAssetIds: AssetId[]
  parameters: GenerationParameters
  providerId: ProviderId
}

export interface SaveProviderInput {
  id?: ProviderId
  name: string
  baseUrl: string
  imageModel: string
  promptModel: string
  apiKey?: string
}

export interface ImportAssetInput {
  filePath: string
}

export interface ExportAssetInput {
  assetId: AssetId
  targetDirectory?: string
}

export interface PromptOptimizeInput {
  providerId: ProviderId
  prompt: string
}

export interface AppErrorPayload {
  code:
    | 'provider_missing'
    | 'api_key_missing'
    | 'network_error'
    | 'provider_error'
    | 'file_error'
    | 'validation_error'
    | 'unknown_error'
  message: string
  detail?: string
}

export interface ResultOk<T> {
  ok: true
  data: T
}

export interface ResultErr {
  ok: false
  error: AppErrorPayload
}

export type AppResult<T> = ResultOk<T> | ResultErr
```

- [ ] **步骤 2：创建 IPC 接口**

创建 `src/shared/ipc.ts`：

```ts
import type {
  AppResult,
  AppSettings,
  Asset,
  CreateGenerationInput,
  ExportAssetInput,
  GenerationRecord,
  ImportAssetInput,
  PromptOptimizeInput,
  ProviderConfig,
  SaveProviderInput
} from './types'

export const IPC_CHANNELS = {
  providerList: 'provider:list',
  providerSave: 'provider:save',
  providerGetActive: 'provider:getActive',
  settingsGet: 'settings:get',
  settingsSave: 'settings:save',
  assetImport: 'asset:import',
  assetExport: 'asset:export',
  generationCreate: 'generation:create',
  generationList: 'generation:list',
  generationFavorite: 'generation:favorite',
  generationRetry: 'generation:retry',
  promptOptimize: 'prompt:optimize'
} as const

export interface BloomCanvasApi {
  providers: {
    list: () => Promise<AppResult<ProviderConfig[]>>
    save: (input: SaveProviderInput) => Promise<AppResult<ProviderConfig>>
    getActive: () => Promise<AppResult<ProviderConfig | null>>
  }
  settings: {
    get: () => Promise<AppResult<AppSettings>>
    save: (input: Partial<AppSettings>) => Promise<AppResult<AppSettings>>
  }
  assets: {
    import: (input: ImportAssetInput) => Promise<AppResult<Asset>>
    export: (input: ExportAssetInput) => Promise<AppResult<string>>
  }
  generations: {
    create: (input: CreateGenerationInput) => Promise<AppResult<GenerationRecord>>
    list: () => Promise<AppResult<GenerationRecord[]>>
    favorite: (generationId: string, favorite: boolean) => Promise<AppResult<GenerationRecord>>
    retry: (generationId: string) => Promise<AppResult<GenerationRecord>>
  }
  prompt: {
    optimize: (input: PromptOptimizeInput) => Promise<AppResult<string>>
  }
}
```

- [ ] **步骤 3：创建 Zod 校验**

创建 `src/shared/schemas.ts`：

```ts
import { z } from 'zod'

export const generationParametersSchema = z.object({
  size: z.enum(['1024x1024', '1024x1536', '1536x1024', 'auto']),
  count: z.number().int().min(1).max(4),
  quality: z.enum(['standard', 'hd']),
  outputFormat: z.enum(['png', 'jpeg', 'webp'])
})

export const saveProviderSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(80),
  baseUrl: z.string().trim().url(),
  imageModel: z.string().trim().min(1).max(120),
  promptModel: z.string().trim().max(120),
  apiKey: z.string().trim().min(1).optional()
})

export const importAssetSchema = z.object({
  filePath: z.string().min(1)
})

export const exportAssetSchema = z.object({
  assetId: z.string().min(1),
  targetDirectory: z.string().min(1).optional()
})

export const createGenerationSchema = z.object({
  prompt: z.string().trim().min(1).max(8000),
  useOptimizedPrompt: z.boolean(),
  optimizedPrompt: z.string().trim().max(8000).optional(),
  referenceAssetIds: z.array(z.string().min(1)).max(8),
  parameters: generationParametersSchema,
  providerId: z.string().min(1)
})

export const promptOptimizeSchema = z.object({
  providerId: z.string().min(1),
  prompt: z.string().trim().min(1).max(8000)
})
```

- [ ] **步骤 4：运行类型检查**

运行：

```bash
pnpm typecheck
```

预期：PASS。

- [ ] **步骤 5：Commit**

```bash
git add src/shared
git commit -m "feat: define BloomCanvas shared contracts"
```

---

## 任务 3：实现 Main 侧路径、存储和凭据服务

**文件：**
- 创建：`src/main/services/appPaths.ts`
- 创建：`src/main/services/storageService.ts`
- 创建：`src/main/services/credentialService.ts`
- 创建：`src/main/services/storageService.test.ts`

- [ ] **步骤 1：创建应用路径服务**

创建 `src/main/services/appPaths.ts`：

```ts
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
```

- [ ] **步骤 2：创建 JSON 元数据存储**

创建 `src/main/services/storageService.ts`：

```ts
import { mkdir, readFile, rename, writeFile } from 'fs/promises'
import { dirname } from 'path'
import type { AppSettings, Asset, Generation, ProviderConfig, Variant } from '../../shared/types'
import type { AppPaths } from './appPaths'

export interface MetadataState {
  providers: ProviderConfig[]
  settings: AppSettings
  assets: Asset[]
  generations: Generation[]
  variants: Variant[]
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
    await this.init()
    try {
      const raw = await readFile(this.paths.metadataPath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<MetadataState>
      return {
        providers: parsed.providers ?? [],
        settings: { ...defaultSettings, ...parsed.settings },
        assets: parsed.assets ?? [],
        generations: parsed.generations ?? [],
        variants: parsed.variants ?? []
      }
    } catch {
      return {
        providers: [],
        settings: defaultSettings,
        assets: [],
        generations: [],
        variants: []
      }
    }
  }

  async write(nextState: MetadataState): Promise<void> {
    await mkdir(dirname(this.paths.metadataPath), { recursive: true })
    const tempPath = `${this.paths.metadataPath}.tmp`
    await writeFile(tempPath, `${JSON.stringify(nextState, null, 2)}\n`, 'utf8')
    await rename(tempPath, this.paths.metadataPath)
  }

  async update(mutator: (state: MetadataState) => MetadataState | Promise<MetadataState>): Promise<MetadataState> {
    const current = await this.read()
    const next = await mutator(current)
    await this.write(next)
    return next
  }

  private async writeIfMissing(): Promise<void> {
    try {
      await readFile(this.paths.metadataPath, 'utf8')
    } catch {
      await this.write({
        providers: [],
        settings: defaultSettings,
        assets: [],
        generations: [],
        variants: []
      })
    }
  }
}
```

- [ ] **步骤 3：创建凭据服务**

创建 `src/main/services/credentialService.ts`：

```ts
import keytar from 'keytar'

const SERVICE_NAME = 'BloomCanvas'

export class CredentialService {
  async saveApiKey(providerId: string, apiKey: string): Promise<void> {
    await keytar.setPassword(SERVICE_NAME, this.accountName(providerId), apiKey)
  }

  async getApiKey(providerId: string): Promise<string | null> {
    return keytar.getPassword(SERVICE_NAME, this.accountName(providerId))
  }

  async deleteApiKey(providerId: string): Promise<void> {
    await keytar.deletePassword(SERVICE_NAME, this.accountName(providerId))
  }

  private accountName(providerId: string): string {
    return `provider:${providerId}:api-key`
  }
}
```

- [ ] **步骤 4：添加存储测试**

创建 `src/main/services/storageService.test.ts`：

```ts
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { afterEach, describe, expect, it } from 'vitest'
import { StorageService, defaultSettings } from './storageService'
import type { AppPaths } from './appPaths'

let tempRoot: string | null = null

function createPaths(root: string): AppPaths {
  return {
    dataDir: root,
    metadataPath: join(root, 'bloom-canvas.json'),
    referencesDir: join(root, 'assets', 'references'),
    outputsDir: join(root, 'assets', 'outputs'),
    thumbnailsDir: join(root, 'thumbnails'),
    tempDir: join(root, 'temp')
  }
}

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true })
    tempRoot = null
  }
})

describe('StorageService', () => {
  it('creates default metadata state', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'bloom-canvas-storage-'))
    const storage = new StorageService(createPaths(tempRoot))

    const state = await storage.read()

    expect(state.settings).toEqual(defaultSettings)
    expect(state.providers).toEqual([])
    expect(state.assets).toEqual([])
    expect(state.generations).toEqual([])
    expect(state.variants).toEqual([])
  })

  it('persists updates atomically', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'bloom-canvas-storage-'))
    const storage = new StorageService(createPaths(tempRoot))

    await storage.update((state) => ({
      ...state,
      settings: { ...state.settings, defaultCount: 2 }
    }))

    await expect(storage.read()).resolves.toMatchObject({
      settings: { defaultCount: 2 }
    })
  })
})
```

- [ ] **步骤 5：运行测试**

运行：

```bash
pnpm test:run src/main/services/storageService.test.ts
```

预期：PASS，两个测试通过。

- [ ] **步骤 6：Commit**

```bash
git add src/main/services/appPaths.ts src/main/services/storageService.ts src/main/services/credentialService.ts src/main/services/storageService.test.ts
git commit -m "feat: add local storage and credential services"
```

---

## 任务 4：实现 Provider 配置服务

**文件：**
- 创建：`src/main/services/providerConfigService.ts`
- 创建：`src/main/services/providerConfigService.test.ts`

- [ ] **步骤 1：创建 Provider 配置服务**

创建 `src/main/services/providerConfigService.ts`：

```ts
import { nanoid } from 'nanoid'
import type { ProviderConfig, SaveProviderInput } from '../../shared/types'
import type { CredentialService } from './credentialService'
import type { StorageService } from './storageService'

export class ProviderConfigService {
  constructor(
    private readonly storage: StorageService,
    private readonly credentials: CredentialService
  ) {}

  async list(): Promise<ProviderConfig[]> {
    const state = await this.storage.read()
    return state.providers
  }

  async getActive(): Promise<ProviderConfig | null> {
    const state = await this.storage.read()
    const activeId = state.settings.defaultProviderId
    return state.providers.find((provider) => provider.id === activeId) ?? state.providers[0] ?? null
  }

  async save(input: SaveProviderInput): Promise<ProviderConfig> {
    const now = new Date().toISOString()
    const providerId = input.id ?? nanoid()

    if (input.apiKey) {
      await this.credentials.saveApiKey(providerId, input.apiKey)
    }

    let savedProvider: ProviderConfig | null = null

    await this.storage.update((state) => {
      const existing = state.providers.find((provider) => provider.id === providerId)
      const nextProvider: ProviderConfig = {
        id: providerId,
        name: input.name,
        baseUrl: input.baseUrl.replace(/\/+$/, ''),
        imageModel: input.imageModel,
        promptModel: input.promptModel,
        hasApiKey: input.apiKey ? true : (existing?.hasApiKey ?? false),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now
      }

      savedProvider = nextProvider

      const providers = existing
        ? state.providers.map((provider) => (provider.id === providerId ? nextProvider : provider))
        : [...state.providers, nextProvider]

      return {
        ...state,
        providers,
        settings: {
          ...state.settings,
          defaultProviderId: state.settings.defaultProviderId ?? providerId
        }
      }
    })

    return savedProvider!
  }

  async getApiKey(providerId: string): Promise<string | null> {
    return this.credentials.getApiKey(providerId)
  }
}
```

- [ ] **步骤 2：添加 Provider 配置测试**

创建 `src/main/services/providerConfigService.test.ts`：

```ts
import { mkdtemp, readFile, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StorageService } from './storageService'
import { ProviderConfigService } from './providerConfigService'
import type { AppPaths } from './appPaths'
import type { CredentialService } from './credentialService'

let tempRoot: string | null = null

function createPaths(root: string): AppPaths {
  return {
    dataDir: root,
    metadataPath: join(root, 'bloom-canvas.json'),
    referencesDir: join(root, 'assets', 'references'),
    outputsDir: join(root, 'assets', 'outputs'),
    thumbnailsDir: join(root, 'thumbnails'),
    tempDir: join(root, 'temp')
  }
}

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true })
    tempRoot = null
  }
})

describe('ProviderConfigService', () => {
  it('saves provider metadata without writing api key to disk', async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'bloom-canvas-provider-'))
    const storage = new StorageService(createPaths(tempRoot))
    const credentials = {
      saveApiKey: vi.fn().mockResolvedValue(undefined),
      getApiKey: vi.fn().mockResolvedValue('secret')
    } as unknown as CredentialService
    const service = new ProviderConfigService(storage, credentials)

    const provider = await service.save({
      name: 'Local Relay',
      baseUrl: 'https://example.test/v1/',
      imageModel: 'gpt-image-2',
      promptModel: 'gpt-5.5',
      apiKey: 'sk-local-secret'
    })

    const metadata = await readFile(join(tempRoot, 'bloom-canvas.json'), 'utf8')
    expect(provider.baseUrl).toBe('https://example.test/v1')
    expect(provider.hasApiKey).toBe(true)
    expect(credentials.saveApiKey).toHaveBeenCalledWith(provider.id, 'sk-local-secret')
    expect(metadata).not.toContain('sk-local-secret')
  })
})
```

- [ ] **步骤 3：运行测试**

运行：

```bash
pnpm test:run src/main/services/providerConfigService.test.ts
```

预期：PASS。

- [ ] **步骤 4：Commit**

```bash
git add src/main/services/providerConfigService.ts src/main/services/providerConfigService.test.ts
git commit -m "feat: add provider configuration service"
```

---

## 任务 5：实现资产导入、缩略图和导出

**文件：**
- 创建：`src/main/services/assetService.ts`

- [ ] **步骤 1：创建 AssetService**

创建 `src/main/services/assetService.ts`：

```ts
import { copyFile, mkdir, stat } from 'fs/promises'
import { createHash } from 'crypto'
import { createReadStream } from 'fs'
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

  async saveOutputFromBuffer(
    buffer: Buffer,
    extension: '.png' | '.jpg' | '.jpeg' | '.webp',
    sourceGenerationId: GenerationId
  ): Promise<Asset> {
    await mkdir(this.paths.outputsDir, { recursive: true })
    const tempPath = join(this.paths.outputsDir, `${nanoid()}${extension}`)
    await sharp(buffer).toFile(tempPath)
    return this.saveAssetFromFile('output', tempPath, sourceGenerationId)
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
    const mimeType = MIME_BY_EXT[extension]
    if (!mimeType) {
      throw new Error('Unsupported image format')
    }

    const id = nanoid()
    const targetDir = type === 'reference' ? this.paths.referencesDir : this.paths.outputsDir
    await mkdir(targetDir, { recursive: true })
    await mkdir(this.paths.thumbnailsDir, { recursive: true })

    const filePath = join(targetDir, `${id}${extension}`)
    if (filePath !== sourcePath) {
      await copyFile(sourcePath, filePath)
    }

    const metadata = await sharp(filePath).metadata()
    const thumbnailPath = join(this.paths.thumbnailsDir, `${id}.webp`)
    await sharp(filePath).resize({ width: 360, height: 360, fit: 'inside' }).webp({ quality: 82 }).toFile(thumbnailPath)

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
```

- [ ] **步骤 2：运行类型检查**

运行：

```bash
pnpm typecheck:node
```

预期：PASS。

- [ ] **步骤 3：Commit**

```bash
git add src/main/services/assetService.ts
git commit -m "feat: add asset import and export service"
```

---

## 任务 6：实现 OpenAI-compatible 图像 Provider

**文件：**
- 创建：`src/main/services/openAICompatibleProvider.ts`
- 创建：`src/main/services/openAICompatibleProvider.test.ts`

- [ ] **步骤 1：创建 Provider 调用服务**

创建 `src/main/services/openAICompatibleProvider.ts`：

```ts
import { readFile } from 'fs/promises'
import type { Asset, GenerationParameters, ProviderConfig } from '../../shared/types'

export interface GenerateImageRequest {
  provider: ProviderConfig
  apiKey: string
  prompt: string
  references: Asset[]
  parameters: GenerationParameters
}

export interface GeneratedImage {
  buffer: Buffer
  revisedPrompt?: string
}

export class OpenAICompatibleProvider {
  async generateImages(request: GenerateImageRequest): Promise<GeneratedImage[]> {
    const endpoint = request.references.length > 0 ? 'images/edits' : 'images/generations'
    const url = `${request.provider.baseUrl.replace(/\/+$/, '')}/${endpoint}`

    const response = request.references.length > 0
      ? await this.postImageEdit(url, request)
      : await this.postTextToImage(url, request)

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Provider request failed: ${response.status} ${text}`)
    }

    const payload = (await response.json()) as {
      data?: Array<{ b64_json?: string; revised_prompt?: string }>
    }

    const items = payload.data ?? []
    if (items.length === 0) {
      throw new Error('Provider returned no images')
    }

    return items.map((item) => {
      if (!item.b64_json) {
        throw new Error('Provider response missing b64_json image data')
      }

      return {
        buffer: Buffer.from(item.b64_json, 'base64'),
        revisedPrompt: item.revised_prompt
      }
    })
  }

  private async postTextToImage(url: string, request: GenerateImageRequest): Promise<Response> {
    return fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${request.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: request.provider.imageModel,
        prompt: request.prompt,
        size: request.parameters.size,
        n: request.parameters.count,
        quality: request.parameters.quality,
        response_format: 'b64_json',
        output_format: request.parameters.outputFormat
      })
    })
  }

  private async postImageEdit(url: string, request: GenerateImageRequest): Promise<Response> {
    const form = new FormData()
    form.set('model', request.provider.imageModel)
    form.set('prompt', request.prompt)
    form.set('size', request.parameters.size)
    form.set('n', String(request.parameters.count))
    form.set('quality', request.parameters.quality)
    form.set('response_format', 'b64_json')

    for (const reference of request.references) {
      const bytes = await readFile(reference.filePath)
      form.append('image[]', new Blob([bytes], { type: reference.mimeType }), reference.filePath.split('/').at(-1) ?? 'reference.png')
    }

    return fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${request.apiKey}`
      },
      body: form
    })
  }
}
```

- [ ] **步骤 2：添加 Provider 请求测试**

创建 `src/main/services/openAICompatibleProvider.test.ts`：

```ts
import { describe, expect, it, vi } from 'vitest'
import { OpenAICompatibleProvider } from './openAICompatibleProvider'
import type { GenerateImageRequest } from './openAICompatibleProvider'

function createRequest(): GenerateImageRequest {
  return {
    provider: {
      id: 'provider-1',
      name: 'OpenAI Compatible',
      baseUrl: 'https://api.example.test/v1',
      imageModel: 'gpt-image-2',
      promptModel: 'gpt-5.5',
      hasApiKey: true,
      createdAt: '2026-07-08T00:00:00.000Z',
      updatedAt: '2026-07-08T00:00:00.000Z'
    },
    apiKey: 'sk-test',
    prompt: '一朵发光的花',
    references: [],
    parameters: {
      size: '1024x1024',
      count: 1,
      quality: 'standard',
      outputFormat: 'png'
    }
  }
}

describe('OpenAICompatibleProvider', () => {
  it('calls images/generations for text-to-image', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ b64_json: Buffer.from('image-bytes').toString('base64') }]
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const provider = new OpenAICompatibleProvider()
    const result = await provider.generateImages(createRequest())

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/v1/images/generations',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer sk-test' })
      })
    )
    expect(result[0].buffer.toString()).toBe('image-bytes')
  })
})
```

- [ ] **步骤 3：运行测试**

运行：

```bash
pnpm test:run src/main/services/openAICompatibleProvider.test.ts
```

预期：PASS。

- [ ] **步骤 4：Commit**

```bash
git add src/main/services/openAICompatibleProvider.ts src/main/services/openAICompatibleProvider.test.ts
git commit -m "feat: add OpenAI-compatible image provider"
```

---

## 任务 7：实现提示词优化服务

**文件：**
- 创建：`src/main/services/promptOptimizeService.ts`

- [ ] **步骤 1：创建提示词优化服务**

创建 `src/main/services/promptOptimizeService.ts`：

```ts
import type { ProviderConfig } from '../../shared/types'

export class PromptOptimizeService {
  async optimize(provider: ProviderConfig, apiKey: string, prompt: string): Promise<string> {
    if (!provider.promptModel.trim()) {
      return prompt
    }

    const response = await fetch(`${provider.baseUrl.replace(/\/+$/, '')}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.promptModel,
        input: [
          {
            role: 'system',
            content:
              '你是图像生成提示词编辑器。保留用户意图，补充清晰的视觉描述、主体、场景、光线、构图和质感。只输出优化后的提示词。'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Prompt optimization failed: ${response.status} ${text}`)
    }

    const payload = (await response.json()) as { output_text?: string }
    return payload.output_text?.trim() || prompt
  }
}
```

- [ ] **步骤 2：运行类型检查**

运行：

```bash
pnpm typecheck:node
```

预期：PASS。

- [ ] **步骤 3：Commit**

```bash
git add src/main/services/promptOptimizeService.ts
git commit -m "feat: add prompt optimization service"
```

---

## 任务 8：实现生成编排服务

**文件：**
- 创建：`src/main/services/generationService.ts`
- 创建：`src/main/services/generationService.test.ts`

- [ ] **步骤 1：创建生成编排服务**

创建 `src/main/services/generationService.ts`：

```ts
import { nanoid } from 'nanoid'
import type { Asset, CreateGenerationInput, Generation, GenerationRecord, Variant } from '../../shared/types'
import type { AssetService } from './assetService'
import type { OpenAICompatibleProvider } from './openAICompatibleProvider'
import type { ProviderConfigService } from './providerConfigService'
import type { StorageService } from './storageService'

export class GenerationService {
  constructor(
    private readonly storage: StorageService,
    private readonly providers: ProviderConfigService,
    private readonly imageProvider: OpenAICompatibleProvider,
    private readonly assets: AssetService
  ) {}

  async list(): Promise<GenerationRecord[]> {
    const state = await this.storage.read()
    return state.generations
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((generation) => this.hydrateGeneration(generation, state.assets, state.variants))
  }

  async create(input: CreateGenerationInput): Promise<GenerationRecord> {
    const state = await this.storage.read()
    const provider = state.providers.find((item) => item.id === input.providerId)
    if (!provider) {
      throw new Error('Provider is not configured')
    }

    const apiKey = await this.providers.getApiKey(provider.id)
    if (!apiKey) {
      throw new Error('Provider API key is missing')
    }

    const now = new Date().toISOString()
    const generationId = nanoid()
    const promptFinal = input.useOptimizedPrompt && input.optimizedPrompt ? input.optimizedPrompt : input.prompt
    const referenceAssets = state.assets.filter((asset) => input.referenceAssetIds.includes(asset.id))

    const generation: Generation = {
      id: generationId,
      mode: referenceAssets.length > 0 ? 'image-to-image' : 'text-to-image',
      promptOriginal: input.prompt,
      promptOptimized: input.optimizedPrompt,
      promptFinal,
      referenceImageIds: input.referenceAssetIds,
      parameters: input.parameters,
      outputVariantIds: [],
      providerId: provider.id,
      status: 'running',
      favorite: false,
      createdAt: now,
      updatedAt: now
    }

    await this.storage.update((current) => ({
      ...current,
      generations: [...current.generations, generation]
    }))

    try {
      const generatedImages = await this.imageProvider.generateImages({
        provider,
        apiKey,
        prompt: promptFinal,
        references: referenceAssets,
        parameters: input.parameters
      })

      const variants: Variant[] = []
      for (let index = 0; index < generatedImages.length; index += 1) {
        const image = generatedImages[index]
        const asset = await this.assets.saveOutputFromBuffer(
          image.buffer,
          input.parameters.outputFormat === 'jpeg' ? '.jpg' : `.${input.parameters.outputFormat}`,
          generationId
        )
        variants.push({
          id: nanoid(),
          generationId,
          assetId: asset.id,
          index,
          revisedPrompt: image.revisedPrompt,
          favorite: false,
          createdAt: new Date().toISOString()
        })
      }

      const updatedState = await this.storage.update((current) => ({
        ...current,
        variants: [...current.variants, ...variants],
        generations: current.generations.map((item) =>
          item.id === generationId
            ? {
                ...item,
                status: 'succeeded',
                outputVariantIds: variants.map((variant) => variant.id),
                updatedAt: new Date().toISOString()
              }
            : item
        )
      }))

      const saved = updatedState.generations.find((item) => item.id === generationId)!
      return this.hydrateGeneration(saved, updatedState.assets, updatedState.variants)
    } catch (error) {
      const updatedState = await this.storage.update((current) => ({
        ...current,
        generations: current.generations.map((item) =>
          item.id === generationId
            ? {
                ...item,
                status: 'failed',
                errorMessage: error instanceof Error ? error.message : 'Generation failed',
                updatedAt: new Date().toISOString()
              }
            : item
        )
      }))
      const failed = updatedState.generations.find((item) => item.id === generationId)!
      return this.hydrateGeneration(failed, updatedState.assets, updatedState.variants)
    }
  }

  async favorite(generationId: string, favorite: boolean): Promise<GenerationRecord> {
    const state = await this.storage.update((current) => ({
      ...current,
      generations: current.generations.map((generation) =>
        generation.id === generationId ? { ...generation, favorite, updatedAt: new Date().toISOString() } : generation
      )
    }))
    const generation = state.generations.find((item) => item.id === generationId)
    if (!generation) {
      throw new Error('Generation not found')
    }
    return this.hydrateGeneration(generation, state.assets, state.variants)
  }

  async retry(generationId: string): Promise<GenerationRecord> {
    const state = await this.storage.read()
    const generation = state.generations.find((item) => item.id === generationId)
    if (!generation) {
      throw new Error('Generation not found')
    }

    return this.create({
      prompt: generation.promptOriginal,
      useOptimizedPrompt: Boolean(generation.promptOptimized),
      optimizedPrompt: generation.promptOptimized,
      referenceAssetIds: generation.referenceImageIds,
      parameters: generation.parameters,
      providerId: generation.providerId
    })
  }

  private hydrateGeneration(generation: Generation, assets: Asset[], variants: Variant[]): GenerationRecord {
    return {
      ...generation,
      references: assets.filter((asset) => generation.referenceImageIds.includes(asset.id)),
      variants: generation.outputVariantIds
        .map((variantId) => variants.find((variant) => variant.id === variantId))
        .filter((variant): variant is Variant => Boolean(variant))
        .map((variant) => ({
          ...variant,
          asset: assets.find((asset) => asset.id === variant.assetId)!
        }))
        .filter((variant) => Boolean(variant.asset))
    }
  }
}
```

- [ ] **步骤 2：添加生成服务测试**

创建 `src/main/services/generationService.test.ts`：

```ts
import { describe, expect, it, vi } from 'vitest'
import { GenerationService } from './generationService'
import type { StorageService } from './storageService'
import type { ProviderConfigService } from './providerConfigService'
import type { OpenAICompatibleProvider } from './openAICompatibleProvider'
import type { AssetService } from './assetService'
import type { MetadataState } from './storageService'

describe('GenerationService', () => {
  it('creates a generation with output variant', async () => {
    let state: MetadataState = {
      providers: [
        {
          id: 'provider-1',
          name: 'OpenAI',
          baseUrl: 'https://api.example.test/v1',
          imageModel: 'gpt-image-2',
          promptModel: 'gpt-5.5',
          hasApiKey: true,
          createdAt: '2026-07-08T00:00:00.000Z',
          updatedAt: '2026-07-08T00:00:00.000Z'
        }
      ],
      settings: {
        defaultProviderId: 'provider-1',
        defaultSize: '1024x1024',
        defaultQuality: 'standard',
        defaultCount: 1,
        defaultOutputFormat: 'png',
        outputDirectory: null,
        theme: 'system'
      },
      assets: [],
      generations: [],
      variants: []
    }

    const storage = {
      read: vi.fn(async () => state),
      update: vi.fn(async (mutator) => {
        state = await mutator(state)
        return state
      })
    } as unknown as StorageService
    const providers = {
      getApiKey: vi.fn(async () => 'sk-test')
    } as unknown as ProviderConfigService
    const imageProvider = {
      generateImages: vi.fn(async () => [{ buffer: Buffer.from('image') }])
    } as unknown as OpenAICompatibleProvider
    const assets = {
      saveOutputFromBuffer: vi.fn(async () => {
        const asset = {
          id: 'asset-1',
          type: 'output' as const,
          filePath: '/tmp/output.png',
          thumbnailPath: '/tmp/thumb.webp',
          mimeType: 'image/png',
          width: 1024,
          height: 1024,
          size: 5,
          sha256: 'hash',
          createdAt: '2026-07-08T00:00:00.000Z',
          sourceGenerationId: 'generation'
        }
        state = { ...state, assets: [...state.assets, asset] }
        return asset
      })
    } as unknown as AssetService

    const service = new GenerationService(storage, providers, imageProvider, assets)
    const record = await service.create({
      prompt: '一朵发光的花',
      useOptimizedPrompt: false,
      referenceAssetIds: [],
      providerId: 'provider-1',
      parameters: {
        size: '1024x1024',
        count: 1,
        quality: 'standard',
        outputFormat: 'png'
      }
    })

    expect(record.status).toBe('succeeded')
    expect(record.variants).toHaveLength(1)
    expect(imageProvider.generateImages).toHaveBeenCalledOnce()
  })
})
```

- [ ] **步骤 3：运行测试**

运行：

```bash
pnpm test:run src/main/services/generationService.test.ts
```

预期：PASS。

- [ ] **步骤 4：Commit**

```bash
git add src/main/services/generationService.ts src/main/services/generationService.test.ts
git commit -m "feat: add generation orchestration service"
```

---

## 任务 9：注册 Main IPC 并收紧 Electron 安全配置

**文件：**
- 创建：`src/main/ipc/registerIpcHandlers.ts`
- 修改：`src/main/index.ts`

- [ ] **步骤 1：创建 IPC 注册模块**

创建 `src/main/ipc/registerIpcHandlers.ts`：

```ts
import { dialog, ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc'
import {
  createGenerationSchema,
  exportAssetSchema,
  importAssetSchema,
  promptOptimizeSchema,
  saveProviderSchema
} from '../../shared/schemas'
import type { AppErrorPayload, AppResult, AppSettings } from '../../shared/types'
import { getAppPaths } from '../services/appPaths'
import { AssetService } from '../services/assetService'
import { CredentialService } from '../services/credentialService'
import { GenerationService } from '../services/generationService'
import { OpenAICompatibleProvider } from '../services/openAICompatibleProvider'
import { PromptOptimizeService } from '../services/promptOptimizeService'
import { ProviderConfigService } from '../services/providerConfigService'
import { StorageService } from '../services/storageService'

function ok<T>(data: T): AppResult<T> {
  return { ok: true, data }
}

function err(error: AppErrorPayload): AppResult<never> {
  return { ok: false, error }
}

function toErrorPayload(error: unknown): AppErrorPayload {
  const message = error instanceof Error ? error.message : 'Unknown error'
  if (message.includes('API key')) {
    return { code: 'api_key_missing', message }
  }
  if (message.includes('Provider')) {
    return { code: 'provider_missing', message }
  }
  if (message.includes('Unsupported image format')) {
    return { code: 'validation_error', message }
  }
  return { code: 'unknown_error', message }
}

export function registerIpcHandlers(): void {
  const paths = getAppPaths()
  const storage = new StorageService(paths)
  const credentials = new CredentialService()
  const providers = new ProviderConfigService(storage, credentials)
  const assets = new AssetService(paths, storage)
  const imageProvider = new OpenAICompatibleProvider()
  const generations = new GenerationService(storage, providers, imageProvider, assets)
  const promptOptimizer = new PromptOptimizeService()

  ipcMain.handle(IPC_CHANNELS.providerList, async () => ok(await providers.list()))

  ipcMain.handle(IPC_CHANNELS.providerGetActive, async () => ok(await providers.getActive()))

  ipcMain.handle(IPC_CHANNELS.providerSave, async (_event, input) => {
    try {
      return ok(await providers.save(saveProviderSchema.parse(input)))
    } catch (error) {
      return err(toErrorPayload(error))
    }
  })

  ipcMain.handle(IPC_CHANNELS.settingsGet, async () => {
    const state = await storage.read()
    return ok(state.settings)
  })

  ipcMain.handle(IPC_CHANNELS.settingsSave, async (_event, input: Partial<AppSettings>) => {
    const state = await storage.update((current) => ({
      ...current,
      settings: { ...current.settings, ...input }
    }))
    return ok(state.settings)
  })

  ipcMain.handle(IPC_CHANNELS.assetImport, async (_event, input) => {
    try {
      const parsed = importAssetSchema.parse(input)
      return ok(await assets.importReference(parsed.filePath))
    } catch (error) {
      return err(toErrorPayload(error))
    }
  })

  ipcMain.handle(IPC_CHANNELS.assetExport, async (_event, input) => {
    try {
      const parsed = exportAssetSchema.parse(input)
      const targetDirectory = parsed.targetDirectory ?? (await dialog.showOpenDialog({ properties: ['openDirectory'] })).filePaths[0]
      return ok(await assets.exportAsset(parsed.assetId, targetDirectory))
    } catch (error) {
      return err(toErrorPayload(error))
    }
  })

  ipcMain.handle(IPC_CHANNELS.generationList, async () => ok(await generations.list()))

  ipcMain.handle(IPC_CHANNELS.generationCreate, async (_event, input) => {
    try {
      return ok(await generations.create(createGenerationSchema.parse(input)))
    } catch (error) {
      return err(toErrorPayload(error))
    }
  })

  ipcMain.handle(IPC_CHANNELS.generationFavorite, async (_event, generationId: string, favorite: boolean) => {
    try {
      return ok(await generations.favorite(generationId, favorite))
    } catch (error) {
      return err(toErrorPayload(error))
    }
  })

  ipcMain.handle(IPC_CHANNELS.generationRetry, async (_event, generationId: string) => {
    try {
      return ok(await generations.retry(generationId))
    } catch (error) {
      return err(toErrorPayload(error))
    }
  })

  ipcMain.handle(IPC_CHANNELS.promptOptimize, async (_event, input) => {
    try {
      const parsed = promptOptimizeSchema.parse(input)
      const state = await storage.read()
      const provider = state.providers.find((item) => item.id === parsed.providerId)
      if (!provider) throw new Error('Provider is not configured')
      const apiKey = await providers.getApiKey(provider.id)
      if (!apiKey) throw new Error('Provider API key is missing')
      return ok(await promptOptimizer.optimize(provider, apiKey, parsed.prompt))
    } catch (error) {
      return err(toErrorPayload(error))
    }
  })
}
```

- [ ] **步骤 2：修改 Main 入口**

在 `src/main/index.ts` 中：

```ts
import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerIpcHandlers } from './ipc/registerIpcHandlers'
```

将 `webPreferences` 改为：

```ts
webPreferences: {
  preload: join(__dirname, '../preload/index.js'),
  sandbox: true,
  contextIsolation: true,
  nodeIntegration: false
}
```

删除模板 IPC：

```ts
ipcMain.on('ping', () => console.log('pong'))
```

在 `app.whenReady().then(() => {` 内、`createWindow()` 前加入：

```ts
registerIpcHandlers()
```

- [ ] **步骤 3：运行类型检查**

运行：

```bash
pnpm typecheck:node
```

预期：PASS。

- [ ] **步骤 4：Commit**

```bash
git add src/main/index.ts src/main/ipc/registerIpcHandlers.ts
git commit -m "feat: register BloomCanvas IPC handlers"
```

---

## 任务 10：实现 Preload typed API

**文件：**
- 修改：`src/preload/index.ts`
- 修改：`src/preload/index.d.ts`

- [ ] **步骤 1：修改 preload 暴露对象**

将 `src/preload/index.ts` 改为：

```ts
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_CHANNELS, type BloomCanvasApi } from '../shared/ipc'

const bloomCanvasApi: BloomCanvasApi = {
  providers: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.providerList),
    save: (input) => ipcRenderer.invoke(IPC_CHANNELS.providerSave, input),
    getActive: () => ipcRenderer.invoke(IPC_CHANNELS.providerGetActive)
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.settingsGet),
    save: (input) => ipcRenderer.invoke(IPC_CHANNELS.settingsSave, input)
  },
  assets: {
    import: (input) => ipcRenderer.invoke(IPC_CHANNELS.assetImport, input),
    export: (input) => ipcRenderer.invoke(IPC_CHANNELS.assetExport, input)
  },
  generations: {
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.generationCreate, input),
    list: () => ipcRenderer.invoke(IPC_CHANNELS.generationList),
    favorite: (generationId, favorite) => ipcRenderer.invoke(IPC_CHANNELS.generationFavorite, generationId, favorite),
    retry: (generationId) => ipcRenderer.invoke(IPC_CHANNELS.generationRetry, generationId)
  },
  prompt: {
    optimize: (input) => ipcRenderer.invoke(IPC_CHANNELS.promptOptimize, input)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('bloomCanvas', bloomCanvasApi)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.bloomCanvas = bloomCanvasApi
}
```

- [ ] **步骤 2：修改 preload 类型声明**

将 `src/preload/index.d.ts` 改为：

```ts
import type { ElectronAPI } from '@electron-toolkit/preload'
import type { BloomCanvasApi } from '../shared/ipc'

declare global {
  interface Window {
    electron: ElectronAPI
    bloomCanvas: BloomCanvasApi
  }
}
```

- [ ] **步骤 3：运行类型检查**

运行：

```bash
pnpm typecheck
```

预期：PASS。

- [ ] **步骤 4：Commit**

```bash
git add src/preload/index.ts src/preload/index.d.ts
git commit -m "feat: expose BloomCanvas preload API"
```

---

## 任务 11：创建 Renderer 客户端和工作台状态

**文件：**
- 创建：`src/renderer/src/api/bloomCanvasClient.ts`
- 创建：`src/renderer/src/state/workbenchStore.ts`

- [ ] **步骤 1：创建 IPC 客户端封装**

创建 `src/renderer/src/api/bloomCanvasClient.ts`：

```ts
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
  if (result.ok) {
    return result.data
  }
  throw new BloomCanvasClientError(result.error.message, result.error.code, result.error.detail)
}

export const bloomCanvasClient = {
  providers: {
    list: () => unwrapResult(window.bloomCanvas.providers.list()),
    save: window.bloomCanvas.providers.save,
    getActive: () => unwrapResult(window.bloomCanvas.providers.getActive())
  },
  settings: {
    get: () => unwrapResult(window.bloomCanvas.settings.get()),
    save: (input: Parameters<typeof window.bloomCanvas.settings.save>[0]) =>
      unwrapResult(window.bloomCanvas.settings.save(input))
  },
  assets: {
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
    retry: (generationId: string) => unwrapResult(window.bloomCanvas.generations.retry(generationId))
  },
  prompt: {
    optimize: (input: Parameters<typeof window.bloomCanvas.prompt.optimize>[0]) =>
      unwrapResult(window.bloomCanvas.prompt.optimize(input))
  }
}
```

- [ ] **步骤 2：创建工作台状态 Hook**

创建 `src/renderer/src/state/workbenchStore.ts`：

```ts
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppSettings, GenerationRecord, ProviderConfig } from '../../../shared/types'
import { bloomCanvasClient } from '../api/bloomCanvasClient'

export interface WorkbenchState {
  providers: ProviderConfig[]
  activeProvider: ProviderConfig | null
  settings: AppSettings | null
  generations: GenerationRecord[]
  selectedGeneration: GenerationRecord | null
  loading: boolean
  generating: boolean
  error: string | null
  refresh: () => Promise<void>
  selectGeneration: (generation: GenerationRecord | null) => void
  setGenerating: (generating: boolean) => void
  setError: (error: string | null) => void
}

export function useWorkbenchStore(): WorkbenchState {
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [activeProvider, setActiveProvider] = useState<ProviderConfig | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [generations, setGenerations] = useState<GenerationRecord[]>([])
  const [selectedGeneration, setSelectedGeneration] = useState<GenerationRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [nextProviders, nextActiveProvider, nextSettings, nextGenerations] = await Promise.all([
        bloomCanvasClient.providers.list(),
        bloomCanvasClient.providers.getActive(),
        bloomCanvasClient.settings.get(),
        bloomCanvasClient.generations.list()
      ])
      setProviders(nextProviders)
      setActiveProvider(nextActiveProvider)
      setSettings(nextSettings)
      setGenerations(nextGenerations)
      setSelectedGeneration((current) => {
        if (!current) return nextGenerations[0] ?? null
        return nextGenerations.find((item) => item.id === current.id) ?? nextGenerations[0] ?? null
      })
      setError(null)
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : '加载工作台失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return useMemo(
    () => ({
      providers,
      activeProvider,
      settings,
      generations,
      selectedGeneration,
      loading,
      generating,
      error,
      refresh,
      selectGeneration: setSelectedGeneration,
      setGenerating,
      setError
    }),
    [providers, activeProvider, settings, generations, selectedGeneration, loading, generating, error, refresh]
  )
}
```

- [ ] **步骤 3：运行类型检查**

运行：

```bash
pnpm typecheck:web
```

预期：PASS。

- [ ] **步骤 4：Commit**

```bash
git add src/renderer/src/api/bloomCanvasClient.ts src/renderer/src/state/workbenchStore.ts
git commit -m "feat: add renderer client and workbench state"
```

---

## 任务 12：实现 AppShell、历史和结果区

**文件：**
- 修改：`src/renderer/src/main.tsx`
- 修改：`src/renderer/src/App.tsx`
- 创建：`src/renderer/src/components/AppShell.tsx`
- 创建：`src/renderer/src/components/HistoryPanel.tsx`
- 创建：`src/renderer/src/components/GalleryPanel.tsx`
- 创建：`src/renderer/src/components/ImagePreviewModal.tsx`
- 创建：`src/renderer/src/components/ErrorNotice.tsx`
- 创建：`src/renderer/src/theme.ts`

- [ ] **步骤 1：引入 antd 样式和主题**

在 `src/renderer/src/main.tsx` 顶部加入：

```ts
import 'antd/dist/reset.css'
```

创建 `src/renderer/src/theme.ts`：

```ts
import type { ThemeConfig } from 'antd'

export const bloomTheme: ThemeConfig = {
  token: {
    colorPrimary: '#2f7d68',
    borderRadius: 6,
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
  },
  components: {
    Layout: {
      bodyBg: '#f6f7f8',
      headerBg: '#ffffff',
      siderBg: '#ffffff'
    },
    Card: {
      borderRadiusLG: 8
    },
    Button: {
      borderRadius: 6
    }
  }
}
```

- [ ] **步骤 2：创建错误提示组件**

创建 `src/renderer/src/components/ErrorNotice.tsx`：

```tsx
import { Alert } from 'antd'

interface ErrorNoticeProps {
  error: string | null
  onClose: () => void
}

export function ErrorNotice({ error, onClose }: ErrorNoticeProps): React.JSX.Element | null {
  if (!error) return null

  return <Alert closable message={error} showIcon type="error" onClose={onClose} />
}
```

- [ ] **步骤 3：创建历史面板**

创建 `src/renderer/src/components/HistoryPanel.tsx`：

```tsx
import { ClockCircleOutlined, StarFilled, StarOutlined } from '@ant-design/icons'
import { Button, Empty, Input, List, Segmented, Space, Typography } from 'antd'
import { useMemo, useState } from 'react'
import type { GenerationRecord } from '../../../shared/types'

interface HistoryPanelProps {
  generations: GenerationRecord[]
  selectedId?: string
  onSelect: (generation: GenerationRecord) => void
}

export function HistoryPanel({ generations, selectedId, onSelect }: HistoryPanelProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'favorite'>('all')

  const filteredGenerations = useMemo(() => {
    return generations.filter((generation) => {
      const matchesQuery = generation.promptFinal.toLowerCase().includes(query.trim().toLowerCase())
      const matchesFilter = filter === 'all' || generation.favorite
      return matchesQuery && matchesFilter
    })
  }, [filter, generations, query])

  return (
    <aside className="history-panel">
      <div className="panel-header">
        <Typography.Text strong>历史</Typography.Text>
        <ClockCircleOutlined />
      </div>
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Input.Search allowClear placeholder="搜索提示词" value={query} onChange={(event) => setQuery(event.target.value)} />
        <Segmented
          block
          options={[
            { label: '全部', value: 'all' },
            { label: '收藏', value: 'favorite' }
          ]}
          value={filter}
          onChange={(value) => setFilter(value as 'all' | 'favorite')}
        />
      </Space>
      {filteredGenerations.length === 0 ? (
        <Empty description="还没有生成记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          className="history-list"
          dataSource={filteredGenerations}
          renderItem={(generation) => (
            <List.Item
              className={generation.id === selectedId ? 'history-item history-item-active' : 'history-item'}
              onClick={() => onSelect(generation)}
            >
              <div className="history-thumb">
                {generation.variants[0]?.asset.thumbnailPath ? (
                  <img alt="" src={`file://${generation.variants[0].asset.thumbnailPath}`} />
                ) : (
                  <span />
                )}
              </div>
              <div className="history-content">
                <Typography.Text ellipsis>{generation.promptFinal}</Typography.Text>
                <Typography.Text type="secondary">{new Date(generation.createdAt).toLocaleString()}</Typography.Text>
              </div>
              <Button
                icon={generation.favorite ? <StarFilled /> : <StarOutlined />}
                size="small"
                type="text"
                aria-label={generation.favorite ? '已收藏' : '未收藏'}
              />
            </List.Item>
          )}
        />
      )}
    </aside>
  )
}
```

- [ ] **步骤 4：创建结果区和预览弹窗**

创建 `src/renderer/src/components/ImagePreviewModal.tsx`：

```tsx
import { DownloadOutlined, StarOutlined } from '@ant-design/icons'
import { Button, Modal, Space, Typography } from 'antd'
import type { GenerationRecord } from '../../../shared/types'

interface ImagePreviewModalProps {
  generation: GenerationRecord | null
  variantIndex: number | null
  open: boolean
  onClose: () => void
  onExport: (assetId: string) => void
}

export function ImagePreviewModal({
  generation,
  variantIndex,
  open,
  onClose,
  onExport
}: ImagePreviewModalProps): React.JSX.Element {
  const variant = generation && variantIndex !== null ? generation.variants[variantIndex] : null

  return (
    <Modal centered footer={null} open={open} title="预览" width="80vw" onCancel={onClose}>
      {variant ? (
        <div className="preview-modal-body">
          <img alt={generation?.promptFinal ?? ''} src={`file://${variant.asset.filePath}`} />
          <Space direction="vertical" size={12}>
            <Typography.Paragraph copyable>{generation?.promptFinal}</Typography.Paragraph>
            <Space>
              <Button icon={<DownloadOutlined />} onClick={() => onExport(variant.assetId)}>
                导出
              </Button>
              <Button icon={<StarOutlined />}>收藏</Button>
            </Space>
          </Space>
        </div>
      ) : null}
    </Modal>
  )
}
```

创建 `src/renderer/src/components/GalleryPanel.tsx`：

```tsx
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button, Empty, Image, Skeleton, Space, Typography } from 'antd'
import { useState } from 'react'
import type { GenerationRecord } from '../../../shared/types'
import { ImagePreviewModal } from './ImagePreviewModal'

interface GalleryPanelProps {
  generation: GenerationRecord | null
  generating: boolean
  onExport: (assetId: string) => void
  onRetry: (generationId: string) => void
}

export function GalleryPanel({ generation, generating, onExport, onRetry }: GalleryPanelProps): React.JSX.Element {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  if (generating) {
    return (
      <main className="gallery-panel">
        <Skeleton active paragraph={{ rows: 8 }} />
      </main>
    )
  }

  if (!generation) {
    return (
      <main className="gallery-panel gallery-empty">
        <Empty description="写下提示词，开始生成第一张图" />
      </main>
    )
  }

  return (
    <main className="gallery-panel">
      <div className="gallery-header">
        <div>
          <Typography.Title level={4}>生成结果</Typography.Title>
          <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }}>
            {generation.promptFinal}
          </Typography.Paragraph>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => onRetry(generation.id)}>
          重新生成
        </Button>
      </div>
      <div className="image-grid">
        {generation.variants.map((variant, index) => (
          <div className="image-tile" key={variant.id}>
            <Image
              alt={generation.promptFinal}
              preview={false}
              src={`file://${variant.asset.filePath}`}
              onClick={() => setPreviewIndex(index)}
            />
            <Button
              className="tile-action"
              icon={<DownloadOutlined />}
              shape="circle"
              onClick={() => onExport(variant.assetId)}
              aria-label="导出图片"
            />
          </div>
        ))}
      </div>
      <ImagePreviewModal
        generation={generation}
        open={previewIndex !== null}
        variantIndex={previewIndex}
        onClose={() => setPreviewIndex(null)}
        onExport={onExport}
      />
    </main>
  )
}
```

- [ ] **步骤 5：创建 AppShell**

创建 `src/renderer/src/components/AppShell.tsx`：

```tsx
import { SettingOutlined } from '@ant-design/icons'
import { Button, ConfigProvider, Layout, Space, Tag, Typography } from 'antd'
import { useState } from 'react'
import { bloomTheme } from '../theme'
import { useWorkbenchStore } from '../state/workbenchStore'
import { bloomCanvasClient } from '../api/bloomCanvasClient'
import { ErrorNotice } from './ErrorNotice'
import { GalleryPanel } from './GalleryPanel'
import { HistoryPanel } from './HistoryPanel'
import { CreationPanel } from './CreationPanel'
import { ProviderSettingsModal } from './ProviderSettingsModal'

export function AppShell(): React.JSX.Element {
  const workbench = useWorkbenchStore()
  const [settingsOpen, setSettingsOpen] = useState(false)

  async function handleExport(assetId: string): Promise<void> {
    try {
      await bloomCanvasClient.assets.export({ assetId })
    } catch (error) {
      workbench.setError(error instanceof Error ? error.message : '导出失败')
    }
  }

  async function handleRetry(generationId: string): Promise<void> {
    workbench.setGenerating(true)
    try {
      const record = await bloomCanvasClient.generations.retry(generationId)
      await workbench.refresh()
      workbench.selectGeneration(record)
    } catch (error) {
      workbench.setError(error instanceof Error ? error.message : '重新生成失败')
    } finally {
      workbench.setGenerating(false)
    }
  }

  return (
    <ConfigProvider theme={bloomTheme}>
      <Layout className="app-shell">
        <header className="top-bar">
          <Space>
            <Typography.Title level={4}>生花 BloomCanvas</Typography.Title>
            <Tag color={workbench.activeProvider?.hasApiKey ? 'green' : 'orange'}>
              {workbench.activeProvider?.hasApiKey ? 'Provider 已配置' : '未配置 Provider'}
            </Tag>
          </Space>
          <Button icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)}>
            设置
          </Button>
        </header>
        <ErrorNotice error={workbench.error} onClose={() => workbench.setError(null)} />
        <Layout className="workspace-layout">
          <HistoryPanel
            generations={workbench.generations}
            selectedId={workbench.selectedGeneration?.id}
            onSelect={workbench.selectGeneration}
          />
          <GalleryPanel
            generation={workbench.selectedGeneration}
            generating={workbench.generating}
            onExport={handleExport}
            onRetry={handleRetry}
          />
          <CreationPanel
            activeProvider={workbench.activeProvider}
            settings={workbench.settings}
            onNeedProvider={() => setSettingsOpen(true)}
            onCreated={async (record) => {
              await workbench.refresh()
              workbench.selectGeneration(record)
            }}
            onError={workbench.setError}
            onGeneratingChange={workbench.setGenerating}
          />
        </Layout>
        <ProviderSettingsModal
          open={settingsOpen}
          provider={workbench.activeProvider}
          onClose={() => setSettingsOpen(false)}
          onSaved={async () => {
            setSettingsOpen(false)
            await workbench.refresh()
          }}
        />
      </Layout>
    </ConfigProvider>
  )
}
```

- [ ] **步骤 6：替换 App**

将 `src/renderer/src/App.tsx` 改为：

```tsx
import { AppShell } from './components/AppShell'

function App(): React.JSX.Element {
  return <AppShell />
}

export default App
```

- [ ] **步骤 7：运行类型检查**

运行：

```bash
pnpm typecheck:web
```

预期：此时会因为 `CreationPanel` 和 `ProviderSettingsModal` 尚未创建而失败，错误包含：

```text
Cannot find module './CreationPanel'
Cannot find module './ProviderSettingsModal'
```

这个失败用于确认 AppShell 对下一任务的接口约束。

- [ ] **步骤 8：Commit**

```bash
git add src/renderer/src/main.tsx src/renderer/src/App.tsx src/renderer/src/components/AppShell.tsx src/renderer/src/components/HistoryPanel.tsx src/renderer/src/components/GalleryPanel.tsx src/renderer/src/components/ImagePreviewModal.tsx src/renderer/src/components/ErrorNotice.tsx src/renderer/src/theme.ts
git commit -m "feat: add BloomCanvas workspace shell"
```

---

## 任务 13：实现创作面板和 Provider 设置

**文件：**
- 创建：`src/renderer/src/components/CreationPanel.tsx`
- 创建：`src/renderer/src/components/ProviderSettingsModal.tsx`
- 创建：`src/renderer/src/components/CreationPanel.test.tsx`

- [ ] **步骤 1：创建 Provider 设置弹窗**

创建 `src/renderer/src/components/ProviderSettingsModal.tsx`：

```tsx
import { Button, Form, Input, Modal, Space } from 'antd'
import { useEffect } from 'react'
import type { ProviderConfig, SaveProviderInput } from '../../../shared/types'
import { bloomCanvasClient, unwrapResult } from '../api/bloomCanvasClient'

interface ProviderSettingsModalProps {
  open: boolean
  provider: ProviderConfig | null
  onClose: () => void
  onSaved: () => void
}

export function ProviderSettingsModal({
  open,
  provider,
  onClose,
  onSaved
}: ProviderSettingsModalProps): React.JSX.Element {
  const [form] = Form.useForm<SaveProviderInput>()

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        id: provider?.id,
        name: provider?.name ?? 'OpenAI',
        baseUrl: provider?.baseUrl ?? 'https://api.openai.com/v1',
        imageModel: provider?.imageModel ?? 'gpt-image-2',
        promptModel: provider?.promptModel ?? ''
      })
    }
  }, [form, open, provider])

  async function handleSubmit(): Promise<void> {
    const values = await form.validateFields()
    await unwrapResult(window.bloomCanvas.providers.save(values))
    onSaved()
  }

  return (
    <Modal footer={null} open={open} title="Provider 设置" onCancel={onClose}>
      <Form form={form} layout="vertical">
        <Form.Item name="id" hidden>
          <Input />
        </Form.Item>
        <Form.Item label="名称" name="name" rules={[{ required: true, message: '请输入 Provider 名称' }]}>
          <Input placeholder="OpenAI" />
        </Form.Item>
        <Form.Item label="Base URL" name="baseUrl" rules={[{ required: true, type: 'url', message: '请输入有效 URL' }]}>
          <Input placeholder="https://api.openai.com/v1" />
        </Form.Item>
        <Form.Item label="API Key" name="apiKey" extra={provider?.hasApiKey ? '留空则保留已保存的 API Key' : undefined}>
          <Input.Password placeholder="sk-..." />
        </Form.Item>
        <Form.Item label="图像模型" name="imageModel" rules={[{ required: true, message: '请输入图像模型' }]}>
          <Input placeholder="gpt-image-2" />
        </Form.Item>
        <Form.Item label="提示词优化模型" name="promptModel">
          <Input placeholder="gpt-5.5" />
        </Form.Item>
        <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleSubmit}>
            保存
          </Button>
        </Space>
      </Form>
    </Modal>
  )
}
```

- [ ] **步骤 2：创建创作面板**

创建 `src/renderer/src/components/CreationPanel.tsx`：

```tsx
import { DeleteOutlined, FileImageOutlined, SparklesOutlined } from '@ant-design/icons'
import { Button, Form, Input, InputNumber, Select, Space, Upload, Typography } from 'antd'
import type { UploadFile } from 'antd'
import { useState } from 'react'
import type { AppSettings, GenerationParameters, GenerationRecord, ProviderConfig } from '../../../shared/types'
import { bloomCanvasClient } from '../api/bloomCanvasClient'

interface CreationPanelProps {
  activeProvider: ProviderConfig | null
  settings: AppSettings | null
  onNeedProvider: () => void
  onCreated: (record: GenerationRecord) => Promise<void>
  onError: (error: string | null) => void
  onGeneratingChange: (generating: boolean) => void
}

interface CreationFormValues {
  prompt: string
  optimizedPrompt?: string
  size: GenerationParameters['size']
  count: number
  quality: GenerationParameters['quality']
  outputFormat: GenerationParameters['outputFormat']
}

export function CreationPanel({
  activeProvider,
  settings,
  onNeedProvider,
  onCreated,
  onError,
  onGeneratingChange
}: CreationPanelProps): React.JSX.Element {
  const [form] = Form.useForm<CreationFormValues>()
  const [referenceAssetIds, setReferenceAssetIds] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [optimizing, setOptimizing] = useState(false)

  async function optimizePrompt(): Promise<void> {
    const prompt = form.getFieldValue('prompt')
    if (!activeProvider) {
      onNeedProvider()
      return
    }
    if (!prompt?.trim()) {
      onError('请先输入提示词')
      return
    }
    setOptimizing(true)
    try {
      const optimized = await bloomCanvasClient.prompt.optimize({ providerId: activeProvider.id, prompt })
      form.setFieldValue('optimizedPrompt', optimized)
    } catch (error) {
      onError(error instanceof Error ? error.message : '优化提示词失败')
    } finally {
      setOptimizing(false)
    }
  }

  async function createGeneration(): Promise<void> {
    if (!activeProvider?.hasApiKey) {
      onNeedProvider()
      return
    }

    const values = await form.validateFields()
    onGeneratingChange(true)
    try {
      const record = await bloomCanvasClient.generations.create({
        providerId: activeProvider.id,
        prompt: values.prompt,
        optimizedPrompt: values.optimizedPrompt,
        useOptimizedPrompt: Boolean(values.optimizedPrompt?.trim()),
        referenceAssetIds,
        parameters: {
          size: values.size,
          count: values.count,
          quality: values.quality,
          outputFormat: values.outputFormat
        }
      })
      await onCreated(record)
      onError(null)
    } catch (error) {
      onError(error instanceof Error ? error.message : '生成失败')
    } finally {
      onGeneratingChange(false)
    }
  }

  return (
    <aside className="creation-panel">
      <div className="panel-header">
        <Typography.Text strong>创作</Typography.Text>
        <FileImageOutlined />
      </div>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          size: settings?.defaultSize ?? '1024x1024',
          count: settings?.defaultCount ?? 1,
          quality: settings?.defaultQuality ?? 'standard',
          outputFormat: settings?.defaultOutputFormat ?? 'png'
        }}
      >
        <Form.Item label="提示词" name="prompt" rules={[{ required: true, message: '请输入提示词' }]}>
          <Input.TextArea autoSize={{ minRows: 7, maxRows: 12 }} placeholder="描述你想生成的画面" />
        </Form.Item>
        <Button block icon={<SparklesOutlined />} loading={optimizing} onClick={optimizePrompt}>
          优化提示词
        </Button>
        <Form.Item label="优化后提示词" name="optimizedPrompt">
          <Input.TextArea autoSize={{ minRows: 4, maxRows: 8 }} placeholder="优化结果会显示在这里，可继续编辑" />
        </Form.Item>
        <Upload
          accept="image/png,image/jpeg,image/webp"
          beforeUpload={async (file) => {
            setUploading(true)
            try {
              const asset = await bloomCanvasClient.assets.import({ filePath: (file as UploadFile & { path?: string }).path ?? '' })
              setReferenceAssetIds((current) => [...current, asset.id])
            } catch (error) {
              onError(error instanceof Error ? error.message : '导入参考图失败')
            } finally {
              setUploading(false)
            }
            return false
          }}
          maxCount={8}
          multiple
        >
          <Button block loading={uploading}>
            添加参考图
          </Button>
        </Upload>
        <Space.Compact block>
          <Form.Item label="尺寸" name="size" style={{ flex: 1 }}>
            <Select
              options={[
                { label: '1024 x 1024', value: '1024x1024' },
                { label: '1024 x 1536', value: '1024x1536' },
                { label: '1536 x 1024', value: '1536x1024' },
                { label: '自动', value: 'auto' }
              ]}
            />
          </Form.Item>
          <Form.Item label="数量" name="count" style={{ width: 96 }}>
            <InputNumber max={4} min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Space.Compact>
        <Space.Compact block>
          <Form.Item label="质量" name="quality" style={{ flex: 1 }}>
            <Select
              options={[
                { label: '标准', value: 'standard' },
                { label: '高清', value: 'hd' }
              ]}
            />
          </Form.Item>
          <Form.Item label="格式" name="outputFormat" style={{ flex: 1 }}>
            <Select
              options={[
                { label: 'PNG', value: 'png' },
                { label: 'JPEG', value: 'jpeg' },
                { label: 'WEBP', value: 'webp' }
              ]}
            />
          </Form.Item>
        </Space.Compact>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button block size="large" type="primary" onClick={createGeneration}>
            生成
          </Button>
          <Button block icon={<DeleteOutlined />} onClick={() => form.resetFields()}>
            清空
          </Button>
        </Space>
      </Form>
    </aside>
  )
}
```

- [ ] **步骤 3：添加创作面板测试**

创建 `src/renderer/src/components/CreationPanel.test.tsx`：

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CreationPanel } from './CreationPanel'

describe('CreationPanel', () => {
  it('opens provider settings when generating without provider', async () => {
    const onNeedProvider = vi.fn()

    render(
      <CreationPanel
        activeProvider={null}
        settings={null}
        onNeedProvider={onNeedProvider}
        onCreated={vi.fn()}
        onError={vi.fn()}
        onGeneratingChange={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '生成' }))

    expect(onNeedProvider).toHaveBeenCalledOnce()
  })
})
```

- [ ] **步骤 4：运行类型检查和测试**

运行：

```bash
pnpm typecheck:web
pnpm test:run src/renderer/src/components/CreationPanel.test.tsx
```

预期：两个命令都 PASS。

- [ ] **步骤 5：Commit**

```bash
git add src/renderer/src/components/CreationPanel.tsx src/renderer/src/components/ProviderSettingsModal.tsx src/renderer/src/components/CreationPanel.test.tsx
git commit -m "feat: add creation panel and provider settings"
```

---

## 任务 14：替换模板样式为工作台视觉

**文件：**
- 修改：`src/renderer/src/assets/base.css`
- 修改：`src/renderer/src/assets/main.css`

- [ ] **步骤 1：修改基础样式**

将 `src/renderer/src/assets/base.css` 改为：

```css
:root {
  color: #1f2328;
  background: #f6f7f8;
  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    'PingFang SC',
    'Microsoft YaHei',
    sans-serif;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  min-height: 100vh;
  margin: 0;
  overflow: hidden;
}

button,
input,
textarea {
  font: inherit;
}
```

- [ ] **步骤 2：修改工作台样式**

将 `src/renderer/src/assets/main.css` 改为：

```css
@import './base.css';

#root {
  min-height: 100vh;
}

.app-shell {
  min-height: 100vh;
  background: #f6f7f8;
}

.top-bar {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.top-bar h4 {
  margin: 0;
}

.workspace-layout {
  height: calc(100vh - 56px);
  display: grid;
  grid-template-columns: 280px minmax(420px, 1fr) 360px;
  gap: 1px;
  background: #e5e7eb;
}

.history-panel,
.creation-panel,
.gallery-panel {
  min-height: 0;
  background: #ffffff;
}

.history-panel,
.creation-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  overflow: auto;
}

.panel-header,
.gallery-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.history-list {
  min-height: 0;
  overflow: auto;
}

.history-item {
  cursor: pointer;
  border-radius: 8px;
  padding: 8px;
}

.history-item:hover,
.history-item-active {
  background: #eef5f2;
}

.history-thumb {
  width: 52px;
  height: 52px;
  flex: 0 0 52px;
  overflow: hidden;
  border-radius: 6px;
  background: #edf0f2;
}

.history-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.history-content {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.gallery-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px;
  overflow: auto;
}

.gallery-empty {
  align-items: center;
  justify-content: center;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.image-tile {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f3f4f6;
}

.image-tile .ant-image,
.image-tile img {
  width: 100%;
  height: 100%;
}

.image-tile img {
  object-fit: cover;
}

.tile-action {
  position: absolute;
  right: 10px;
  bottom: 10px;
}

.preview-modal-body {
  display: grid;
  grid-template-columns: minmax(360px, 1fr) 320px;
  gap: 18px;
}

.preview-modal-body img {
  width: 100%;
  max-height: 72vh;
  object-fit: contain;
  border-radius: 8px;
  background: #f3f4f6;
}

@media (max-width: 1100px) {
  .workspace-layout {
    grid-template-columns: 240px minmax(360px, 1fr) 320px;
  }
}
```

- [ ] **步骤 3：运行格式化**

运行：

```bash
pnpm format
```

预期：Prettier 完成格式化。

- [ ] **步骤 4：运行类型检查**

运行：

```bash
pnpm typecheck
```

预期：PASS。

- [ ] **步骤 5：Commit**

```bash
git add src/renderer/src/assets/base.css src/renderer/src/assets/main.css
git commit -m "style: add BloomCanvas workspace layout"
```

---

## 任务 15：端到端验证和打包前检查

**文件：**
- 修改：按验证结果修复前面任务引入的问题。

- [ ] **步骤 1：运行完整测试**

运行：

```bash
pnpm test:run
```

预期：所有测试 PASS。

- [ ] **步骤 2：运行 lint**

运行：

```bash
pnpm lint
```

预期：PASS。若 ESLint 报出未使用变量，删除未使用变量；若报 React Hook 依赖缺失，补齐依赖或用 `useCallback` 固定引用。

- [ ] **步骤 3：运行类型检查**

运行：

```bash
pnpm typecheck
```

预期：PASS。

- [ ] **步骤 4：运行构建**

运行：

```bash
pnpm build
```

预期：Electron Vite build 成功，输出 `out/`。

- [ ] **步骤 5：运行开发服务手动验收**

运行：

```bash
pnpm dev
```

验收清单：

- 应用首屏直接进入三栏工作台。
- 未配置 API Key 时，顶部状态显示未配置。
- 点击生成会打开 Provider 设置弹窗。
- Provider 设置允许填写自定义 Base URL、API Key、图像模型、提示词模型。
- 提示词输入、参考图上传、尺寸、数量、质量、格式控件可操作。
- 生成失败时有明确错误提示，不出现空白页面。
- 生成成功后中间结果区显示图片，左侧历史出现记录。
- 导出图片会复制到用户选择目录。

- [ ] **步骤 6：检查 Git 差异**

运行：

```bash
git diff --check
git status --short
```

预期：`git diff --check` 无输出；`git status --short` 只包含本计划涉及的文件。

- [ ] **步骤 7：Commit**

```bash
git add .
git commit -m "feat: implement BloomCanvas MVP workbench"
```

---

## 风险与处理策略

| 风险 | 处理 |
| --- | --- |
| `keytar` 在某些环境安装失败 | 保留 `CredentialService` 边界；如果本机安装失败，改用 Electron `safeStorage` 加密写入应用数据目录，Renderer 接口不变。 |
| 自定义 Provider 不兼容 OpenAI Images 参数 | UI 保留基础参数；Main 捕获 Provider 返回体并展示清晰错误。后续通过 Provider capability 做参数映射。 |
| 参考图上传拿不到真实文件路径 | Electron 环境下 antd Upload 的 File 通常带 `path`；若为空，改为通过 `dialog.showOpenDialog` 选择文件并从 Main 导入。 |
| `file://` 图片路径在 Renderer 中被 CSP 或路径编码影响 | 将路径转成 `pathToFileURL(asset.filePath).toString()` 后再传给 Renderer，或增加 `assetUrl` 字段。 |
| JSON 元数据并发写入覆盖 | 当前生成任务首版串行触发；如果后续引入队列，在 `StorageService` 增加写入锁。 |

## 自检记录

- 规格覆盖：计划覆盖文生图、参考图生图、提示词优化、自定义 Provider、本地历史、结果预览、导出、API Key 不进 Renderer。
- 首版边界：未引入 Project、局部编辑、批量队列、云同步、聊天式多轮。
- 类型一致性：`Generation`、`Asset`、`Variant`、`ProviderConfig` 在共享类型、Main 服务、Renderer 组件中使用同一命名。
- 安全边界：Renderer 只调用 `window.bloomCanvas`，Provider 请求和 API Key 读取都在 Main 进程。
