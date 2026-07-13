# Logo 策略核心实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 把 Logo 简报转换为三份有品牌依据、构形机制不同且可直接生图的设计策略，并可靠保存简报、策略和 Prompt 的版本关系。

**架构：** 新增独立的 Logo 领域模块，静态语法库和所有纯校验留在 Main 进程可测试模块中；策略服务通过用户当前 Provider 的提示词模型调用 OpenAI-compatible Responses API。现有风格方向接口暂时保留以兼容旧项目，新接口以 `LogoDesignRevision` 和 `LogoStrategyPromptPack` 并行接入，第二份计划再切换 Renderer。

**技术栈：** Electron 39、TypeScript 5、Zod 4、Vitest、OpenAI-compatible Responses API、现有 JSON `StorageService`。

**测试夹具：** 任务 1 创建 `src/shared/logoDesign.testFixtures.ts`。后续测试中的 `brief`、`semantics`、`revision`、`strategyPromptPack`、`provider`、`strategy()` 分别使用该文件的 `logoTestBrief`、`logoTestSemantics`、`logoTestRevision`、`logoTestPromptPack`、`logoTestProvider`、`logoTestStrategy()`；测试只覆盖自身差异，避免重复维护大对象。

---

## 文件结构

- 创建：`src/shared/logoDesign.ts`
  - 定义语法 ID、表现风格、品牌简报、语义地图、策略、版本、Prompt 包和策略 IPC 输入。
- 创建：`src/shared/logoDesign.testFixtures.ts`
  - 为 Main、Preload 和 Renderer 测试提供一套类型一致的简报、策略、revision、Prompt 包和 Provider。
- 修改：`src/shared/types.ts`
  - 重新导出 Logo 领域类型；给 `LogoProject` 增加可选的 V2 版本字段，保持旧项目可读。
- 修改：`src/shared/schemas.ts`
  - 增加 V2 简报、策略、版本、Prompt 包和策略请求 Schema。
- 修改：`src/shared/schemas.test.ts`
  - 验证完整策略、非法语法 ID、数量和版本约束。
- 创建：`src/main/logo/logoGrammarLibrary.ts`
  - 保存 14 张版本化静态语法卡，不包含第三方图片和品牌名。
- 创建：`src/main/logo/logoGrammarLibrary.test.ts`
  - 验证语法卡字段、ID 唯一和 Logo 类型覆盖。
- 创建：`src/main/logo/logoBriefNormalizer.ts`
  - 清理简报字段、计算稳定指纹、生成动态反俗套规则和语义种子。
- 创建：`src/main/logo/logoBriefNormalizer.test.ts`
  - 覆盖花、BI、AI、安全、物流、环保等字面风险。
- 创建：`src/main/logo/logoStrategyValidator.ts`
  - 校验品牌依据、语法适配和三个策略的多样性。
- 创建：`src/main/logo/logoStrategyValidator.test.ts`
  - 覆盖重复语法、重复隐喻、无品牌依据和单策略替换。
- 创建：`src/main/services/openAIResponsesClient.ts`
  - 集中发送 Responses 文本请求并解析 `output_text` 或嵌套 `output[].content[]`。
- 创建：`src/main/services/openAIResponsesClient.test.ts`
  - 覆盖两种响应形态和供应商错误。
- 创建：`src/main/logo/logoStrategyService.ts`
  - 生成三份结构化策略；无效 JSON 或校验失败时只修复一次。
- 创建：`src/main/logo/logoStrategyService.test.ts`
  - 覆盖成功、一次修复、二次失败和替换单个策略。
- 重构：`src/main/services/logoPromptCompiler.ts`
  - 保留旧 `buildLogoPromptPack()`，新增按具体策略编译的 `buildLogoStrategyPromptPack()`。
- 修改：`src/main/services/logoPromptCompiler.test.ts`
  - 覆盖单标志、文字路由、动态禁忌和表现风格边界。
- 修改：`src/main/services/logoProjectService.ts`
  - 根据完整简报指纹递增版本，并把旧策略显式保留为过期版本。
- 修改：`src/main/services/logoProjectService.test.ts`
  - 验证简报变化、仅颜色变化和未变化三种版本行为。
- 修改：`src/shared/ipc.ts`
  - 增加 `logoStrategy:generate` 和 `logoPrompt:buildStrategy`。
- 修改：`src/preload/index.ts`
- 修改：`src/preload/index.test.ts`
- 修改：`src/renderer/src/api/bloomCanvasClient.ts`
- 修改：`src/main/ipc/registerIpcHandlers.ts`
  - 打通策略生成和 V2 Prompt 编译的 typed IPC。

## 任务 1：建立 Logo V2 共享类型与 Schema

**文件：**
- 创建：`src/shared/logoDesign.ts`
- 修改：`src/shared/types.ts`
- 修改：`src/shared/schemas.ts`
- 修改：`src/shared/schemas.test.ts`

- [ ] **步骤 1：先写失败的 Schema 测试**

在 `src/shared/schemas.test.ts` 增加：

```ts
import { describe, expect, test } from 'vitest'
import { logoDesignRevisionSchema, logoStrategyPromptPackSchema } from './schemas'

const validStrategy = {
  id: 'strategy-path',
  version: 1,
  nameZh: '连续创作路径',
  summaryZh: '用一条展开路径表达从想法到画面的过程。',
  grammarId: 'continuous-path',
  brandEvidence: ['帮助创作者把想法转化为图片'],
  coreMetaphor: 'an unfolding creative path',
  construction: 'one broad continuous ribbon with two turns',
  silhouette: 'compact open loop',
  composition: 'centered with a stable lower-left visual anchor',
  colorPlan: 'one solid blue with a monochrome fallback',
  recommendedRenderStyles: ['flat-monochrome', 'flat-duotone'],
  exclusions: ['flower petals', 'leaves', 'pseudo-text'],
  rationaleZh: '连续路径对应创作流程，不依赖品牌名中的花。',
  imagePromptEn: 'Create exactly one standalone logo mark.'
} as const

test('accepts a complete three-strategy design revision', () => {
  const revision = logoDesignRevisionSchema.parse({
    briefVersion: 1,
    strategyVersion: 1,
    grammarLibraryVersion: 1,
    semantics: {
      functionalTruths: ['帮助创作者把想法转化为图片'],
      emotionalQualities: ['清晰', '有创造力'],
      differentiators: ['轻量工作流'],
      audienceSignals: ['个人创作者'],
      usableMetaphors: ['路径', '画布窗口'],
      literalMetaphorRisks: ['花瓣', '叶片'],
      industryCliches: ['AI sparkle', 'robot head'],
      usageConstraints: ['readable at 32px']
    },
    strategies: [
      validStrategy,
      { ...validStrategy, id: 'strategy-frame', grammarId: 'frame-threshold' },
      { ...validStrategy, id: 'strategy-grid', grammarId: 'modular-grid' }
    ],
    selectedStrategyIds: ['strategy-path', 'strategy-frame', 'strategy-grid'],
    createdAt: '2026-07-13T00:00:00.000Z'
  })

  expect(revision.strategies).toHaveLength(3)
})

test('rejects a prompt pack whose source versions are missing', () => {
  expect(() =>
    logoStrategyPromptPackSchema.parse({
      directions: [{ strategyId: 'strategy-path', finalPrompt: 'one logo' }]
    })
  ).toThrow()
})
```

