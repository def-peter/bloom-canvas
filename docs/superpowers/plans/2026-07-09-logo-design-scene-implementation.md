# Logo 设计专题实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在 BloomCanvas 中实现 Logo 设计专题，使用户可以创建 Logo 轻项目、填写品牌简报、生成并确认提示词包、按多个风格方向生成 Logo 初稿，并查看白底/黑底/64px/32px 可用性检查。

**架构：** 保持 Electron Main 作为可信后端边界，Renderer 只通过 typed IPC 访问白名单能力。新增 Logo 领域类型、提示词编译器、Logo 项目服务和 Logo 场景 UI；生成图片仍复用现有 `GenerationService`、资产服务和 Provider 配置，但为生成记录补充 `scenario`、`projectId`、`scenarioMetadata`。通用创作保持现有行为，Logo 场景通过场景切换进入。

**技术栈：** Electron 39、electron-vite、React 19、TypeScript 5、antd、@ant-design/icons、Zod、Vitest、Testing Library。

---

## 文件结构

### 共享类型与校验

- 修改：`src/shared/types.ts`
  - 新增 `GenerationScenario`、`LogoProject`、`LogoPromptPack`、`LogoPromptDirection`、`LogoGenerationMetadata`、`CreateLogoProjectInput`、`UpdateLogoProjectInput`、`BuildLogoPromptPackInput`。
  - 扩展 `Generation`：新增可选 `scenario?: 'general' | 'logo-design'`、`projectId?: string`、`scenarioMetadata?: LogoGenerationMetadata`。
  - 扩展 `CreateGenerationInput`：新增可选 `scenario`、`projectId`、`scenarioMetadata`。
- 修改：`src/shared/schemas.ts`
  - 新增 Logo 项目、提示词包、Logo metadata 的 Zod schema。
  - 扩展 `createGenerationSchema` 接收 Logo 场景 metadata。
- 修改：`src/shared/ipc.ts`
  - 新增 IPC channel：`logoProject:list`、`logoProject:save`、`logoProject:get`、`logoPrompt:build`。
  - 扩展 `BloomCanvasApi`。

### Main 进程

- 修改：`src/main/services/storageService.ts`
  - `MetadataState` 新增 `logoProjects: LogoProject[]`。
  - `read()` 和 `emptyState()` 提供兼容旧 metadata 的默认值。
- 创建：`src/main/services/logoPromptCompiler.ts`
  - 纯函数编译 Logo 提示词包，不依赖 Electron。
- 创建：`src/main/services/logoProjectService.ts`
  - 保存、读取、更新 Logo 轻项目。
  - 创建或更新项目时维护 `promptPack`、`generationIds`、`referenceImageIds`。
- 修改：`src/main/services/generationService.ts`
  - 创建生成记录时保存 `scenario`、`projectId`、`scenarioMetadata`。
  - `retry()` 默认复用原最终提示词和 metadata。
- 修改：`src/main/ipc/registerIpcHandlers.ts`
  - 注册 Logo 项目和提示词包 IPC。
  - `generation:create` 成功后，如果是 Logo 项目生成，更新项目 `generationIds`。

### Preload 与 Renderer API

- 修改：`src/preload/index.ts`
  - 暴露 `window.bloomCanvas.logoProjects` 和 `window.bloomCanvas.logoPrompt`。
- 修改：`src/preload/index.d.ts`
  - 类型声明保持与 `BloomCanvasApi` 一致。
- 修改：`src/renderer/src/api/bloomCanvasClient.ts`
  - 增加 `logoProjects` 和 `logoPrompt` client 封装。

### Renderer 状态与组件

- 修改：`src/renderer/src/state/workbenchStore.ts`
  - 新增场景状态 `activeScene: 'general' | 'logo-design'`。
  - 新增 `logoProjects`、`selectedLogoProject`、`selectLogoProject`、`refreshLogoProjects`。
- 修改：`src/renderer/src/components/AppShell.tsx`
  - 顶部增加场景切换：`通用创作` / `Logo 设计`。
  - Logo 场景下渲染 Logo 项目列表、Logo 方向结果区、Logo 表单。
- 创建：`src/renderer/src/components/logo/logoConstants.ts`
  - Logo 类型、风格方向、使用场景选项。
- 创建：`src/renderer/src/components/logo/LogoProjectPanel.tsx`
  - 左侧 Logo 项目列表和新建项目入口。
- 创建：`src/renderer/src/components/logo/LogoCreationPanel.tsx`
  - 右侧 Logo 表单、参考图、提示词包预览、生成按钮。
- 创建：`src/renderer/src/components/logo/LogoPromptPreview.tsx`
  - 展示摘要、展开完整提示词、允许编辑方向提示词。
- 创建：`src/renderer/src/components/logo/LogoResultsPanel.tsx`
  - 中间按风格方向分组展示 Logo 结果。
- 创建：`src/renderer/src/components/logo/LogoUsabilityPreview.tsx`
  - 白底、黑底、64px、32px 检查视图。
- 修改：`src/renderer/src/assets/main.css`
  - 增加 Logo 场景布局、表单、方向分组、小尺寸检查样式。

### 测试

- 创建：`src/main/services/logoPromptCompiler.test.ts`
- 创建：`src/main/services/logoProjectService.test.ts`
- 修改：`src/main/services/storageService.test.ts`
- 修改：`src/main/services/generationService.test.ts`
- 修改：`src/preload/index.test.ts`
- 创建：`src/renderer/src/components/logo/LogoCreationPanel.test.tsx`
- 创建：`src/renderer/src/components/logo/LogoResultsPanel.test.tsx`
- 创建：`src/renderer/src/components/logo/LogoUsabilityPreview.test.tsx`
- 修改：`src/renderer/src/components/AppShell.test.tsx`

---

## 任务 1：扩展共享类型和输入校验

**文件：**
- 修改：`src/shared/types.ts`
- 修改：`src/shared/schemas.ts`

- [ ] **步骤 1：编写失败的 schema 测试**

在 `src/shared/schemas.test.ts` 中新增：

```ts
import { describe, expect, test } from 'vitest'
import { buildLogoPromptPackSchema, createGenerationSchema, saveLogoProjectSchema } from './schemas'

describe('logo schemas', () => {
  test('accepts a minimal logo project brief', () => {
    const result = saveLogoProjectSchema.parse({
      brandName: '生花',
      industry: 'AI 绘图软件',
      businessDescription: '帮助创作者用 AI 生成图片',
      brandKeywords: ['清晰', '创造力'],
      logoTypes: ['combination-mark'],
      styleDirections: ['modern-minimal', 'symbolic-mark'],
      referenceImageIds: []
    })

    expect(result.brandName).toBe('生花')
    expect(result.styleDirections).toHaveLength(2)
  })

  test('rejects more than four style directions', () => {
    expect(() =>
      saveLogoProjectSchema.parse({
        brandName: '生花',
        industry: 'AI 绘图软件',
        businessDescription: '帮助创作者用 AI 生成图片',
        brandKeywords: ['清晰'],
        logoTypes: ['combination-mark'],
        styleDirections: [
          'modern-minimal',
          'symbolic-mark',
          'wordmark',
          'lettermark',
          'emblem'
        ],
        referenceImageIds: []
      })
    ).toThrow()
  })

  test('accepts logo metadata on generation input', () => {
    const input = createGenerationSchema.parse({
      providerId: 'provider-1',
      prompt: 'base prompt\\nmodern direction prompt',
      useOptimizedPrompt: false,
      referenceAssetIds: [],
      parameters: {
        size: '1024x1024',
        count: 1,
        quality: 'standard',
        outputFormat: 'png'
      },
      scenario: 'logo-design',
      projectId: 'project-1',
      scenarioMetadata: {
        logoProjectId: 'project-1',
        styleDirectionId: 'modern-minimal',
        styleDirectionName: '现代极简',
        logoTypes: ['combination-mark'],
        promptPackSnapshot: {
          basePrompt: 'base prompt',
          directions: [
            {
              id: 'modern-minimal',
              name: '现代极简',
              prompt: 'modern direction prompt',
              finalPrompt: 'base prompt\\nmodern direction prompt'
            }
          ]
        },
        finalPrompt: 'base prompt\\nmodern direction prompt',
        briefSnapshot: {
          brandName: '生花',
          industry: 'AI 绘图软件',
          businessDescription: '帮助创作者用 AI 生成图片',
          brandKeywords: ['清晰']
        },
        qualityRulesVersion: 1
      }
    })

    expect(input.scenario).toBe('logo-design')
  })
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
pnpm test:run src/shared/schemas.test.ts
```

预期：FAIL，报错包含 `buildLogoPromptPackSchema` 或 `saveLogoProjectSchema` 未导出。

- [ ] **步骤 3：新增共享类型**