- [ ] **步骤 2：运行测试并确认正确失败**

运行：`pnpm test:run src/shared/schemas.test.ts`

预期：FAIL，提示 `logoDesignRevisionSchema` 和 `logoStrategyPromptPackSchema` 尚未导出。

- [ ] **步骤 3：创建完整领域类型**

在 `src/shared/logoDesign.ts` 写入以下公开契约：

```ts
export type LogoType =
  | 'symbol-mark'
  | 'wordmark'
  | 'combination-mark'
  | 'lettermark'
  | 'emblem'

export type LogoUsageScenario =
  | 'app-icon'
  | 'website'
  | 'ecommerce'
  | 'packaging'
  | 'storefront'
  | 'social-avatar'

export type LogoGrammarId =
  | 'negative-space-fusion'
  | 'monogram-synthesis'
  | 'semantic-hybrid'
  | 'continuous-path'
  | 'modular-grid'
  | 'interlocking-units'
  | 'frame-threshold'
  | 'fold-unfold'
  | 'radial-core'
  | 'signal-rhythm'
  | 'custom-wordmark'
  | 'symbol-as-system'
  | 'simplified-character'
  | 'dynamic-aperture'

export type LogoRenderStyle =
  | 'flat-monochrome'
  | 'flat-duotone'
  | 'restrained-gradient'
  | 'bold-outline'
  | 'soft-2.5d'
  | 'soft-volume'
  | 'embossed'
  | 'skeuomorphic'

export interface LogoBrandBriefV2 {
  brandName: string
  brandNameAlt?: string
  shortName?: string
  industry: string
  businessDescription: string
  targetAudience?: string
  brandKeywords: string[]
  differentiator?: string
  avoidedElements: string[]
  preferredColors: string[]
  avoidedColors: string[]
  logoType: LogoType
  usageScenarios: LogoUsageScenario[]
  referenceNote?: string
}

export interface LogoBrandSemantics {
  functionalTruths: string[]
  emotionalQualities: string[]
  differentiators: string[]
  audienceSignals: string[]
  usableMetaphors: string[]
  literalMetaphorRisks: string[]
  industryCliches: string[]
  usageConstraints: string[]
}

export interface LogoGrammarCard {
  id: LogoGrammarId
  nameZh: string
  mechanism: string
  fitSignals: string[]
  conflictSignals: string[]
  allowedLogoTypes: LogoType[]
  constructionRules: string[]
  antiPatterns: string[]
  promptFragments: string[]
  reviewRules: string[]
  sourceRefs: string[]
}

export interface LogoDesignStrategy {
  id: string
  version: number
  nameZh: string
  summaryZh: string
  grammarId: LogoGrammarId
  brandEvidence: string[]
  coreMetaphor: string
  construction: string
  silhouette: string
  composition: string
  colorPlan: string
  recommendedRenderStyles: LogoRenderStyle[]
  exclusions: string[]
  rationaleZh: string
  imagePromptEn: string
}

export interface LogoDesignRevision {
  briefVersion: number
  strategyVersion: number
  grammarLibraryVersion: number
  semantics: LogoBrandSemantics
  strategies: LogoDesignStrategy[]
  selectedStrategyIds: string[]
  createdAt: string
}

export interface LogoStrategyPromptDirection {
  strategyId: string
  strategyNameZh: string
  grammarId: LogoGrammarId
  sourceBriefVersion: number
  sourceStrategyVersion: number
  sourcePromptVersion: number
  renderStyle: LogoRenderStyle
  finalPrompt: string
  customized: boolean
}

export interface LogoStrategyPromptPack {
  sourceBriefVersion: number
  sourceStrategyVersion: number
  sourcePromptVersion: number
  grammarLibraryVersion: number
  directions: LogoStrategyPromptDirection[]
}

export interface GenerateLogoStrategiesInput {
  providerId: string
  briefVersion: number
  brief: LogoBrandBriefV2
  existingRevision?: LogoDesignRevision
  replaceStrategyId?: string
}

export interface BuildLogoStrategyPromptPackInput {
  brief: LogoBrandBriefV2
  revision: LogoDesignRevision
  promptVersion: number
  renderStyles?: Partial<Record<string, LogoRenderStyle>>
}
```

从 `src/shared/types.ts` 删除重复的 `LogoType`、`LogoUsageScenario` 定义，改成导入并重新导出；给 `LogoProject` 增加可选字段以兼容磁盘上的旧 JSON，并给 `SaveLogoProjectInput` 增加同名 V2 可选字段：

```ts
import type {
  LogoDesignRevision,
  LogoStrategyPromptPack,
  LogoType,
  LogoUsageScenario
} from './logoDesign'
export type * from './logoDesign'

// LogoProject 内新增：
briefVersion?: number
briefFingerprint?: string
promptVersion?: number
promptFingerprint?: string
avoidedElements?: string[]
designRevision?: LogoDesignRevision
strategyPromptPack?: LogoStrategyPromptPack
```

创建 `src/shared/logoDesign.testFixtures.ts`，后续计划中的 `brief`、`semantics`、`revision`、`strategyPromptPack`、`provider` 均从这里导入，不得在不同测试中手写不一致的字段：

```ts
import type {
  LogoBrandBriefV2,
  LogoBrandSemantics,
  LogoDesignRevision,
  LogoDesignStrategy,
  LogoStrategyPromptPack
} from './logoDesign'
import type { ProviderConfig } from './types'

export const logoTestBrief: LogoBrandBriefV2 = {
  brandName: '生花',
  brandNameAlt: 'BloomCanvas',
  shortName: 'BC',
  industry: 'AI 绘图软件',
  businessDescription: '帮助创作者把想法转化为图片',
  targetAudience: '个人创作者和小团队',
  brandKeywords: ['清晰', '创造力'],
  differentiator: '轻量、直接的创作流程',
  avoidedElements: ['复杂花瓣'],
  preferredColors: ['蓝色'],
  avoidedColors: ['墨绿色'],
  logoType: 'combination-mark',
  usageScenarios: ['app-icon', 'website']
}

export const logoTestSemantics: LogoBrandSemantics = {
  functionalTruths: ['帮助创作者把想法转化为图片'],
  emotionalQualities: ['清晰', '创造力'],
  differentiators: ['轻量、直接的创作流程'],
  audienceSignals: ['个人创作者和小团队'],
  usableMetaphors: ['创作路径', '开放画布'],
  literalMetaphorRisks: ['花瓣', '叶片'],
  industryCliches: ['AI sparkle', 'robot head'],
  usageConstraints: ['readable at 32px', 'works as an app icon']
}

export function logoTestStrategy(
  overrides: Partial<LogoDesignStrategy> = {}
): LogoDesignStrategy {
  return {
    id: 'strategy-path',
    version: 1,
    nameZh: '连续创作路径',
    summaryZh: '用一条展开路径表达从想法到画面的过程。',
    grammarId: 'continuous-path',
    brandEvidence: ['帮助创作者把想法转化为图片'],
    coreMetaphor: 'an unfolding creative path',
    construction: 'one broad continuous ribbon with two turns',
    silhouette: 'compact open loop',
    composition: 'centered with a stable lower-left anchor',
    colorPlan: 'one solid blue with a monochrome fallback',
    recommendedRenderStyles: ['flat-monochrome', 'flat-duotone'],
    exclusions: ['flower petals', 'leaves', 'pseudo-text'],
    rationaleZh: '连续路径对应创作流程，不依赖品牌名中的花。',
    imagePromptEn: 'Create exactly one standalone logo mark.',
    ...overrides
  }
}

export const logoTestRevision: LogoDesignRevision = {
  briefVersion: 1,
  strategyVersion: 1,
  grammarLibraryVersion: 1,
  semantics: logoTestSemantics,
  strategies: [
    logoTestStrategy(),
    logoTestStrategy({
      id: 'strategy-frame',
      nameZh: '开放画布入口',
      grammarId: 'frame-threshold',
      coreMetaphor: 'an open canvas threshold',
      construction: 'one bold open frame with an offset inner plane'
    }),
    logoTestStrategy({
      id: 'strategy-grid',
      nameZh: '生成模块',
      grammarId: 'modular-grid',
      coreMetaphor: 'small inputs becoming one visual system',
      construction: 'three solid modules aligned into one compact boundary'
    })
  ],
  selectedStrategyIds: ['strategy-path', 'strategy-frame', 'strategy-grid'],
  createdAt: '2026-07-13T00:00:00.000Z'
}

export const logoTestPromptPack: LogoStrategyPromptPack = {
  sourceBriefVersion: 1,
  sourceStrategyVersion: 1,
  sourcePromptVersion: 1,
  grammarLibraryVersion: 1,
  directions: logoTestRevision.strategies.map((strategy) => ({
    strategyId: strategy.id,
    strategyNameZh: strategy.nameZh,
    grammarId: strategy.grammarId,
    sourceBriefVersion: 1,
    sourceStrategyVersion: strategy.version,
    sourcePromptVersion: 1,
    renderStyle: strategy.recommendedRenderStyles[0],
    finalPrompt: `Create exactly one standalone logo mark. ${strategy.construction}`,
    customized: false
  }))
}

export const logoTestProvider: ProviderConfig = {
  id: 'provider-1',
  name: 'OpenAI Compatible',
  baseUrl: 'https://api.example.test/v1',
  imageModel: 'gpt-image-2',
  promptModel: 'gpt-5.5',
  hasApiKey: true,
  createdAt: '2026-07-13T00:00:00.000Z',
  updatedAt: '2026-07-13T00:00:00.000Z'
}
```

- [ ] **步骤 4：增加 Zod Schema**

在 `src/shared/schemas.ts` 增加与上述类型同名的 Schema。枚举必须列出全部 14 个语法 ID 和 8 个表现风格；核心组合如下：

```ts
export const logoDesignStrategySchema = z.object({
  id: z.string().trim().min(1).max(80),
  version: z.number().int().positive(),
  nameZh: z.string().trim().min(1).max(40),
  summaryZh: z.string().trim().min(1).max(240),
  grammarId: logoGrammarIdSchema,
  brandEvidence: z.array(z.string().trim().min(1).max(240)).min(1).max(4),
  coreMetaphor: z.string().trim().min(1).max(240),
  construction: z.string().trim().min(1).max(400),
  silhouette: z.string().trim().min(1).max(240),
  composition: z.string().trim().min(1).max(240),
  colorPlan: z.string().trim().min(1).max(240),
  recommendedRenderStyles: z.array(logoRenderStyleSchema).min(1).max(4),
  exclusions: z.array(z.string().trim().min(1).max(120)).min(1).max(12),
  rationaleZh: z.string().trim().min(1).max(400),
  imagePromptEn: z.string().trim().min(1).max(12000)
})

export const logoDesignRevisionSchema = z.object({
  briefVersion: z.number().int().positive(),
  strategyVersion: z.number().int().positive(),
  grammarLibraryVersion: z.literal(1),
  semantics: logoBrandSemanticsSchema,
  strategies: z.array(logoDesignStrategySchema).length(3),
  selectedStrategyIds: z.array(z.string().min(1)).length(3),
  createdAt: z.string().datetime()
})

export const generateLogoStrategiesSchema = z.object({
  providerId: z.string().min(1),
  briefVersion: z.number().int().positive(),
  brief: logoBrandBriefV2Schema,
  existingRevision: logoDesignRevisionSchema.optional(),
  replaceStrategyId: z.string().min(1).optional()
})
```

同时让 `saveLogoProjectSchema` 接受 `briefVersion`、`briefFingerprint`、`promptVersion`、`promptFingerprint`、`avoidedElements`、`designRevision`、`strategyPromptPack` 可选字段。保留旧 `avoidElements?: string` 只用于兼容已有项目；项目服务首次保存 V2 简报时用逗号、中文逗号、顿号和换行把旧字符串迁移到 `avoidedElements`。`logoStrategyPromptPackSchema` 和 direction Schema 都必须要求正整数 `sourcePromptVersion`。

把 `SaveLogoProjectInput.styleDirections` 改为可选，`saveLogoProjectSchema.styleDirections` 使用 `.max(3).default([])`；`LogoProjectService.save()` 保存 `input.styleDirections ?? existing?.styleDirections ?? []`。不要继续令 `buildLogoPromptPackSchema = saveLogoProjectSchema`：旧 `logoPrompt.build` 单独扩展项目 Schema，并把 `styleDirections` 收紧为 `.min(1).max(3)`，这样旧 UI 保持原行为而 V2 项目不需要伪造风格方向。

- [ ] **步骤 5：验证并提交**

运行：

```bash
pnpm test:run src/shared/schemas.test.ts
pnpm typecheck
```

预期：PASS，且旧 Logo 项目测试仍能编译。