在 `src/shared/types.ts` 中新增类型：

```ts
export type GenerationScenario = 'general' | 'logo-design'
export type LogoProjectId = string

export type LogoType =
  | 'symbol-mark'
  | 'wordmark'
  | 'combination-mark'
  | 'lettermark'
  | 'emblem'

export type LogoStyleDirectionId =
  | 'modern-minimal'
  | 'symbolic-mark'
  | 'wordmark'
  | 'lettermark'
  | 'emblem'
  | 'tech'
  | 'friendly-rounded'
  | 'eastern-modern'
  | 'premium-restraint'

export type LogoUsageScenario =
  | 'app-icon'
  | 'website'
  | 'ecommerce'
  | 'packaging'
  | 'storefront'
  | 'social-avatar'

export interface LogoPromptDirection {
  id: LogoStyleDirectionId
  name: string
  prompt: string
  finalPrompt: string
}

export interface LogoPromptPack {
  basePrompt: string
  directions: LogoPromptDirection[]
}

export interface LogoProject {
  id: LogoProjectId
  brandName: string
  brandNameAlt?: string
  shortName?: string
  slogan?: string
  industry: string
  businessDescription: string
  targetAudience?: string
  brandKeywords: string[]
  differentiator?: string
  avoidElements?: string
  preferredColors: string[]
  avoidedColors: string[]
  logoTypes: LogoType[]
  styleDirections: LogoStyleDirectionId[]
  usageScenarios: LogoUsageScenario[]
  referenceImageIds: AssetId[]
  referenceNote?: string
  promptPack?: LogoPromptPack
  generationIds: GenerationId[]
  favoriteVariantIds: VariantId[]
  createdAt: string
  updatedAt: string
}

export interface LogoBriefSnapshot {
  brandName: string
  brandNameAlt?: string
  shortName?: string
  slogan?: string
  industry: string
  businessDescription: string
  targetAudience?: string
  brandKeywords: string[]
  differentiator?: string
  avoidElements?: string
  preferredColors?: string[]
  avoidedColors?: string[]
  usageScenarios?: LogoUsageScenario[]
  referenceNote?: string
}

export interface LogoGenerationMetadata {
  logoProjectId: LogoProjectId
  styleDirectionId: LogoStyleDirectionId
  styleDirectionName: string
  logoTypes: LogoType[]
  promptPackSnapshot: LogoPromptPack
  finalPrompt: string
  briefSnapshot: LogoBriefSnapshot
  qualityRulesVersion: 1
}

export interface SaveLogoProjectInput {
  id?: LogoProjectId
  brandName: string
  brandNameAlt?: string
  shortName?: string
  slogan?: string
  industry: string
  businessDescription: string
  targetAudience?: string
  brandKeywords: string[]
  differentiator?: string
  avoidElements?: string
  preferredColors?: string[]
  avoidedColors?: string[]
  logoTypes: LogoType[]
  styleDirections: LogoStyleDirectionId[]
  usageScenarios?: LogoUsageScenario[]
  referenceImageIds: AssetId[]
  referenceNote?: string
  promptPack?: LogoPromptPack
}

export interface BuildLogoPromptPackInput extends SaveLogoProjectInput {
  id?: LogoProjectId
}
```

扩展 `Generation` 和 `CreateGenerationInput`：

```ts
export interface Generation {
  // existing fields...
  scenario?: GenerationScenario
  projectId?: LogoProjectId
  scenarioMetadata?: LogoGenerationMetadata
}

export interface CreateGenerationInput {
  // existing fields...
  scenario?: GenerationScenario
  projectId?: LogoProjectId
  scenarioMetadata?: LogoGenerationMetadata
}
```

- [ ] **步骤 4：新增 Zod schema**

在 `src/shared/schemas.ts` 中新增：

```ts
const logoTypeSchema = z.enum([
  'symbol-mark',
  'wordmark',
  'combination-mark',
  'lettermark',
  'emblem'
])

const logoStyleDirectionSchema = z.enum([
  'modern-minimal',
  'symbolic-mark',
  'wordmark',
  'lettermark',
  'emblem',
  'tech',
  'friendly-rounded',
  'eastern-modern',
  'premium-restraint'
])

const logoUsageScenarioSchema = z.enum([
  'app-icon',
  'website',
  'ecommerce',
  'packaging',
  'storefront',
  'social-avatar'
])

export const logoPromptDirectionSchema = z.object({
  id: logoStyleDirectionSchema,
  name: z.string().trim().min(1),
  prompt: z.string().trim().min(1).max(8000),
  finalPrompt: z.string().trim().min(1).max(12000)
})

export const logoPromptPackSchema = z.object({
  basePrompt: z.string().trim().min(1).max(12000),
  directions: z.array(logoPromptDirectionSchema).min(1).max(4)
})

export const saveLogoProjectSchema = z.object({
  id: z.string().min(1).optional(),
  brandName: z.string().trim().min(1).max(120),
  brandNameAlt: z.string().trim().max(120).optional(),
  shortName: z.string().trim().max(40).optional(),
  slogan: z.string().trim().max(160).optional(),
  industry: z.string().trim().min(1).max(120),
  businessDescription: z.string().trim().min(1).max(1200),
  targetAudience: z.string().trim().max(400).optional(),
  brandKeywords: z.array(z.string().trim().min(1).max(40)).min(1).max(6),
  differentiator: z.string().trim().max(600).optional(),
  avoidElements: z.string().trim().max(600).optional(),
  preferredColors: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  avoidedColors: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  logoTypes: z.array(logoTypeSchema).min(1).max(5),
  styleDirections: z.array(logoStyleDirectionSchema).min(1).max(4),
  usageScenarios: z.array(logoUsageScenarioSchema).max(6).default([]),
  referenceImageIds: z.array(z.string().min(1)).max(8),
  referenceNote: z.string().trim().max(600).optional(),
  promptPack: logoPromptPackSchema.optional()
})

export const buildLogoPromptPackSchema = saveLogoProjectSchema
```

新增 `logoGenerationMetadataSchema`，并扩展 `createGenerationSchema`：

```ts
export const logoGenerationMetadataSchema = z.object({
  logoProjectId: z.string().min(1),
  styleDirectionId: logoStyleDirectionSchema,
  styleDirectionName: z.string().trim().min(1),
  logoTypes: z.array(logoTypeSchema).min(1),
  promptPackSnapshot: logoPromptPackSchema,
  finalPrompt: z.string().trim().min(1).max(12000),
  briefSnapshot: z.object({
    brandName: z.string().trim().min(1),
    brandNameAlt: z.string().trim().optional(),
    shortName: z.string().trim().optional(),
    slogan: z.string().trim().optional(),
    industry: z.string().trim().min(1),
    businessDescription: z.string().trim().min(1),
    targetAudience: z.string().trim().optional(),
    brandKeywords: z.array(z.string().trim().min(1)),
    differentiator: z.string().trim().optional(),
    avoidElements: z.string().trim().optional(),
    preferredColors: z.array(z.string()).optional(),
    avoidedColors: z.array(z.string()).optional(),
    usageScenarios: z.array(logoUsageScenarioSchema).optional(),
    referenceNote: z.string().trim().optional()
  }),
  qualityRulesVersion: z.literal(1)
})

export const createGenerationSchema = z.object({
  prompt: z.string().trim().min(1).max(12000),
  useOptimizedPrompt: z.boolean(),
  optimizedPrompt: z.string().trim().max(12000).optional(),
  referenceAssetIds: z.array(z.string().min(1)).max(8),
  parameters: generationParametersSchema,
  providerId: z.string().min(1),
  scenario: z.enum(['general', 'logo-design']).optional(),
  projectId: z.string().min(1).optional(),
  scenarioMetadata: logoGenerationMetadataSchema.optional()
})
```

- [ ] **步骤 5：运行测试验证通过**

运行：

```bash
pnpm test:run src/shared/schemas.test.ts
pnpm typecheck
```

预期：测试 PASS，typecheck PASS。

- [ ] **步骤 6：Commit**

```bash
git add src/shared/types.ts src/shared/schemas.ts src/shared/schemas.test.ts
git commit -m "feat: add logo design shared schemas"
```

---

## 任务 2：扩展存储状态以支持 Logo 项目

**文件：**
- 修改：`src/main/services/storageService.test.ts`
- 修改：`src/main/services/storageService.ts`

- [ ] **步骤 1：编写失败的存储测试**

在 `src/main/services/storageService.test.ts` 中新增：