```bash
git add src/shared/logoDesign.ts src/shared/logoDesign.testFixtures.ts src/shared/types.ts src/shared/schemas.ts src/shared/schemas.test.ts
git commit -m "feat: define logo strategy domain model"
```

## 任务 2：实现 14 张设计语法卡

**文件：**
- 创建：`src/main/logo/logoGrammarLibrary.ts`
- 创建：`src/main/logo/logoGrammarLibrary.test.ts`

- [ ] **步骤 1：先写语法库完整性测试**

```ts
import { describe, expect, test } from 'vitest'
import { LOGO_GRAMMAR_LIBRARY_VERSION, logoGrammarCards } from './logoGrammarLibrary'

describe('logoGrammarCards', () => {
  test('contains 14 complete and unique grammar cards', () => {
    expect(LOGO_GRAMMAR_LIBRARY_VERSION).toBe(1)
    expect(logoGrammarCards).toHaveLength(14)
    expect(new Set(logoGrammarCards.map((card) => card.id)).size).toBe(14)
    for (const card of logoGrammarCards) {
      expect(card.allowedLogoTypes.length).toBeGreaterThan(0)
      expect(card.constructionRules.length).toBeGreaterThan(1)
      expect(card.antiPatterns.length).toBeGreaterThan(1)
      expect(card.promptFragments.length).toBeGreaterThan(0)
      expect(card.reviewRules.length).toBeGreaterThan(0)
    }
  })

  test('does not leak source brands into production prompt fragments', () => {
    const productionText = logoGrammarCards
      .flatMap((card) => [card.mechanism, ...card.promptFragments, ...card.constructionRules])
      .join(' ')
    expect(productionText).not.toMatch(/Pentagram|Koto|Conical|Moco|Takanawa/i)
  })
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test:run src/main/logo/logoGrammarLibrary.test.ts`

预期：FAIL，模块不存在。

- [ ] **步骤 3：创建版本化语法库**

在 `logoGrammarLibrary.ts` 导出 `LOGO_GRAMMAR_LIBRARY_VERSION = 1 as const` 和 `logoGrammarCards: LogoGrammarCard[]`。14 张卡必须使用以下机制、核心构形和禁忌，不得把 `sourceRefs` 拼入模型 Prompt：

| ID | mechanism | constructionRules | antiPatterns |
| --- | --- | --- | --- |
| `negative-space-fusion` | two bold forms reveal one meaningful negative shape | 最多两个前景实体；32px 负形仍可见；内部间隙宽 | 装饰镂空；需解释才能看见；近似现有商标 |
| `monogram-synthesis` | 1-3 specified initials share one silhouette | 字母共享骨架；只保留一个轮廓；黑白可读 | 字母堆叠；额外字符；细碎切口 |
| `semantic-hybrid` | two brand truths become one inseparable symbol | 两个事实必须融合；主次明确；最多两个元素 | 并排图标；机械拼贴；行业图标合集 |
| `continuous-path` | one broad continuous path forms the mark | 路径粗；转折不超过三次；避免自交 | 细线迷宫；复杂结；普通速度线 |
| `modular-grid` | 2-4 repeated modules form a compact system | 模块数量有限；网格清楚；边界紧凑 | QR 码；节点网络；密集小方块 |
| `interlocking-units` | 2-4 solid units interlock as one whole | 单元少；接缝宽；整体先于局部 | 拼图模板；花瓣旋转；无意义交叠 |
| `frame-threshold` | an open frame defines focus or entry | 至少一侧开放；内外空间都参与；轮廓稳定 | 普通 App 圆角框；封闭相框；门窗直译 |
| `fold-unfold` | one plane changes from closed to open | 只保留一个折叠动作；平面母版成立；少量面 | 依赖 3D 光影；纸飞机俗套；多层折纸 |
| `radial-core` | few units organize around a stable center | 3-5 个单元；中心明确；黑白轮廓成立 | 花朵；太阳；旋叶；过多射线 |
| `signal-rhythm` | bars, pulses or intervals form one rhythm | 节拍少；间距有意；整体轮廓封闭或稳定 | 均衡器模板；柱状图；速度线 |
| `custom-wordmark` | one or two controlled features customize the full name | 拼写精确；只改 1-2 个特征；优先可读 | 每字不同；伪文字；装饰字体堆砌 |
| `symbol-as-system` | one geometry rule can extend into layouts or motion | 标志先独立成立；规则可重复；主形简单 | 只画应用图案；Logo 不完整；元素无限增殖 |
| `simplified-character` | a real character source becomes one strong silhouette | 五官最多一个提示；轮廓优先；姿态单一 | 吉祥物插画；写实细节；多表情合集 |
| `dynamic-aperture` | one stable form opens, closes or scales | 静态关键帧成立；运动轴单一；边界清晰 | 随机变形；仅靠动画可读；发光 AI 火花 |

每张卡还要填写适配信号、冲突信号和允许的 Logo 类型。`promptFragments`、`reviewRules`、`sourceRefs` 使用以下确定映射，不由实现者临时发挥：

```ts
const grammarEvidence = {
  'negative-space-fusion': {
    promptFragments: ['build one compact mark from two bold solid forms', 'reveal one additional silhouette in broad negative space'],
    reviewRules: ['the hidden silhouette survives monochrome', 'the negative gap remains visible at 32px'],
    sourceRefs: ['pentagram-conical', 'pentagram-mon-takanawa']
  },
  'monogram-synthesis': {
    promptFragments: ['merge only the specified initials into one shared skeleton', 'make the combined letters read as one compact silhouette'],
    reviewRules: ['every requested initial remains identifiable', 'no extra or pseudo characters appear'],
    sourceRefs: ['pentagram-sc', 'pentagram-pgc']
  },
  'semantic-hybrid': {
    promptFragments: ['fuse two brand truths into one inseparable symbol', 'give the hybrid one dominant silhouette'],
    reviewRules: ['the result is not two icons placed side by side', 'both meanings support the same brand claim'],
    sourceRefs: ['pentagram-conical', 'pentagram-payz']
  },
  'continuous-path': {
    promptFragments: ['use one broad uninterrupted path', 'limit the path to three intentional turns'],
    reviewRules: ['the route stays legible without self-intersection', 'the stroke survives 32px reduction'],
    sourceRefs: ['koto-uniqode', 'koto-pairpoint']
  },
  'modular-grid': {
    promptFragments: ['arrange two to four repeated modules on a clear grid', 'make the outer boundary read before individual modules'],
    reviewRules: ['the mark does not resemble a QR code', 'the module count remains immediately scannable'],
    sourceRefs: ['pentagram-univers', 'pentagram-dataland']
  },
  'interlocking-units': {
    promptFragments: ['interlock two to four solid units as one stable whole', 'keep every joint broad and intentional'],
    reviewRules: ['the whole reads before the pieces', 'the units do not form a generic puzzle or flower'],
    sourceRefs: ['koto-microsoft-50th', 'pentagram-pgc']
  },
  'frame-threshold': {
    promptFragments: ['use an open frame to define entry and focus', 'make inside and outside space equally intentional'],
    reviewRules: ['at least one side remains meaningfully open', 'the result is not a generic rounded app square'],
    sourceRefs: ['koto-faculty', 'pentagram-mosaic-rooms']
  },
  'fold-unfold': {
    promptFragments: ['show one plane completing a single unfold action', 'keep the flat master readable without lighting'],
    reviewRules: ['the silhouette works as flat monochrome', 'the fold does not become a paper-plane cliche'],
    sourceRefs: ['koto-coda', 'pentagram-hiut']
  },
  'radial-core': {
    promptFragments: ['organize three to five bold units around one stable core', 'preserve one compact outer silhouette'],
    reviewRules: ['the center remains stable at small size', 'the result avoids flower, sun, and pinwheel readings'],
    sourceRefs: ['koto-gofundme', 'koto-workday']
  },
  'signal-rhythm': {
    promptFragments: ['use a short sequence of bars or pulses as one symbol', 'make intervals create a deliberate rhythm'],
    reviewRules: ['the mark is not a generic equalizer or chart', 'the rhythm forms a recognizable whole'],
    sourceRefs: ['koto-deezer', 'koto-massivemusic']
  },
  'custom-wordmark': {
    promptFragments: ['spell the full brand name exactly', 'customize only one or two repeated letter features'],
    reviewRules: ['every character is correct and readable', 'no pseudo characters or decorative substitutions appear'],
    sourceRefs: ['koto-lyft', 'koto-bolt']
  },
  'symbol-as-system': {
    promptFragments: ['define one simple geometric rule that makes a standalone mark', 'let the same rule support later patterns without adding logo detail'],
    reviewRules: ['the core mark works without its applications', 'the extension rule stays visibly related to the mark'],
    sourceRefs: ['pentagram-mon-takanawa', 'koto-deezer']
  },
  'simplified-character': {
    promptFragments: ['compress the real character source into one bold silhouette', 'use at most one facial or pose cue'],
    reviewRules: ['the result reads as a mark rather than an illustration', 'no small facial or costume details are required'],
    sourceRefs: ['koto-tripadvisor', 'koto-yazio']
  },
  'dynamic-aperture': {
    promptFragments: ['build one stable form around a single opening axis', 'choose a static keyframe that works without motion'],
    reviewRules: ['the static mark is complete', 'the opening behavior has one clear boundary and axis'],
    sourceRefs: ['pentagram-mozilla-foundation', 'koto-coda']
  }
} satisfies Record<LogoGrammarId, Pick<LogoGrammarCard, 'promptFragments' | 'reviewRules' | 'sourceRefs'>>
```

使用 `satisfies LogoGrammarCard[]` 让 TypeScript 检查最终卡片的 ID 和字段。

- [ ] **步骤 4：验证并提交**

运行：`pnpm test:run src/main/logo/logoGrammarLibrary.test.ts`

预期：PASS。

```bash
git add src/main/logo/logoGrammarLibrary.ts src/main/logo/logoGrammarLibrary.test.ts
git commit -m "feat: add versioned logo grammar library"
```

## 任务 3：规范化简报并生成动态禁忌

**文件：**
- 创建：`src/main/logo/logoBriefNormalizer.ts`
- 创建：`src/main/logo/logoBriefNormalizer.test.ts`

- [ ] **步骤 1：先写风险识别测试**

```ts
import { describe, expect, test } from 'vitest'
import {
  createBriefFingerprint,
  createPromptFingerprint,
  normalizeLogoBrief
} from './logoBriefNormalizer'

const brief = {
  brandName: '生花',
  brandNameAlt: 'BloomCanvas',
  industry: 'AI 绘图软件',
  businessDescription: '帮助创作者把想法转化成图片',
  targetAudience: '个人创作者',
  brandKeywords: [' 清晰 ', '创造力', '清晰'],
  differentiator: '轻量、直接的创作流程',
  avoidedElements: [],
  preferredColors: ['蓝色'],
  avoidedColors: [],
  logoType: 'combination-mark' as const,
  usageScenarios: ['app-icon' as const, 'website' as const]
}

test('deduplicates values and blocks literal plant and AI cliches', () => {
  const result = normalizeLogoBrief(brief)
  expect(result.brief.brandKeywords).toEqual(['清晰', '创造力'])
  expect(result.dynamicExclusions.join(' ')).toMatch(/flower petals|leaves|robot head|circuit/i)
  expect(result.minimumNonLiteralStrategyCount).toBe(2)
})

test('uses a stable fingerprint independent of array order and whitespace', () => {
  expect(createBriefFingerprint(brief)).toBe(
    createBriefFingerprint({
      ...brief,
      brandKeywords: ['创造力', '清晰'],
      preferredColors: [' 蓝色 ']
    })
  )
})

test('tracks color changes only in the prompt fingerprint', () => {
  const recolored = { ...brief, preferredColors: ['紫色'] }
  expect(createBriefFingerprint(recolored)).toBe(createBriefFingerprint(brief))
  expect(createPromptFingerprint(recolored)).not.toBe(createPromptFingerprint(brief))
})

test('does not ban an element the user explicitly requires', () => {
  const result = normalizeLogoBrief({
    ...brief,
    referenceNote: '必须使用一片叶子，但要避免普通环保图库感'
  })
  expect(result.explicitlyRequestedElements).toContain('leaves')
  expect(result.dynamicExclusions).not.toContain('leaves')
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test:run src/main/logo/logoBriefNormalizer.test.ts`

预期：FAIL，模块不存在。

- [ ] **步骤 3：实现规范化和稳定指纹**

实现以下公开 API：

```ts
export interface NormalizedLogoBrief {
  brief: LogoBrandBriefV2
  semanticSeeds: Pick<
    LogoBrandSemantics,
    'functionalTruths' | 'emotionalQualities' | 'differentiators' |
      'audienceSignals' | 'literalMetaphorRisks' | 'industryCliches' |
      'usageConstraints'
  >
  dynamicExclusions: string[]
  explicitlyRequestedElements: string[]
  minimumNonLiteralStrategyCount: number
}

export function normalizeLogoBrief(input: LogoBrandBriefV2): NormalizedLogoBrief
export function createBriefFingerprint(input: LogoBrandBriefV2): string
export function createPromptFingerprint(input: LogoBrandBriefV2): string
```

实现规则必须包括：