```ts
test('defaults missing logoProjects to an empty list', async () => {
  const paths = await createTestPaths()
  await mkdir(paths.dataDir, { recursive: true })
  await writeFile(
    paths.metadataPath,
    JSON.stringify({
      providers: [],
      settings: defaultSettings,
      assets: [],
      generations: [],
      variants: []
    }),
    'utf8'
  )

  const service = new StorageService(paths)
  const state = await service.read()

  expect(state.logoProjects).toEqual([])
})

test('persists logoProjects', async () => {
  const paths = await createTestPaths()
  const service = new StorageService(paths)

  await service.update((state) => ({
    ...state,
    logoProjects: [
      {
        id: 'project-1',
        brandName: '生花',
        industry: 'AI 绘图软件',
        businessDescription: '帮助创作者生成图片',
        brandKeywords: ['清晰'],
        preferredColors: [],
        avoidedColors: [],
        logoTypes: ['combination-mark'],
        styleDirections: ['modern-minimal'],
        usageScenarios: [],
        referenceImageIds: [],
        generationIds: [],
        favoriteVariantIds: [],
        createdAt: '2026-07-09T00:00:00.000Z',
        updatedAt: '2026-07-09T00:00:00.000Z'
      }
    ]
  }))

  const state = await service.read()

  expect(state.logoProjects).toHaveLength(1)
  expect(state.logoProjects[0].brandName).toBe('生花')
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
pnpm test:run src/main/services/storageService.test.ts
```

预期：FAIL，`logoProjects` 不存在或为 `undefined`。

- [ ] **步骤 3：实现存储扩展**

在 `src/main/services/storageService.ts` 中修改 import：

```ts
import type {
  AppSettings,
  Asset,
  Generation,
  LogoProject,
  ProviderConfig,
  Variant
} from '../../shared/types'
```

扩展 `MetadataState`：

```ts
export interface MetadataState {
  providers: ProviderConfig[]
  settings: AppSettings
  assets: Asset[]
  generations: Generation[]
  variants: Variant[]
  logoProjects: LogoProject[]
}
```

在 `read()` 返回值中加入：

```ts
logoProjects: parsed.logoProjects ?? []
```

在 `emptyState()` 中加入：

```ts
logoProjects: []
```

- [ ] **步骤 4：运行测试验证通过**

运行：

```bash
pnpm test:run src/main/services/storageService.test.ts
pnpm typecheck
```

预期：测试 PASS，typecheck PASS。

- [ ] **步骤 5：Commit**

```bash
git add src/main/services/storageService.ts src/main/services/storageService.test.ts
git commit -m "feat: persist logo projects"
```

---

## 任务 3：实现 Logo 提示词包编译器

**文件：**
- 创建：`src/main/services/logoPromptCompiler.ts`
- 创建：`src/main/services/logoPromptCompiler.test.ts`

- [ ] **步骤 1：编写失败的提示词测试**

创建 `src/main/services/logoPromptCompiler.test.ts`：

```ts
import { describe, expect, test } from 'vitest'
import { buildLogoPromptPack } from './logoPromptCompiler'

describe('buildLogoPromptPack', () => {
  test('builds one base prompt and one final prompt per style direction', () => {
    const pack = buildLogoPromptPack({
      brandName: '生花',
      industry: 'AI 绘图软件',
      businessDescription: '帮助个人创作者用 AI 生成图片',
      targetAudience: '个人创作者和小团队',
      brandKeywords: ['清晰', '创造力'],
      preferredColors: ['蓝色'],
      avoidedColors: ['墨绿色'],
      avoidElements: '避免复杂花瓣和细碎纹理',
      logoTypes: ['combination-mark'],
      styleDirections: ['modern-minimal', 'symbolic-mark'],
      usageScenarios: ['app-icon', 'website'],
      referenceImageIds: [],
      referenceNote: '参考图只作为简洁程度参考'
    })

    expect(pack.basePrompt).toContain('生花')
    expect(pack.basePrompt).toContain('simple, scalable, clean vector-like logo')
    expect(pack.basePrompt).toContain('works at 64px and 32px')
    expect(pack.basePrompt).toContain('no tiny decorative elements')
    expect(pack.directions).toHaveLength(2)
    expect(pack.directions[0].finalPrompt).toContain(pack.basePrompt)
    expect(pack.directions[0].finalPrompt).toContain('现代极简')
  })

  test('keeps premium and tech styles constrained to simple logo language', () => {
    const pack = buildLogoPromptPack({
      brandName: 'NorthPeak',
      industry: '户外装备',
      businessDescription: '面向城市通勤和轻户外的装备品牌',
      brandKeywords: ['可靠'],
      logoTypes: ['symbol-mark'],
      styleDirections: ['tech', 'premium-restraint'],
      referenceImageIds: []
    })

    expect(pack.directions.map((item) => item.finalPrompt).join('\\n')).toContain(
      'avoid complex lines'
    )
    expect(pack.directions.map((item) => item.finalPrompt).join('\\n')).toContain(
      'avoid metallic effects'
    )
  })
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
pnpm test:run src/main/services/logoPromptCompiler.test.ts
```

预期：FAIL，`logoPromptCompiler` 模块不存在。

- [ ] **步骤 3：实现编译器**

创建 `src/main/services/logoPromptCompiler.ts`：

```ts
import type {
  BuildLogoPromptPackInput,
  LogoPromptPack,
  LogoStyleDirectionId,
  LogoType,
  LogoUsageScenario
} from '../../shared/types'

export const LOGO_QUALITY_RULES_VERSION = 1 as const

const styleDirectionLabels: Record<LogoStyleDirectionId, { name: string; instruction: string }> = {
  'modern-minimal': {
    name: '现代极简',
    instruction: 'Use clean geometry, strong whitespace, and a restrained symbol.'
  },
  'symbolic-mark': {
    name: '图形符号',
    instruction: 'Create an abstract or semi-abstract symbol with a clear silhouette.'
  },
  wordmark: {
    name: '字体标',
    instruction: 'Focus on custom wordmark lettering with simple, readable forms.'
  },
  lettermark: {
    name: '字母标',
    instruction: 'Use initials or short name as the main mark, with simple letter construction.'
  },
  emblem: {
    name: '徽章式',
    instruction: 'Use a simplified badge structure without ornate decoration.'
  },
  tech: {
    name: '科技感',
    instruction: 'Use geometric technology cues, avoid complex lines and circuit details.'
  },
  'friendly-rounded': {
    name: '亲和圆润',
    instruction: 'Use soft rounded shapes and a friendly visual tone.'
  },
  'eastern-modern': {
    name: '东方现代',
    instruction: 'Blend modern geometry with subtle eastern cues, avoid complex traditional patterns.'
  },
  'premium-restraint': {
    name: '高端克制',
    instruction: 'Use restrained luxury, quiet spacing, avoid metallic effects and heavy gradients.'
  }
}

const logoTypeLabels: Record<LogoType, string> = {
  'symbol-mark': '图形标',
  wordmark: '字体标',
  'combination-mark': '组合标',
  lettermark: '字母标',
  emblem: '徽章标'
}

const usageLabels: Record<LogoUsageScenario, string> = {
  'app-icon': 'App 图标',
  website: '网站',
  ecommerce: '电商',
  packaging: '包装',
  storefront: '门店招牌',
  'social-avatar': '社媒头像'
}

function joinList(values: string[] | undefined): string {
  return values?.filter(Boolean).join(', ') || '未指定'
}

export function buildLogoPromptPack(input: BuildLogoPromptPackInput): LogoPromptPack {
  const basePrompt = [
    'Create a logo concept for this brand.',
    '',
    'Brand brief:',
    `- Brand name: ${input.brandName}`,
    input.brandNameAlt ? `- Alternate/English name: ${input.brandNameAlt}` : null,
    input.shortName ? `- Short name or initials: ${input.shortName}` : null,
    input.slogan ? `- Slogan: ${input.slogan}` : null,
    `- Industry: ${input.industry}`,
    `- Business description: ${input.businessDescription}`,
    input.targetAudience ? `- Target audience: ${input.targetAudience}` : null,
    `- Brand keywords: ${input.brandKeywords.join(', ')}`,
    input.differentiator ? `- Differentiator: ${input.differentiator}` : null,
    '',
    'Logo constraints:',
    `- Logo type: ${input.logoTypes.map((item) => logoTypeLabels[item]).join(', ')}`,
    `- Preferred colors: ${joinList(input.preferredColors)}`,
    `- Avoided colors: ${joinList(input.avoidedColors)}`,
    input.avoidElements ? `- Avoid elements or feelings: ${input.avoidElements}` : null,
    `- Usage scenarios: ${
      input.usageScenarios?.length
        ? input.usageScenarios.map((item) => usageLabels[item]).join(', ')
        : 'website and general brand identity'
    }`,
    input.referenceNote ? `- Reference note: ${input.referenceNote}` : null,
    '',
    'Hard logo quality rules:',
    '- simple, scalable, clean vector-like logo',
    '- one core visual idea, at most one or two main elements',
    '- clear silhouette, minimal details',
    '- works at 64px and 32px',
    '- no complex texture, no tiny decorative elements',
    '- no photorealistic scene, no poster background, no mockup',
    '- no excessive shadows, gradients, metallic effects, or 3D rendering',
    '- centered composition on a clean plain background'
  ]
    .filter((line): line is string => line !== null)
    .join('\\n')

  const directions = input.styleDirections.map((id) => {
    const direction = styleDirectionLabels[id]
    const prompt = [
      `Style direction: ${direction.name}`,
      direction.instruction,
      'Keep the result simple enough for small-size logo usage.'
    ].join('\\n')

    return {
      id,
      name: direction.name,
      prompt,
      finalPrompt: `${basePrompt}\\n\\n${prompt}`
    }
  })

  return { basePrompt, directions }
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：

```bash
pnpm test:run src/main/services/logoPromptCompiler.test.ts
pnpm typecheck
```

预期：测试 PASS，typecheck PASS。

- [ ] **步骤 5：Commit**

```bash
git add src/main/services/logoPromptCompiler.ts src/main/services/logoPromptCompiler.test.ts
git commit -m "feat: build logo prompt packs"
```

---

## 任务 4：实现 Logo 项目服务

**文件：**
- 创建：`src/main/services/logoProjectService.ts`
- 创建：`src/main/services/logoProjectService.test.ts`

- [ ] **步骤 1：编写失败的服务测试**

创建 `src/main/services/logoProjectService.test.ts`：

```ts
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import type { AppPaths } from './appPaths'
import { LogoProjectService } from './logoProjectService'
import { StorageService } from './storageService'