```ts
const clicheRules = [
  { pattern: /花|绽放|生长|bloom|flower|grow/i,
    exclusions: ['flower petals', 'leaves', 'lotus'], nonLiteral: 2 },
  { pattern: /\bBI\b|数据|分析|analytics|intelligence/i,
    exclusions: ['bar charts', 'upward arrows', 'dashboard gauges', 'network nodes'] },
  { pattern: /安全|保险|security|insurance/i,
    exclusions: ['locks', 'shields', 'keyholes', 'shadow people'] },
  { pattern: /\bAI\b|人工智能|科技|technology/i,
    exclusions: ['brains', 'circuit boards', 'robot heads', 'glowing sparkles'] },
  { pattern: /物流|全球|logistics|global/i,
    exclusions: ['globes', 'location pins', 'airplanes', 'speed lines'] },
  { pattern: /环保|可持续|sustainab|eco/i,
    exclusions: ['leaves', 'globes', 'recycling arrows'] }
]
```

在 `businessDescription` 或 `referenceNote` 中匹配“必须/需要/明确使用/include/required + 具体元素”的短语；被明确要求的元素移入 `explicitlyRequestedElements` 并从动态禁忌中移除。策略服务 Prompt 要求说明采用该元素的品牌依据和避免图库感的方法。指纹只使用会影响策略的字段；字符串先 `trim()`，数组去重后排序，再对稳定 JSON 使用 Node `createHash('sha256')`。不把 `referenceImageIds`、项目 ID 或时间写入指纹。

- [ ] **步骤 4：验证并提交**

运行：`pnpm test:run src/main/logo/logoBriefNormalizer.test.ts`

预期：PASS。

```bash
git add src/main/logo/logoBriefNormalizer.ts src/main/logo/logoBriefNormalizer.test.ts
git commit -m "feat: normalize logo briefs and cliches"
```

## 任务 4：实现策略多样性与品牌依据校验

**文件：**
- 创建：`src/main/logo/logoStrategyValidator.ts`
- 创建：`src/main/logo/logoStrategyValidator.test.ts`

- [ ] **步骤 1：先写失败测试**

```ts
import { describe, expect, test } from 'vitest'
import { normalizeLogoBrief } from './logoBriefNormalizer'
import { validateLogoStrategies } from './logoStrategyValidator'

const normalizedBrief = normalizeLogoBrief(brief)

test('rejects duplicate grammar and nearly identical construction', () => {
  const result = validateLogoStrategies({
    brief: normalizedBrief,
    semantics,
    strategies: [
      strategy({ id: 'a', grammarId: 'continuous-path', construction: 'one broad curved path' }),
      strategy({ id: 'b', grammarId: 'continuous-path', construction: 'a broad curved path' }),
      strategy({ id: 'c', grammarId: 'modular-grid' })
    ]
  })
  expect(result.ok).toBe(false)
  expect(result.issues).toEqual(expect.arrayContaining([expect.stringMatching(/grammarId/)]))
})

test('rejects evidence not copied from functional truths or differentiators', () => {
  const result = validateLogoStrategies({
    brief: normalizedBrief,
    semantics,
    strategies: [strategy({ brandEvidence: ['看起来很高级'] }), strategy(), strategy()]
  })
  expect(result.issues.join(' ')).toMatch(/brandEvidence/)
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test:run src/main/logo/logoStrategyValidator.test.ts`

预期：FAIL，校验器不存在。

- [ ] **步骤 3：实现确定性校验器**

导出：

```ts
export type LogoStrategyValidationResult =
  | { ok: true; strategies: LogoDesignStrategy[] }
  | { ok: false; issues: string[]; duplicateStrategyIds: string[] }

export function validateLogoStrategies(input: {
  brief: NormalizedLogoBrief
  semantics: LogoBrandSemantics
  strategies: LogoDesignStrategy[]
}): LogoStrategyValidationResult
```

校验顺序固定为：数量恰好 3；ID 和 `grammarId` 唯一；语法卡允许当前 `logoType`；每条 `brandEvidence` 必须精确来自 `functionalTruths` 或 `differentiators`；`coreMetaphor` 与 `construction` 的归一化二元字符 Jaccard 相似度不得超过 `0.72`；字面高风险简报至少两个策略的 `coreMetaphor + exclusions` 不使用该风险；三个策略不能全部命中同一行业俗套。返回具体策略 ID，供修复请求只重写重复项。

- [ ] **步骤 4：验证并提交**

运行：`pnpm test:run src/main/logo/logoStrategyValidator.test.ts`

预期：PASS。

```bash
git add src/main/logo/logoStrategyValidator.ts src/main/logo/logoStrategyValidator.test.ts
git commit -m "feat: validate logo strategy diversity"
```

## 任务 5：实现 Responses 客户端和策略服务

**文件：**
- 创建：`src/main/services/openAIResponsesClient.ts`
- 创建：`src/main/services/openAIResponsesClient.test.ts`
- 创建：`src/main/logo/logoStrategyService.ts`
- 创建：`src/main/logo/logoStrategyService.test.ts`

- [ ] **步骤 1：先写 Responses 解析测试**

```ts
test('reads nested Responses content when output_text is absent', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      output: [{ content: [{ type: 'output_text', text: '{"ok":true}' }] }]
    })
  }))

  await expect(new OpenAIResponsesClient().createText(provider, 'sk-test', []))
    .resolves.toBe('{"ok":true}')
})
```

- [ ] **步骤 2：实现最小 Responses 客户端并验证**

公开方法固定为：

```ts
export type ResponsesInputMessage = {
  role: 'system' | 'user'
  content: string
}

export class OpenAIResponsesClient {
  async createText(
    provider: ProviderConfig,
    apiKey: string,
    input: ResponsesInputMessage[]
  ): Promise<string>
}
```

请求 `POST ${trimmedBaseUrl}/responses`，body 只包含 `{ model: provider.promptModel, input }`。非 2xx 抛出 `Responses request failed: <status> <body>`；空文本抛出 `Responses API returned no text output`。

运行：`pnpm test:run src/main/services/openAIResponsesClient.test.ts`

预期：PASS。

- [ ] **步骤 3：先写策略服务的修复上限测试**

```ts
const validModelOutput = {
  semantics,
  strategies: revision.strategies
}

const strategyInput: GenerateLogoStrategiesInput = {
  providerId: provider.id,
  briefVersion: 1,
  brief
}

test('repairs invalid strategy JSON once and returns the repaired revision', async () => {
  const responses: Pick<OpenAIResponsesClient, 'createText'> = {
    createText: vi.fn()
      .mockResolvedValueOnce('{"strategies":[]}')
      .mockResolvedValueOnce(JSON.stringify(validModelOutput))
  }
  const revision = await new LogoStrategyService(responses).generate(
    provider,
    'sk-test',
    strategyInput
  )
  expect(responses.createText).toHaveBeenCalledTimes(2)
  expect(revision.strategies).toHaveLength(3)
})

test('throws a visible validation error after the second invalid response', async () => {
  const responses: Pick<OpenAIResponsesClient, 'createText'> = {
    createText: vi.fn().mockResolvedValue('{"strategies":[]}')
  }
  await expect(
    new LogoStrategyService(responses).generate(provider, 'sk-test', strategyInput)
  ).rejects.toThrow(/策略模型连续两次返回无效结果/)
  expect(responses.createText).toHaveBeenCalledTimes(2)
})
```

- [ ] **步骤 4：实现结构化策略服务**

`LogoStrategyService` 构造函数接收 `Pick<OpenAIResponsesClient, 'createText'>`，便于不绕过类型地测试。`generate()` 必须：

1. 调用 `normalizeLogoBrief()`。
2. 只把与当前 Logo 类型兼容的语法卡发送给模型，且移除 `sourceRefs`。
3. System Prompt 明确要求输出单个 JSON 对象 `{ semantics, strategies }`，策略恰好三个；若 `replaceStrategyId` 存在，只返回一个替代策略，服务再与其余两个合并。
4. 用 Zod 解析 JSON；允许剥离唯一一层 Markdown code fence，不做正则拼接修复。
5. 用 `validateLogoStrategies()` 校验。
6. 首次失败时发送原输出、Zod/多样性错误和需替换的策略 ID；第二次仍失败则抛错。
7. 新建 revision 和每个策略的 `version` 都为 1；替换单策略时只把替代策略的 `version` 加 1，同时令 `strategyVersion = existingRevision.strategyVersion + 1`，另外两个策略的 `version` 不变；`briefVersion` 必须与输入一致。

核心提示词必须包含：

```text
You are creating design strategies, not finished artwork and not mood-board style labels.
Every strategy must name one concrete metaphor, one construction mechanism, one silhouette,
and evidence copied exactly from functionalTruths or differentiators.
Use three different grammarId values. Do not create three color or rendering variants.
Do not mention, imitate, or compare against any existing brand, agency, or trademark.
Return JSON only.
```

- [ ] **步骤 5：运行服务测试并提交**

运行：

```bash
pnpm test:run src/main/services/openAIResponsesClient.test.ts src/main/logo/logoStrategyService.test.ts
```

预期：PASS。

```bash
git add src/main/services/openAIResponsesClient.ts src/main/services/openAIResponsesClient.test.ts src/main/logo/logoStrategyService.ts src/main/logo/logoStrategyService.test.ts
git commit -m "feat: generate structured logo strategies"
```

## 任务 6：按策略编译最终图片 Prompt

**文件：**
- 修改：`src/main/services/logoPromptCompiler.ts`
- 修改：`src/main/services/logoPromptCompiler.test.ts`

- [ ] **步骤 1：先写文字路由和单图约束测试**

```ts
test('compiles combination-mark exploration as symbol-only first', () => {
  const pack = buildLogoStrategyPromptPack({ brief: combinationBrief, revision, promptVersion: 1 })
  expect(pack.directions).toHaveLength(3)
  expect(pack.directions[0].finalPrompt).toContain('exactly one standalone logo mark')
  expect(pack.directions[0].finalPrompt).toContain('no brand name, letters, slogan, caption, or pseudo-text')
  expect(pack.directions[0].finalPrompt).toContain('not a logo sheet or multiple options')
})

test('allows only specified initials for a lettermark', () => {
  const pack = buildLogoStrategyPromptPack({
    brief: { ...brief, logoType: 'lettermark', shortName: 'BC' },
    revision,
    promptVersion: 1
  })
  expect(pack.directions[0].finalPrompt).toContain('Use exactly these letters: BC')
  expect(pack.directions[0].finalPrompt).toContain('no other letters or pseudo-text')
})

test('keeps 2.5d as an application treatment with a flat master', () => {
  const pack = buildLogoStrategyPromptPack({
    brief,
    revision,
    promptVersion: 1,
    renderStyles: { [revision.strategies[0].id]: 'soft-2.5d' }
  })
  expect(pack.directions[0].finalPrompt).toContain('preserve a flat monochrome master structure')
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test:run src/main/services/logoPromptCompiler.test.ts`

预期：FAIL，`buildLogoStrategyPromptPack` 尚不存在。

- [ ] **步骤 3：实现 V2 编译器并保留旧导出**

新增：

```ts
export const LOGO_QUALITY_RULES_VERSION = 2 as const

export function buildLogoStrategyPromptPack(
  input: BuildLogoStrategyPromptPackInput
): LogoStrategyPromptPack
```

每个 `finalPrompt` 固定按以下顺序拼接：品牌事实、选定策略、语法卡构形规则、表现风格、Logo 类型文字规则、执行要求、动态禁忌。执行要求必须包含：只生成一个独立标志；最多两个主要视觉元素；宽间隙；无脆弱细线；纯背景；无 Mockup/海报/场景；黑白和 32px 成立。

文字规则：

- `symbol-mark` 和 `combination-mark` 首轮完全禁字。
- `lettermark` 只允许 `shortName` 的 1-3 个拉丁字母或品牌名中明确指定的 1-2 个中文主字；缺少可用缩写时抛出校验错误。
- `wordmark` 只允许精确完整品牌名，强调准确拼写和可读性。
- `emblem` 首轮不生成环形小字和 slogan。
- 2.5D、软质立体、浮雕、拟物都追加“保留平面母版结构”，不能只产出材质 Mockup。

- [ ] **步骤 4：验证并提交**

运行：

```bash
pnpm test:run src/main/services/logoPromptCompiler.test.ts
pnpm typecheck
```

预期：PASS，旧 `buildLogoPromptPack()` 测试也保持通过。

```bash
git add src/main/services/logoPromptCompiler.ts src/main/services/logoPromptCompiler.test.ts
git commit -m "feat: compile strategy-specific logo prompts"
```

## 任务 7：保存简报指纹和策略版本

**文件：**
- 修改：`src/main/services/logoProjectService.ts`
- 修改：`src/main/services/logoProjectService.test.ts`

- [ ] **步骤 1：先写版本失效测试**