let rootDir: string
let service: LogoProjectService

function pathsFor(dir: string): AppPaths {
  return {
    dataDir: dir,
    referencesDir: join(dir, 'references'),
    outputsDir: join(dir, 'outputs'),
    thumbnailsDir: join(dir, 'thumbnails'),
    tempDir: join(dir, 'temp'),
    metadataPath: join(dir, 'metadata.json')
  }
}

beforeEach(async () => {
  rootDir = await mkdtemp(join(tmpdir(), 'bloom-logo-project-'))
  service = new LogoProjectService(new StorageService(pathsFor(rootDir)))
})

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true })
})

describe('LogoProjectService', () => {
  test('creates a logo project with defaults and a prompt pack', async () => {
    const project = await service.save({
      brandName: '生花',
      industry: 'AI 绘图软件',
      businessDescription: '帮助创作者生成图片',
      brandKeywords: ['清晰'],
      logoTypes: ['combination-mark'],
      styleDirections: ['modern-minimal'],
      referenceImageIds: []
    })

    expect(project.id).toBeTruthy()
    expect(project.preferredColors).toEqual([])
    expect(project.generationIds).toEqual([])
    expect(project.promptPack?.directions[0].id).toBe('modern-minimal')
  })

  test('updates an existing project without losing generation ids', async () => {
    const created = await service.save({
      brandName: '生花',
      industry: 'AI 绘图软件',
      businessDescription: '帮助创作者生成图片',
      brandKeywords: ['清晰'],
      logoTypes: ['combination-mark'],
      styleDirections: ['modern-minimal'],
      referenceImageIds: []
    })
    await service.appendGeneration(created.id, 'generation-1')

    const updated = await service.save({
      ...created,
      brandKeywords: ['清晰', '克制'],
      styleDirections: ['modern-minimal', 'symbolic-mark'],
      referenceImageIds: []
    })

    expect(updated.generationIds).toEqual(['generation-1'])
    expect(updated.promptPack?.directions).toHaveLength(2)
  })
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
pnpm test:run src/main/services/logoProjectService.test.ts
```

预期：FAIL，`logoProjectService` 模块不存在。

- [ ] **步骤 3：实现服务**

创建 `src/main/services/logoProjectService.ts`：

```ts
import { nanoid } from 'nanoid'
import type { GenerationId, LogoProject, LogoProjectId, SaveLogoProjectInput } from '../../shared/types'
import { buildLogoPromptPack } from './logoPromptCompiler'
import type { StorageService } from './storageService'

export class LogoProjectService {
  constructor(private readonly storage: StorageService) {}

  async list(): Promise<LogoProject[]> {
    const state = await this.storage.read()
    return state.logoProjects.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async get(id: LogoProjectId): Promise<LogoProject> {
    const state = await this.storage.read()
    const project = state.logoProjects.find((item) => item.id === id)
    if (!project) throw new Error('Logo project not found')
    return project
  }

  async save(input: SaveLogoProjectInput): Promise<LogoProject> {
    const now = new Date().toISOString()
    const state = await this.storage.read()
    const existing = input.id
      ? state.logoProjects.find((project) => project.id === input.id)
      : undefined
    const promptPack = input.promptPack ?? buildLogoPromptPack(input)
    const nextProject: LogoProject = {
      id: existing?.id ?? input.id ?? nanoid(),
      brandName: input.brandName,
      brandNameAlt: input.brandNameAlt,
      shortName: input.shortName,
      slogan: input.slogan,
      industry: input.industry,
      businessDescription: input.businessDescription,
      targetAudience: input.targetAudience,
      brandKeywords: input.brandKeywords,
      differentiator: input.differentiator,
      avoidElements: input.avoidElements,
      preferredColors: input.preferredColors ?? [],
      avoidedColors: input.avoidedColors ?? [],
      logoTypes: input.logoTypes,
      styleDirections: input.styleDirections,
      usageScenarios: input.usageScenarios ?? [],
      referenceImageIds: input.referenceImageIds,
      referenceNote: input.referenceNote,
      promptPack,
      generationIds: existing?.generationIds ?? [],
      favoriteVariantIds: existing?.favoriteVariantIds ?? [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    }

    await this.storage.update((current) => ({
      ...current,
      logoProjects: existing
        ? current.logoProjects.map((project) =>
            project.id === nextProject.id ? nextProject : project
          )
        : [...current.logoProjects, nextProject]
    }))

    return nextProject
  }

  async appendGeneration(projectId: LogoProjectId, generationId: GenerationId): Promise<LogoProject> {
    const state = await this.storage.update((current) => ({
      ...current,
      logoProjects: current.logoProjects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              generationIds: project.generationIds.includes(generationId)
                ? project.generationIds
                : [...project.generationIds, generationId],
              updatedAt: new Date().toISOString()
            }
          : project
      )
    }))
    const project = state.logoProjects.find((item) => item.id === projectId)
    if (!project) throw new Error('Logo project not found')
    return project
  }
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：

```bash
pnpm test:run src/main/services/logoProjectService.test.ts
pnpm typecheck
```

预期：测试 PASS，typecheck PASS。

- [ ] **步骤 5：Commit**

```bash
git add src/main/services/logoProjectService.ts src/main/services/logoProjectService.test.ts
git commit -m "feat: add logo project service"
```

---

## 任务 5：把 Logo 场景接入生成记录

**文件：**
- 修改：`src/main/services/generationService.test.ts`
- 修改：`src/main/services/generationService.ts`

- [ ] **步骤 1：编写失败的生成测试**

在 `src/main/services/generationService.test.ts` 中新增：

```ts
test('stores logo scenario metadata on generated records', async () => {
  const service = createGenerationServiceWithSuccessfulProvider()
  const record = await service.create({
    providerId: 'provider-1',
    prompt: 'final logo prompt',
    useOptimizedPrompt: false,
    referenceAssetIds: [],
    parameters: {
      size: '1024x1024',
      count: 1,
      quality: 'standard',
      outputFormat: 'png'
    },
    scenario: 'logo-design',
    projectId: 'project-1',
    scenarioMetadata: {
      logoProjectId: 'project-1',
      styleDirectionId: 'modern-minimal',
      styleDirectionName: '现代极简',
      logoTypes: ['combination-mark'],
      promptPackSnapshot: {
        basePrompt: 'base prompt',
        directions: [
          {
            id: 'modern-minimal',
            name: '现代极简',
            prompt: 'direction prompt',
            finalPrompt: 'final logo prompt'
          }
        ]
      },
      finalPrompt: 'final logo prompt',
      briefSnapshot: {
        brandName: '生花',
        industry: 'AI 绘图软件',
        businessDescription: '帮助创作者生成图片',
        brandKeywords: ['清晰']
      },
      qualityRulesVersion: 1
    }
  })

  expect(record.scenario).toBe('logo-design')
  expect(record.projectId).toBe('project-1')
  expect(record.scenarioMetadata?.styleDirectionId).toBe('modern-minimal')
  expect(record.promptFinal).toBe('final logo prompt')
})
```

如果现有测试没有 `createGenerationServiceWithSuccessfulProvider()` helper，先提取现有测试 setup 成这个 helper，保持行为不变。

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
pnpm test:run src/main/services/generationService.test.ts
```

预期：FAIL，`record.scenario` 为 `undefined`。

- [ ] **步骤 3：实现 metadata 写入**

在 `src/main/services/generationService.ts` 的 `generation` 对象里加入：

```ts
scenario: input.scenario ?? 'general',
projectId: input.projectId,
scenarioMetadata: input.scenarioMetadata,
```

在 `retry()` 调用 `this.create()` 时加入：

```ts
scenario: generation.scenario,
projectId: generation.projectId,
scenarioMetadata: generation.scenarioMetadata,
```

并把 `prompt` 改为使用最终提示词，避免 Logo 重试时重新走旧的 optimized 逻辑：

```ts
return this.create({
  prompt: generation.promptFinal,
  useOptimizedPrompt: false,
  optimizedPrompt: undefined,
  referenceAssetIds: generation.referenceImageIds,
  parameters: generation.parameters,
  providerId: generation.providerId,
  scenario: generation.scenario,
  projectId: generation.projectId,
  scenarioMetadata: generation.scenarioMetadata
})
```

- [ ] **步骤 4：运行测试验证通过**

运行：

```bash
pnpm test:run src/main/services/generationService.test.ts
pnpm typecheck
```

预期：测试 PASS，typecheck PASS。

- [ ] **步骤 5：Commit**

```bash
git add src/main/services/generationService.ts src/main/services/generationService.test.ts
git commit -m "feat: store logo generation metadata"
```

---

## 任务 6：新增 Logo IPC、Preload 和 Renderer Client

**文件：**
- 修改：`src/shared/ipc.ts`
- 修改：`src/main/ipc/registerIpcHandlers.ts`
- 修改：`src/preload/index.ts`
- 修改：`src/preload/index.d.ts`
- 修改：`src/preload/index.test.ts`
- 修改：`src/renderer/src/api/bloomCanvasClient.ts`

- [ ] **步骤 1：编写失败的 preload 测试**

在 `src/preload/index.test.ts` 中新增断言：

```ts
test('exposes logo project and prompt APIs', () => {
  expect(window.bloomCanvas.logoProjects.list).toBeTypeOf('function')
  expect(window.bloomCanvas.logoProjects.save).toBeTypeOf('function')
  expect(window.bloomCanvas.logoProjects.get).toBeTypeOf('function')
  expect(window.bloomCanvas.logoPrompt.build).toBeTypeOf('function')
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
pnpm test:run src/preload/index.test.ts
```

预期：FAIL，`logoProjects` 未定义。

- [ ] **步骤 3：扩展 IPC 类型**

在 `src/shared/ipc.ts` import 增加：

```ts
BuildLogoPromptPackInput,
LogoProject,
LogoProjectId,
LogoPromptPack,
SaveLogoProjectInput
```

在 `IPC_CHANNELS` 增加：

```ts
logoProjectList: 'logoProject:list',
logoProjectSave: 'logoProject:save',
logoProjectGet: 'logoProject:get',
logoPromptBuild: 'logoPrompt:build'
```

在 `BloomCanvasApi` 增加：

```ts
logoProjects: {
  list: () => Promise<AppResult<LogoProject[]>>
  save: (input: SaveLogoProjectInput) => Promise<AppResult<LogoProject>>
  get: (id: LogoProjectId) => Promise<AppResult<LogoProject>>
}
logoPrompt: {
  build: (input: BuildLogoPromptPackInput) => Promise<AppResult<LogoPromptPack>>
}
```

- [ ] **步骤 4：注册 Main IPC**

在 `src/main/ipc/registerIpcHandlers.ts` import 增加：

```ts
buildLogoPromptPackSchema,
saveLogoProjectSchema
```

以及：

```ts
import { buildLogoPromptPack } from '../services/logoPromptCompiler'
import { LogoProjectService } from '../services/logoProjectService'
```

在 `registerIpcHandlers()` 中实例化：

```ts
const logoProjects = new LogoProjectService(storage)
```

注册 handlers：

```ts
ipcMain.handle(IPC_CHANNELS.logoProjectList, async () => ok(await logoProjects.list()))

ipcMain.handle(IPC_CHANNELS.logoProjectGet, async (_event, id: string) => {
  try {
    return ok(await logoProjects.get(id))
  } catch (error) {
    return err(toErrorPayload(error))
  }
})

ipcMain.handle(IPC_CHANNELS.logoProjectSave, async (_event, input) => {
  try {
    return ok(await logoProjects.save(saveLogoProjectSchema.parse(input)))
  } catch (error) {
    return err(toErrorPayload(error))
  }
})

ipcMain.handle(IPC_CHANNELS.logoPromptBuild, async (_event, input) => {
  try {
    return ok(buildLogoPromptPack(buildLogoPromptPackSchema.parse(input)))
  } catch (error) {
    return err(toErrorPayload(error))
  }
})
```

在 `generationCreate` handler 成功后，如果 `record.projectId` 存在且 `record.scenario === 'logo-design'`，调用：

```ts
await logoProjects.appendGeneration(record.projectId, record.id)
```

注意要先拿到 `record` 再返回 `ok(record)`。

- [ ] **步骤 5：扩展 Preload 和 Client**

在 `src/preload/index.ts` 的 `bloomCanvasApi` 中增加：

```ts
logoProjects: {
  list: () => ipcRenderer.invoke(IPC_CHANNELS.logoProjectList),
  save: (input) => ipcRenderer.invoke(IPC_CHANNELS.logoProjectSave, input),
  get: (id) => ipcRenderer.invoke(IPC_CHANNELS.logoProjectGet, id)
},
logoPrompt: {
  build: (input) => ipcRenderer.invoke(IPC_CHANNELS.logoPromptBuild, input)
}
```

在 `src/renderer/src/api/bloomCanvasClient.ts` 中增加：

```ts
logoProjects: {
  list: () => unwrapResult(window.bloomCanvas.logoProjects.list()),
  save: (input: Parameters<typeof window.bloomCanvas.logoProjects.save>[0]) =>
    unwrapResult(window.bloomCanvas.logoProjects.save(input)),
  get: (id: string) => unwrapResult(window.bloomCanvas.logoProjects.get(id))
},
logoPrompt: {
  build: (input: Parameters<typeof window.bloomCanvas.logoPrompt.build>[0]) =>
    unwrapResult(window.bloomCanvas.logoPrompt.build(input))
}
```

- [ ] **步骤 6：运行测试验证通过**

运行：

```bash
pnpm test:run src/preload/index.test.ts
pnpm typecheck
```

预期：测试 PASS，typecheck PASS。

- [ ] **步骤 7：Commit**

```bash
git add src/shared/ipc.ts src/main/ipc/registerIpcHandlers.ts src/preload/index.ts src/preload/index.d.ts src/preload/index.test.ts src/renderer/src/api/bloomCanvasClient.ts
git commit -m "feat: expose logo design APIs"
```

---

## 任务 7：扩展工作台状态和场景切换

**文件：**
- 修改：`src/renderer/src/state/workbenchStore.ts`
- 修改：`src/renderer/src/components/AppShell.tsx`
- 修改：`src/renderer/src/components/AppShell.test.tsx`

- [ ] **步骤 1：编写失败的 AppShell 测试**

在 `src/renderer/src/components/AppShell.test.tsx` 中新增：

```tsx
test('switches between general creation and logo design scenes', async () => {
  render(<AppShell />)

  expect(await screen.findByText('通用创作')).toBeInTheDocument()
  await userEvent.click(screen.getByText('Logo 设计'))

  expect(await screen.findByText('Logo 项目')).toBeInTheDocument()
  expect(screen.getByText('品牌简报')).toBeInTheDocument()
})
```

如果现有测试未配置 `userEvent`，添加：

```ts
import userEvent from '@testing-library/user-event'
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
pnpm test:run src/renderer/src/components/AppShell.test.tsx
```

预期：FAIL，找不到 `Logo 设计`。

- [ ] **步骤 3：扩展 workbench store**

在 `src/renderer/src/state/workbenchStore.ts` 中 import 增加 `LogoProject`：

```ts
import type { AppSettings, GenerationRecord, LogoProject, ProviderConfig } from '../../../shared/types'
```

扩展 `WorkbenchState`：

```ts
activeScene: 'general' | 'logo-design'
logoProjects: LogoProject[]
selectedLogoProject: LogoProject | null
setActiveScene: (scene: 'general' | 'logo-design') => void
selectLogoProject: (project: LogoProject | null) => void
refreshLogoProjects: () => Promise<void>
```

新增 state：

```ts
const [activeScene, setActiveScene] = useState<'general' | 'logo-design'>('general')
const [logoProjects, setLogoProjects] = useState<LogoProject[]>([])
const [selectedLogoProject, setSelectedLogoProject] = useState<LogoProject | null>(null)
```

在 `refresh()` 的 Promise.all 中增加：

```ts
bloomCanvasClient.logoProjects.list()
```

并更新：

```ts
setLogoProjects(nextLogoProjects)
setSelectedLogoProject((current) => {
  if (!current) return nextLogoProjects[0] ?? null
  return nextLogoProjects.find((item) => item.id === current.id) ?? nextLogoProjects[0] ?? null
})
```

新增：

```ts
const refreshLogoProjects = useCallback(async () => {
  const nextLogoProjects = await bloomCanvasClient.logoProjects.list()
  setLogoProjects(nextLogoProjects)
  setSelectedLogoProject((current) => {
    if (!current) return nextLogoProjects[0] ?? null
    return nextLogoProjects.find((item) => item.id === current.id) ?? nextLogoProjects[0] ?? null
  })
}, [])
```

- [ ] **步骤 4：在 AppShell 加场景切换的最小可测 UI 骨架**

在 `AppShell.tsx` header controls 中加入 antd `Segmented`：

```tsx
<Segmented
  options={[
    { label: '通用创作', value: 'general' },
    { label: 'Logo 设计', value: 'logo-design' }
  ]}
  value={activeScene}
  onChange={(value) => setActiveScene(value as 'general' | 'logo-design')}
/>
```

Logo 场景先渲染能被测试识别的最小 UI 骨架：

```tsx
{activeScene === 'general' ? (
  <div className="workspace-grid">...</div>
) : (
  <div className="workspace-grid logo-workspace-grid">
    <aside className="history-panel">Logo 项目</aside>
    <main className="gallery-panel">Logo 结果</main>
    <aside className="creation-panel">品牌简报</aside>
  </div>
)}
```

- [ ] **步骤 5：运行测试验证通过**

运行：

```bash
pnpm test:run src/renderer/src/components/AppShell.test.tsx
pnpm typecheck
```

预期：测试 PASS，typecheck PASS。

- [ ] **步骤 6：Commit**

```bash
git add src/renderer/src/state/workbenchStore.ts src/renderer/src/components/AppShell.tsx src/renderer/src/components/AppShell.test.tsx
git commit -m "feat: add logo design workspace scene"
```

---

## 任务 8：实现 Logo 项目列表组件

**文件：**
- 创建：`src/renderer/src/components/logo/LogoProjectPanel.tsx`
- 创建：`src/renderer/src/components/logo/LogoProjectPanel.test.tsx`
- 修改：`src/renderer/src/components/AppShell.tsx`

- [ ] **步骤 1：编写失败的组件测试**

创建 `src/renderer/src/components/logo/LogoProjectPanel.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import type { LogoProject } from '../../../../shared/types'
import { LogoProjectPanel } from './LogoProjectPanel'

const project: LogoProject = {
  id: 'project-1',
  brandName: '生花',
  industry: 'AI 绘图软件',
  businessDescription: '帮助创作者生成图片',
  brandKeywords: ['清晰'],
  preferredColors: [],
  avoidedColors: [],
  logoTypes: ['combination-mark'],
  styleDirections: ['modern-minimal'],
  usageScenarios: [],
  referenceImageIds: [],
  generationIds: [],
  favoriteVariantIds: [],
  createdAt: '2026-07-09T00:00:00.000Z',
  updatedAt: '2026-07-09T00:00:00.000Z'
}

describe('LogoProjectPanel', () => {
  test('renders projects and selects one', async () => {
    const onSelect = vi.fn()
    render(
      <LogoProjectPanel
        projects={[project]}
        selectedId={null}
        onCreateNew={vi.fn()}
        onSelect={onSelect}
      />
    )

    await userEvent.click(screen.getByText('生花'))

    expect(screen.getByText('AI 绘图软件')).toBeInTheDocument()
    expect(onSelect).toHaveBeenCalledWith(project)
  })
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
pnpm test:run src/renderer/src/components/logo/LogoProjectPanel.test.tsx
```

预期：FAIL，组件不存在。

- [ ] **步骤 3：实现组件**

创建 `src/renderer/src/components/logo/LogoProjectPanel.tsx`：

```tsx
import { PlusOutlined } from '@ant-design/icons'
import { Button, Empty, List, Typography } from 'antd'
import type { LogoProject } from '../../../../shared/types'

interface LogoProjectPanelProps {
  projects: LogoProject[]
  selectedId: string | null
  onCreateNew: () => void
  onSelect: (project: LogoProject) => void
}

export function LogoProjectPanel({
  projects,
  selectedId,
  onCreateNew,
  onSelect
}: LogoProjectPanelProps): React.JSX.Element {
  return (
    <aside className="history-panel logo-project-panel">
      <div className="panel-header">
        <Typography.Text strong>Logo 项目</Typography.Text>
        <Button icon={<PlusOutlined />} size="small" type="primary" onClick={onCreateNew}>
          新建
        </Button>
      </div>
      {projects.length === 0 ? (
        <Empty description="还没有 Logo 项目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={projects}
          renderItem={(project) => (
            <List.Item
              className={project.id === selectedId ? 'history-item selected' : 'history-item'}
              onClick={() => onSelect(project)}
            >
              <List.Item.Meta
                title={project.brandName}
                description={`${project.industry} · ${project.styleDirections.length} 个方向`}
              />
            </List.Item>
          )}
        />
      )}
    </aside>
  )
}
```

- [ ] **步骤 4：接入 AppShell**

在 Logo 场景左栏用 `LogoProjectPanel` 替换最小 UI 骨架，`onCreateNew` 先执行：

```ts
selectLogoProject(null)
```

- [ ] **步骤 5：运行测试验证通过**

运行：

```bash
pnpm test:run src/renderer/src/components/logo/LogoProjectPanel.test.tsx src/renderer/src/components/AppShell.test.tsx
pnpm typecheck
```

预期：测试 PASS，typecheck PASS。

- [ ] **步骤 6：Commit**

```bash
git add src/renderer/src/components/logo/LogoProjectPanel.tsx src/renderer/src/components/logo/LogoProjectPanel.test.tsx src/renderer/src/components/AppShell.tsx
git commit -m "feat: show logo project list"
```

---

## 任务 9：实现 Logo 表单和提示词包预览

**文件：**
- 创建：`src/renderer/src/components/logo/logoConstants.ts`
- 创建：`src/renderer/src/components/logo/LogoPromptPreview.tsx`
- 创建：`src/renderer/src/components/logo/LogoCreationPanel.tsx`
- 创建：`src/renderer/src/components/logo/LogoCreationPanel.test.tsx`
- 修改：`src/renderer/src/components/AppShell.tsx`

- [ ] **步骤 1：编写失败的表单测试**

创建 `src/renderer/src/components/logo/LogoCreationPanel.test.tsx`：

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from 'antd'
import { describe, expect, test, vi } from 'vitest'
import { LogoCreationPanel } from './LogoCreationPanel'

vi.mock('../../api/bloomCanvasClient', () => ({
  bloomCanvasClient: {
    logoProjects: {
      save: vi.fn(async (input) => ({ ...input, id: 'project-1', generationIds: [] }))
    },
    logoPrompt: {
      build: vi.fn(async () => ({
        basePrompt: 'base prompt simple scalable logo works at 32px',
        directions: [
          {
            id: 'modern-minimal',
            name: '现代极简',
            prompt: 'modern prompt',
            finalPrompt: 'base prompt\\nmodern prompt'
          }
        ]
      }))
    },
    generations: {
      create: vi.fn()
    }
  }
}))

describe('LogoCreationPanel', () => {
  test('builds a prompt pack before image generation', async () => {
    render(
      <App>
        <LogoCreationPanel
          activeProvider={{ id: 'provider-1', name: 'Provider', baseUrl: '', imageModel: '', promptModel: '', hasApiKey: true, createdAt: '', updatedAt: '' }}
          project={null}
          referenceAssets={[]}
          settings={null}
          onCreated={vi.fn()}
          onError={vi.fn()}
          onGeneratingChange={vi.fn()}
          onNeedProvider={vi.fn()}
          onProjectSaved={vi.fn()}
          onReferenceAssetsChange={vi.fn()}
        />
      </App>
    )

    await userEvent.type(screen.getByLabelText('品牌名'), '生花')
    await userEvent.type(screen.getByLabelText('行业'), 'AI 绘图软件')
    await userEvent.type(screen.getByLabelText('业务描述'), '帮助创作者生成图片')
    await userEvent.type(screen.getByLabelText('品牌关键词'), '清晰')
    await userEvent.click(screen.getByText('生成/更新提示词'))

    await waitFor(() => expect(screen.getByText('提示词预览')).toBeInTheDocument())
    expect(screen.getByDisplayValue(/base prompt/)).toBeInTheDocument()
  })
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
pnpm test:run src/renderer/src/components/logo/LogoCreationPanel.test.tsx
```

预期：FAIL，组件不存在。

- [ ] **步骤 3：创建 Logo 常量**

创建 `src/renderer/src/components/logo/logoConstants.ts`：

```ts
export const logoTypeOptions = [
  { label: '组合标', value: 'combination-mark' },
  { label: '图形标', value: 'symbol-mark' },
  { label: '字体标', value: 'wordmark' },
  { label: '字母标', value: 'lettermark' },
  { label: '徽章标', value: 'emblem' }
] as const

export const logoStyleDirectionOptions = [
  { label: '现代极简', value: 'modern-minimal' },
  { label: '图形符号', value: 'symbolic-mark' },
  { label: '字体标', value: 'wordmark' },
  { label: '字母标', value: 'lettermark' },
  { label: '徽章式', value: 'emblem' },
  { label: '科技感', value: 'tech' },
  { label: '亲和圆润', value: 'friendly-rounded' },
  { label: '东方现代', value: 'eastern-modern' },
  { label: '高端克制', value: 'premium-restraint' }
] as const

export const defaultLogoStyleDirections = ['modern-minimal', 'symbolic-mark', 'wordmark'] as const

export const logoUsageScenarioOptions = [
  { label: 'App 图标', value: 'app-icon' },
  { label: '网站', value: 'website' },
  { label: '电商', value: 'ecommerce' },
  { label: '包装', value: 'packaging' },
  { label: '门店招牌', value: 'storefront' },
  { label: '社媒头像', value: 'social-avatar' }
] as const
```

- [ ] **步骤 4：实现 LogoPromptPreview**

创建 `src/renderer/src/components/logo/LogoPromptPreview.tsx`：

```tsx
import { Collapse, Form, Input, Typography } from 'antd'
import type { LogoPromptPack } from '../../../../shared/types'

interface LogoPromptPreviewProps {
  promptPack: LogoPromptPack | null
}

export function LogoPromptPreview({ promptPack }: LogoPromptPreviewProps): React.JSX.Element | null {
  if (!promptPack) return null

  return (
    <section className="logo-prompt-preview">
      <Typography.Text strong>提示词预览</Typography.Text>
      <Form.Item label="公共提示词" name={['promptPack', 'basePrompt']}>
        <Input.TextArea autoSize={{ minRows: 4, maxRows: 8 }} />
      </Form.Item>
      <Collapse
        size="small"
        items={promptPack.directions.map((direction, index) => ({
          key: direction.id,
          label: direction.name,
          children: (
            <>
              <Form.Item name={['promptPack', 'directions', index, 'id']} hidden>
                <Input />
              </Form.Item>
              <Form.Item name={['promptPack', 'directions', index, 'name']} hidden>
                <Input />
              </Form.Item>
              <Form.Item label="方向提示词" name={['promptPack', 'directions', index, 'prompt']}>
                <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} />
              </Form.Item>
              <Form.Item label="最终提示词" name={['promptPack', 'directions', index, 'finalPrompt']}>
                <Input.TextArea autoSize={{ minRows: 5, maxRows: 10 }} />
              </Form.Item>
            </>
          )
        }))}
      />
    </section>
  )
}
```

- [ ] **步骤 5：实现 LogoCreationPanel**

创建 `src/renderer/src/components/logo/LogoCreationPanel.tsx`。组件必须：

- 初始风格方向为 `defaultLogoStyleDirections`。
- 风格方向最多选择 4 个。
- 点击 `生成/更新提示词` 时调用 `bloomCanvasClient.logoPrompt.build()`，然后 `form.setFieldValue('promptPack', pack)`。
- 点击 `生成 Logo 初稿` 时先保存项目，再对 `promptPack.directions` 逐个调用 `generations.create()`。
- 每个方向的 `CreateGenerationInput.prompt` 使用该方向 `finalPrompt`。
- `scenarioMetadata.promptPackSnapshot` 使用用户确认后的整个 `promptPack`。
- `referenceAssetIds` 使用项目参考图。

核心提交逻辑：

```ts
async function generateLogoDrafts(): Promise<void> {
  if (!activeProvider?.hasApiKey) {
    onNeedProvider()
    return
  }
  const values = await form.validateFields()
  const promptPack = values.promptPack ?? (await buildPromptPack())
  const savedProject = await bloomCanvasClient.logoProjects.save({ ...values, promptPack })
  onProjectSaved(savedProject)

  onGeneratingChange(true)
  try {
    for (const direction of promptPack.directions) {
      const record = await bloomCanvasClient.generations.create({
        providerId: activeProvider.id,
        prompt: direction.finalPrompt,
        useOptimizedPrompt: false,
        referenceAssetIds: referenceAssets.map((asset) => asset.id),
        parameters: {
          size: values.size,
          count: values.count,
          quality: values.quality,
          outputFormat: values.outputFormat
        },
        scenario: 'logo-design',
        projectId: savedProject.id,
        scenarioMetadata: {
          logoProjectId: savedProject.id,
          styleDirectionId: direction.id,
          styleDirectionName: direction.name,
          logoTypes: values.logoTypes,
          promptPackSnapshot: promptPack,
          finalPrompt: direction.finalPrompt,
          briefSnapshot: {
            brandName: values.brandName,
            brandNameAlt: values.brandNameAlt,
            shortName: values.shortName,
            slogan: values.slogan,
            industry: values.industry,
            businessDescription: values.businessDescription,
            targetAudience: values.targetAudience,
            brandKeywords: values.brandKeywords,
            differentiator: values.differentiator,
            avoidElements: values.avoidElements,
            preferredColors: values.preferredColors,
            avoidedColors: values.avoidedColors,
            usageScenarios: values.usageScenarios,
            referenceNote: values.referenceNote
          },
          qualityRulesVersion: 1
        }
      })
      await onCreated(record)
    }
  } finally {
    onGeneratingChange(false)
  }
}
```

- [ ] **步骤 6：接入 AppShell**

Logo 场景右栏用 `LogoCreationPanel` 替换最小 UI 骨架。`onProjectSaved` 后调用 `refreshLogoProjects()` 并选中保存后的项目。

- [ ] **步骤 7：运行测试验证通过**

运行：

```bash
pnpm test:run src/renderer/src/components/logo/LogoCreationPanel.test.tsx src/renderer/src/components/AppShell.test.tsx
pnpm typecheck
```

预期：测试 PASS，typecheck PASS。

- [ ] **步骤 8：Commit**

```bash
git add src/renderer/src/components/logo/logoConstants.ts src/renderer/src/components/logo/LogoPromptPreview.tsx src/renderer/src/components/logo/LogoCreationPanel.tsx src/renderer/src/components/logo/LogoCreationPanel.test.tsx src/renderer/src/components/AppShell.tsx
git commit -m "feat: add logo prompt workflow UI"
```

---

## 任务 10：实现 Logo 结果分组和小尺寸检查

**文件：**
- 创建：`src/renderer/src/components/logo/LogoUsabilityPreview.tsx`
- 创建：`src/renderer/src/components/logo/LogoUsabilityPreview.test.tsx`
- 创建：`src/renderer/src/components/logo/LogoResultsPanel.tsx`
- 创建：`src/renderer/src/components/logo/LogoResultsPanel.test.tsx`
- 修改：`src/renderer/src/components/AppShell.tsx`

- [ ] **步骤 1：编写失败的小尺寸预览测试**

创建 `src/renderer/src/components/logo/LogoUsabilityPreview.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { Asset } from '../../../../shared/types'
import { LogoUsabilityPreview } from './LogoUsabilityPreview'

const asset: Asset = {
  id: 'asset-1',
  type: 'output',
  filePath: '/tmp/logo.png',
  thumbnailPath: '/tmp/logo-thumb.png',
  mimeType: 'image/png',
  width: 1024,
  height: 1024,
  size: 100,
  sha256: 'hash',
  createdAt: '2026-07-09T00:00:00.000Z'
}

describe('LogoUsabilityPreview', () => {
  test('renders white, black, 64px, and 32px checks', () => {
    render(<LogoUsabilityPreview asset={asset} />)

    expect(screen.getByText('白底')).toBeInTheDocument()
    expect(screen.getByText('黑底')).toBeInTheDocument()
    expect(screen.getByText('64px')).toBeInTheDocument()
    expect(screen.getByText('32px')).toBeInTheDocument()
  })
})
```

- [ ] **步骤 2：编写失败的结果分组测试**

创建 `src/renderer/src/components/logo/LogoResultsPanel.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import type { GenerationRecord } from '../../../../shared/types'
import { LogoResultsPanel } from './LogoResultsPanel'

function logoRecord(directionId: string, directionName: string): GenerationRecord {
  return {
    id: `generation-${directionId}`,
    mode: 'text-to-image',
    scenario: 'logo-design',
    projectId: 'project-1',
    scenarioMetadata: {
      logoProjectId: 'project-1',
      styleDirectionId: directionId as never,
      styleDirectionName: directionName,
      logoTypes: ['combination-mark'],
      promptPackSnapshot: {
        basePrompt: 'base prompt',
        directions: []
      },
      finalPrompt: 'final prompt',
      briefSnapshot: {
        brandName: '生花',
        industry: 'AI 绘图软件',
        businessDescription: '帮助创作者生成图片',
        brandKeywords: ['清晰']
      },
      qualityRulesVersion: 1
    },
    promptOriginal: 'final prompt',
    promptFinal: 'final prompt',
    referenceImageIds: [],
    parameters: { size: '1024x1024', count: 1, quality: 'standard', outputFormat: 'png' },
    outputVariantIds: [],
    providerId: 'provider-1',
    status: 'succeeded',
    favorite: false,
    createdAt: '2026-07-09T00:00:00.000Z',
    updatedAt: '2026-07-09T00:00:00.000Z',
    references: [],
    variants: []
  }
}

describe('LogoResultsPanel', () => {
  test('groups logo generations by style direction', () => {
    render(
      <LogoResultsPanel
        generating={false}
        generations={[
          logoRecord('modern-minimal', '现代极简'),
          logoRecord('symbolic-mark', '图形符号')
        ]}
        selectedProjectId="project-1"
        onContinueEdit={vi.fn()}
        onExport={vi.fn()}
        onRetry={vi.fn()}
      />
    )

    expect(screen.getByText('现代极简')).toBeInTheDocument()
    expect(screen.getByText('图形符号')).toBeInTheDocument()
  })
})
```

- [ ] **步骤 3：运行测试验证失败**

运行：

```bash
pnpm test:run src/renderer/src/components/logo/LogoUsabilityPreview.test.tsx src/renderer/src/components/logo/LogoResultsPanel.test.tsx
```

预期：FAIL，组件不存在。

- [ ] **步骤 4：实现 LogoUsabilityPreview**

创建 `src/renderer/src/components/logo/LogoUsabilityPreview.tsx`：

```tsx
import { Image, Typography } from 'antd'
import type { Asset } from '../../../../shared/types'
import { assetProtocolUrl } from '../../../../shared/assetProtocol'

interface LogoUsabilityPreviewProps {
  asset: Asset
}

export function LogoUsabilityPreview({ asset }: LogoUsabilityPreviewProps): React.JSX.Element {
  const src = assetProtocolUrl(asset.id)

  return (
    <div className="logo-usability-preview">
      {[
        { label: '白底', className: 'logo-check-white', size: 96 },
        { label: '黑底', className: 'logo-check-black', size: 96 },
        { label: '64px', className: 'logo-check-white', size: 64 },
        { label: '32px', className: 'logo-check-white', size: 32 }
      ].map((item) => (
        <div className="logo-check-cell" key={item.label}>
          <div className={item.className}>
            <Image
              alt={item.label}
              preview={false}
              src={src}
              style={{ height: item.size, objectFit: 'contain', width: item.size }}
            />
          </div>
          <Typography.Text type="secondary">{item.label}</Typography.Text>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **步骤 5：实现 LogoResultsPanel**

创建 `src/renderer/src/components/logo/LogoResultsPanel.tsx`。核心逻辑：

```tsx
const projectGenerations = generations.filter(
  (generation) => generation.scenario === 'logo-design' && generation.projectId === selectedProjectId
)

const groups = projectGenerations.reduce<Record<string, GenerationRecord[]>>((acc, generation) => {
  const key = generation.scenarioMetadata?.styleDirectionName ?? '未分类方向'
  acc[key] = [...(acc[key] ?? []), generation]
  return acc
}, {})
```

每组渲染标题和该方向下的 variants。复用 `assetProtocolUrl()` 展示图片。每个图片下方提供：

- `继续修改`
- `导出`
- `重新生成`
- `可用性检查` 折叠区域，内部渲染 `LogoUsabilityPreview`

- [ ] **步骤 6：接入 AppShell**

Logo 场景中间区域用：

```tsx
<LogoResultsPanel
  generating={generating}
  generations={generations}
  selectedProjectId={selectedLogoProject?.id ?? null}
  onContinueEdit={handleContinueEdit}
  onExport={handleExport}
  onRetry={handleRetry}
/>
```

- [ ] **步骤 7：运行测试验证通过**

运行：

```bash
pnpm test:run src/renderer/src/components/logo/LogoUsabilityPreview.test.tsx src/renderer/src/components/logo/LogoResultsPanel.test.tsx src/renderer/src/components/AppShell.test.tsx
pnpm typecheck
```

预期：测试 PASS，typecheck PASS。

- [ ] **步骤 8：Commit**

```bash
git add src/renderer/src/components/logo/LogoUsabilityPreview.tsx src/renderer/src/components/logo/LogoUsabilityPreview.test.tsx src/renderer/src/components/logo/LogoResultsPanel.tsx src/renderer/src/components/logo/LogoResultsPanel.test.tsx src/renderer/src/components/AppShell.tsx
git commit -m "feat: group logo results by direction"
```

---

## 任务 11：样式、集成验证和回归检查

**文件：**
- 修改：`src/renderer/src/assets/main.css`
- 按需要修改前面任务引入的组件样式 class

- [ ] **步骤 1：补充样式**

在 `src/renderer/src/assets/main.css` 增加 Logo 场景样式：

```css
.logo-workspace-grid {
  grid-template-columns: 260px minmax(0, 1fr) 420px;
}

.logo-project-panel .ant-list-item {
  cursor: pointer;
}

.logo-prompt-preview {
  display: grid;
  gap: 12px;
}

.logo-direction-group {
  display: grid;
  gap: 12px;
}

.logo-direction-header {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.logo-usability-preview {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(72px, 1fr));
}

.logo-check-cell {
  align-items: center;
  display: grid;
  gap: 6px;
  justify-items: center;
}

.logo-check-white,
.logo-check-black {
  align-items: center;
  aspect-ratio: 1;
  border: 1px solid var(--app-border);
  display: flex;
  justify-content: center;
  width: 100%;
}

.logo-check-white {
  background: #fff;
}

.logo-check-black {
  background: #111;
}

@media (max-width: 1180px) {
  .logo-workspace-grid {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .logo-workspace-grid .creation-panel {
    grid-column: 1 / -1;
  }
}
```

- [ ] **步骤 2：运行完整自动化验证**

运行：

```bash
pnpm typecheck
pnpm test:run
pnpm lint
pnpm build
```

预期：

- typecheck exit 0。
- Vitest 所有测试 PASS。
- ESLint exit 0。
- production build exit 0。

- [ ] **步骤 3：启动开发服务手动验证**

运行：

```bash
pnpm dev
```

预期：Electron 应用打开。手动验证：

- 顶部可在 `通用创作` 和 `Logo 设计` 间切换。
- 通用创作现有文生图、参考图、继续修改入口仍显示。
- Logo 设计可以填写必填字段。
- 点击 `生成/更新提示词` 后出现提示词预览。
- 提示词包含简洁、可缩放、小尺寸可读、避免细碎元素等规则。
- 点击 `生成 Logo 初稿` 后按风格方向创建生成记录。
- Logo 结果区按方向分组。
- 可用性检查显示白底、黑底、64px、32px。

- [ ] **步骤 4：检查 git diff 范围**

运行：

```bash
git status --short
git diff --stat
```

预期：只包含 Logo 设计专题相关文件。

- [ ] **步骤 5：Commit**

```bash
git add src/renderer/src/assets/main.css
git commit -m "style: polish logo design workspace"
```

---

## 自检清单

- 规格覆盖度：
  - Logo 轻项目：任务 1、2、4、6、8。
  - 真实设计流程压缩为品牌简报、方向选择、提示词确认、初稿探索、继续修改、可用性检查：任务 3、7、9、10。
  - 生成前提示词包：任务 1、3、4、9。
  - 多方向生成：任务 3、9、10。
  - 简洁可缩放硬规则：任务 3、9、10。
  - 32px/64px、白底/黑底检查：任务 10。
  - 通用创作不受影响：任务 7、11。
- 红旗词扫描：计划中不应存在未完成标记、模糊替代步骤或没有实际代码内容的步骤。
- 类型一致性：
  - `LogoPromptPack.directions` 在类型、schema、编译器、UI 中保持一致。
  - `scenarioMetadata.finalPrompt` 与 `CreateGenerationInput.prompt` 使用同一方向最终提示词。
  - `LogoProject.promptPack` 保存用户确认后的提示词包。
- 验证命令：
  - 每个任务局部运行相关测试。
  - 最后运行 `pnpm typecheck && pnpm test:run && pnpm lint && pnpm build`。