```ts
function v2ProjectInput(
  overrides: Partial<SaveLogoProjectInput> = {}
): SaveLogoProjectInput {
  return {
    brandName: brief.brandName,
    brandNameAlt: brief.brandNameAlt,
    shortName: brief.shortName,
    industry: brief.industry,
    businessDescription: brief.businessDescription,
    targetAudience: brief.targetAudience,
    brandKeywords: brief.brandKeywords,
    differentiator: brief.differentiator,
    avoidedElements: brief.avoidedElements,
    preferredColors: brief.preferredColors,
    avoidedColors: brief.avoidedColors,
    logoTypes: [brief.logoType],
    styleDirections: [],
    usageScenarios: brief.usageScenarios,
    referenceImageIds: [],
    strategyPromptPack,
    ...overrides
  }
}

test('increments brief version and keeps the old revision visibly stale', async () => {
  const created = await service.save(v2ProjectInput({ designRevision: revision }))
  const updated = await service.save({ ...v2ProjectInput(), id: created.id, businessDescription: '新的业务事实' })

  expect(updated.briefVersion).toBe(2)
  expect(updated.designRevision?.briefVersion).toBe(1)
  expect(updated.strategyPromptPack?.sourceBriefVersion).toBe(1)
})

test('keeps strategies but invalidates prompts when only colors change', async () => {
  const created = await service.save(v2ProjectInput({ designRevision: revision }))
  const updated = await service.save({ ...v2ProjectInput(), id: created.id, preferredColors: ['紫色'] })

  expect(updated.briefVersion).toBe(1)
  expect(updated.designRevision).toEqual(revision)
  expect(updated.promptVersion).toBe(2)
  expect(updated.strategyPromptPack?.sourcePromptVersion).toBe(1)
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test:run src/main/services/logoProjectService.test.ts`

预期：FAIL，项目服务尚未维护 `briefVersion` 和完整简报指纹。

- [ ] **步骤 3：实现版本规则**

在 `save()` 中把旧输入转换为 `LogoBrandBriefV2`。实现 `createBriefFingerprint()` 和 `createPromptFingerprint()`：策略指纹包括品牌名、行业、业务描述、目标用户、关键词、差异点、避免元素、Logo 类型和使用场景；Prompt 指纹在此基础上再包括颜色偏好、避免颜色和参考说明。颜色不影响策略版本，但会递增独立 `promptVersion`。

规则固定为：

```ts
const briefChanged = Boolean(existing && existing.briefFingerprint !== nextFingerprint)
const briefVersion = existing ? (existing.briefVersion ?? 1) + (briefChanged ? 1 : 0) : 1
const promptChanged = Boolean(existing && existing.promptFingerprint !== nextPromptFingerprint)
const promptVersion = existing ? (existing.promptVersion ?? 1) + (promptChanged ? 1 : 0) : 1
const designRevision = input.designRevision ?? existing?.designRevision
const strategyPromptPack = briefChanged || promptChanged
  ? existing?.strategyPromptPack
  : input.strategyPromptPack ?? existing?.strategyPromptPack
```

把 `nextFingerprint`、`nextPromptFingerprint`、`briefVersion`、`promptVersion` 都写入 `nextProject`。旧 revision 和旧 Prompt 包都不删除；Renderer 通过 `designRevision.briefVersion !== briefVersion` 把策略标为过期，通过 direction 的 `sourcePromptVersion !== project.promptVersion` 把 Prompt 标为过期。第二份计划禁止生成按钮使用任一过期内容。

- [ ] **步骤 4：验证并提交**

运行：`pnpm test:run src/main/services/logoProjectService.test.ts`

预期：PASS。

```bash
git add src/main/services/logoProjectService.ts src/main/services/logoProjectService.test.ts
git commit -m "feat: version logo briefs and strategies"
```

## 任务 8：接通策略和 V2 Prompt IPC

**文件：**
- 修改：`src/shared/ipc.ts`
- 修改：`src/preload/index.ts`
- 修改：`src/preload/index.test.ts`
- 修改：`src/renderer/src/api/bloomCanvasClient.ts`
- 修改：`src/main/ipc/registerIpcHandlers.ts`

- [ ] **步骤 1：先写 Preload 暴露测试**

```ts
expect(exposedApi.logoStrategy.generate).toBeTypeOf('function')
expect(exposedApi.logoPrompt.buildStrategy).toBeTypeOf('function')
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test:run src/preload/index.test.ts`

预期：FAIL，新方法不存在。

- [ ] **步骤 3：扩展 typed IPC**

新增 channel：

```ts
logoStrategyGenerate: 'logoStrategy:generate',
logoPromptBuildStrategy: 'logoPrompt:buildStrategy'
```

新增 API：

```ts
logoStrategy: {
  generate: (input: GenerateLogoStrategiesInput) => Promise<AppResult<LogoDesignRevision>>
}
logoPrompt: {
  build: (input: BuildLogoPromptPackInput) => Promise<AppResult<LogoPromptPack>>
  buildStrategy: (
    input: BuildLogoStrategyPromptPackInput
  ) => Promise<AppResult<LogoStrategyPromptPack>>
}
```

在 Main handler 中从 `providerId` 查 Provider 和 API Key，调用 `LogoStrategyService.generate()`；Prompt 编译直接调用纯函数。两者都使用 Zod 解析输入和现有 `toErrorPayload()` 返回明确错误。同步修改 Preload 和 `bloomCanvasClient`。

- [ ] **步骤 4：验证 IPC 边界并提交**

运行：

```bash
pnpm test:run src/preload/index.test.ts
pnpm typecheck
```

预期：PASS。

```bash
git add src/shared/ipc.ts src/preload/index.ts src/preload/index.test.ts src/renderer/src/api/bloomCanvasClient.ts src/main/ipc/registerIpcHandlers.ts
git commit -m "feat: expose logo strategy APIs"
```

## 任务 9：增加固定简报回归基准并执行检查点验收

**文件：**
- 创建：`src/main/logo/logoStrategyBenchmarks.test.ts`

- [ ] **步骤 1：增加八组固定简报测试**

使用“生花、BI 向前冲、AI 安全平台、儿童科学教育、精品咖啡、可持续包装、金融支付、当代艺术馆”八组简报。测试使用固定的合法模型 JSON fixture，不调用真实 API；每组都经过 `normalizeLogoBrief()`、Zod 和 `validateLogoStrategies()`，断言三个不同 `grammarId`。另外断言：生花至少两个策略排除植物，BI 不含普通箭头或柱状图，AI 安全不把大脑/电路/盾牌/锁当核心隐喻。

- [ ] **步骤 2：运行核心测试和全量验证**

运行：

```bash
pnpm test:run src/shared/schemas.test.ts src/main/logo src/main/services/logoPromptCompiler.test.ts src/main/services/logoProjectService.test.ts src/main/services/openAIResponsesClient.test.ts src/preload/index.test.ts
pnpm typecheck
pnpm lint
```

预期：全部 PASS；ESLint 无新增错误。

- [ ] **步骤 3：提交检查点**

```bash
git add src/main/logo/logoStrategyBenchmarks.test.ts
git commit -m "test: add logo strategy benchmarks"
```

完成本计划后，策略核心检查点必须满足：旧 Logo 项目仍可打开；新策略失败会显示错误且最多修复一次；不依赖 Renderer 也能完成简报规范化、策略生成、校验、Prompt 编译和版本保存。
