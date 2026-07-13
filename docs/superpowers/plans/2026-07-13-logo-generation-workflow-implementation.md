# Logo 生成工作流实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 把现有 Logo 三栏表单改成“品牌简报、创意策略、生成与筛选、修改与导出”四步工作流，并让三个策略逐候选独立生成、部分成功和单独重试。

**架构：** 左侧继续保留轻量 Logo 项目列表，右侧改为一个有明确主操作的工作流，不再让表单、结果和操作分散在三栏。Renderer 负责工作流和逐候选状态，Main 继续用现有 `GenerationService` 处理每一次单图请求；每策略并行、策略内候选串行，任何失败只更新对应状态。V1 风格方向 metadata 继续可读，新生成记录使用 V2 策略快照。

**技术栈：** Electron 39、React 19、TypeScript 5、Ant Design 6（`Steps`、`Form`、`Select mode="tags"`、`Segmented`、`Collapse`、`Alert`、`Progress`）、Vitest、Testing Library。

**前置条件：** 先完整执行 `2026-07-13-logo-strategy-core-implementation.md`，并确认其测试、类型检查和提交均完成。

**测试夹具：** 本计划测试中的 `brief`、`revision`、`strategyPromptPack`、`provider` 分别导入 `logoTestBrief`、`logoTestRevision`、`logoTestPromptPack`、`logoTestProvider` 并在文件顶部创建同名别名。`generationRecord()` 和 `generationRecordFromInput()` 在对应测试文件中以现有 `GenerationRecord` fixture 为基准创建真实成功 record；不得用 `as never` 绕过 V2 metadata。

---

## 文件结构

- 修改：`src/shared/logoDesign.ts`
  - 增加质量模式、工作流步骤、V2 生成 metadata 和项目偏好类型。
- 修改：`src/shared/types.ts`
  - 把 `LogoGenerationMetadata` 改为 V1/V2 联合类型；扩展 `LogoProject` 和保存输入。
- 修改：`src/shared/schemas.ts`
  - 增加 V2 metadata 和工作流字段校验，保留 V1 Schema。
- 修改：`src/shared/schemas.test.ts`
  - 验证旧记录仍可解析、新记录必须带策略与 Prompt 快照。
- 修改：`src/main/services/logoProjectService.ts`
  - 保存工作流步骤、质量模式、视觉评审开关、自动重试开关和选中候选。
- 修改：`src/main/services/logoProjectService.test.ts`
  - 验证默认值和保存恢复。
- 创建：`src/renderer/src/components/logo/logoFormUtils.ts`
  - 集中处理标签切分、项目到表单、表单到 V2 简报和版本新鲜度判断。
- 创建：`src/renderer/src/components/logo/logoFormUtils.test.ts`
  - 覆盖英文逗号、中文逗号、顿号和换行。
- 创建：`src/renderer/src/components/logo/LogoBriefStep.tsx`
- 创建：`src/renderer/src/components/logo/LogoBriefStep.test.tsx`
  - 品牌简报和“生成创意策略”主操作。
- 创建：`src/renderer/src/components/logo/LogoStrategyStep.tsx`
- 创建：`src/renderer/src/components/logo/LogoStrategyStep.test.tsx`
  - 三个具体策略、单独调整/替换、表现风格和折叠 Prompt。
- 创建：`src/renderer/src/components/logo/logoGenerationBatch.ts`
- 创建：`src/renderer/src/components/logo/logoGenerationBatch.test.ts`
  - 无 React 的逐候选容错编排器。
- 创建：`src/renderer/src/components/logo/LogoGenerationStep.tsx`
- 创建：`src/renderer/src/components/logo/LogoGenerationStep.test.tsx`
  - 成本模式、预计数量、策略进度、失败和单独重试。
- 创建：`src/renderer/src/components/logo/LogoQuickRefinementStep.tsx`
  - 检查点二的可用第四步：选中图、继续到现有参考图编辑、导出；第三份计划再增强为分支修改。
- 创建：`src/renderer/src/components/logo/LogoWorkflowPanel.tsx`
- 创建：`src/renderer/src/components/logo/LogoWorkflowPanel.test.tsx`
  - 四步状态机、保存、策略 API、Prompt API 和批量生成的唯一编排入口。
- 修改：`src/renderer/src/components/logo/LogoResultsPanel.tsx`
- 修改：`src/renderer/src/components/logo/LogoResultsPanel.test.tsx`
  - 按 V2 策略分组，保留旧方向分组，选择候选进入第四步。
- 修改：`src/renderer/src/components/AppShell.tsx`
- 修改：`src/renderer/src/components/AppShell.test.tsx`
  - Logo 工作区改成项目栏 + 工作流两栏。
- 修改：`src/renderer/src/assets/main.css`
  - 稳定两栏尺寸、步骤内容、策略卡和进度布局。

## 任务 1：增加工作流和 V2 生成记录类型

**文件：**
- 修改：`src/shared/logoDesign.ts`
- 修改：`src/shared/types.ts`
- 修改：`src/shared/schemas.ts`
- 修改：`src/shared/schemas.test.ts`

- [ ] **步骤 1：先写 V1/V2 兼容测试**

在 `src/shared/schemas.test.ts` 增加：

```ts
test('accepts a V2 logo generation snapshot', () => {
  const result = createGenerationSchema.parse({
    providerId: 'provider-1',
    prompt: 'Create exactly one standalone logo mark.',
    useOptimizedPrompt: false,
    referenceAssetIds: [],
    parameters: { size: '1024x1024', count: 1, quality: 'hd', outputFormat: 'png' },
    scenario: 'logo-design',
    projectId: 'project-1',
    scenarioMetadata: {
      version: 2,
      logoProjectId: 'project-1',
      strategyId: 'strategy-path',
      strategyNameZh: '连续创作路径',
      grammarId: 'continuous-path',
      candidateIndex: 0,
      logoType: 'combination-mark',
      designRevisionSnapshot: revision,
      promptDirectionSnapshot: strategyPromptPack.directions[0],
      briefSnapshot: brief,
      qualityRulesVersion: 2,
      qualityRetryAttempt: 0
    }
  })
  expect(result.scenarioMetadata?.version).toBe(2)
})

test('continues accepting a stored V1 logo generation snapshot', () => {
  expect(() => createGenerationSchema.parse(legacyLogoGenerationInput)).not.toThrow()
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test:run src/shared/schemas.test.ts`

预期：FAIL，V2 metadata 尚未定义。

- [ ] **步骤 3：增加共享类型**

在 `src/shared/logoDesign.ts` 增加：

```ts
export type LogoWorkflowStep = 'brief' | 'strategy' | 'generation' | 'refinement'
export type LogoGenerationMode = 'quality-first' | 'economy'

export interface LogoGenerationMetadataV2 {
  version: 2
  logoProjectId: string
  strategyId: string
  strategyNameZh: string
  grammarId: LogoGrammarId
  candidateIndex: number
  logoType: LogoType
  designRevisionSnapshot: LogoDesignRevision
  promptDirectionSnapshot: LogoStrategyPromptDirection
  briefSnapshot: LogoBrandBriefV2
  qualityRulesVersion: 2
  qualityRetryAttempt: 0 | 1
  parentVariantId?: string
}
```

把现有 `LogoGenerationMetadata` 改名为 `LogoGenerationMetadataV1` 并增加 `version?: 1`，然后：

```ts
export type LogoGenerationMetadata = LogoGenerationMetadataV1 | LogoGenerationMetadataV2
```

给 `LogoProject` 和 `SaveLogoProjectInput` 增加：

```ts
workflowStep?: LogoWorkflowStep
generationMode?: LogoGenerationMode
aiReviewEnabled?: boolean
autoQualityRetry?: boolean
selectedCandidateId?: VariantId
```

- [ ] **步骤 4：实现联合 Schema 和项目默认值**

`logoGenerationMetadataSchema` 改为：

```ts
export const logoGenerationMetadataSchema = z.union([
  logoGenerationMetadataV1Schema,
  logoGenerationMetadataV2Schema
])
```

在 `saveLogoProjectSchema` 中新增枚举和布尔字段。`LogoProjectService.save()` 对新旧项目统一给出：

```ts
workflowStep: input.workflowStep ?? existing?.workflowStep ?? 'brief',
generationMode: input.generationMode ?? existing?.generationMode ?? 'quality-first',
aiReviewEnabled: input.aiReviewEnabled ?? existing?.aiReviewEnabled ?? true,
autoQualityRetry: input.autoQualityRetry ?? existing?.autoQualityRetry ?? true,
selectedCandidateId: input.selectedCandidateId ?? existing?.selectedCandidateId
```

- [ ] **步骤 5：验证并提交**

运行：

```bash
pnpm test:run src/shared/schemas.test.ts src/main/services/logoProjectService.test.ts src/main/services/generationService.test.ts
pnpm typecheck
```

预期：PASS；现有 V1 generation fixture 不需要伪造 V2 字段。

```bash
git add src/shared/logoDesign.ts src/shared/types.ts src/shared/schemas.ts src/shared/schemas.test.ts src/main/services/logoProjectService.ts src/main/services/logoProjectService.test.ts src/main/services/generationService.test.ts
git commit -m "feat: add logo workflow persistence"
```

## 任务 2：实现简报转换工具和品牌简报步骤

**文件：**
- 创建：`src/renderer/src/components/logo/logoFormUtils.ts`
- 创建：`src/renderer/src/components/logo/logoFormUtils.test.ts`
- 创建：`src/renderer/src/components/logo/LogoBriefStep.tsx`
- 创建：`src/renderer/src/components/logo/LogoBriefStep.test.tsx`
- 修改：`src/renderer/src/components/logo/logoConstants.ts`

- [ ] **步骤 1：先写标签切分和版本判断测试**

```ts
import { describe, expect, test } from 'vitest'
import {
  isDesignRevisionCurrent,
  mergeRecompiledPromptPack,
  splitLogoTags
} from './logoFormUtils'

test('splits comma, Chinese comma, enumeration comma, and newline', () => {
  expect(splitLogoTags('清晰,可靠，克制、创造力\n亲和')).toEqual([
    '清晰', '可靠', '克制', '创造力', '亲和'
  ])
})

test('marks a revision stale when its brief version differs', () => {
  expect(isDesignRevisionCurrent({ briefVersion: 2, designRevision: revision })).toBe(false)
  expect(isDesignRevisionCurrent({ briefVersion: 1, designRevision: revision })).toBe(true)
})

test('recompiles only the changed strategy and preserves another custom prompt', () => {
  const previous = {
    ...strategyPromptPack,
    directions: strategyPromptPack.directions.map((direction, index) =>
      index === 1 ? { ...direction, customized: true, finalPrompt: 'my custom prompt' } : direction
    )
  }
  const rebuilt = {
    ...strategyPromptPack,
    sourceStrategyVersion: 2,
    directions: strategyPromptPack.directions.map((direction) => ({
      ...direction,
      finalPrompt: `rebuilt ${direction.strategyId}`
    }))
  }

  const merged = mergeRecompiledPromptPack(previous, rebuilt, ['strategy-path'])
  expect(merged.directions.find((item) => item.strategyId === 'strategy-path')?.finalPrompt)
    .toBe('rebuilt strategy-path')
  expect(merged.directions.find((item) => item.strategyId === 'strategy-frame')?.finalPrompt)
    .toBe('my custom prompt')
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test:run src/renderer/src/components/logo/logoFormUtils.test.ts`

预期：FAIL，模块不存在。

- [ ] **步骤 3：实现纯转换函数**

导出：

```ts
export interface LogoBriefFormValues {
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

export function splitLogoTags(value: string): string[]
export function projectToBriefValues(project: LogoProject | null): LogoBriefFormValues
export function briefValuesToV2(values: LogoBriefFormValues): LogoBrandBriefV2
export function briefToProjectInput(
  brief: LogoBrandBriefV2,
  project: LogoProject | null
): SaveLogoProjectInput
export function isDesignRevisionCurrent(project: Pick<LogoProject, 'briefVersion' | 'designRevision'>): boolean
export function isPromptDirectionCurrent(
  project: LogoProject,
  direction: LogoStrategyPromptDirection
): boolean
export function mergeRecompiledPromptPack(
  previous: LogoStrategyPromptPack,
  rebuilt: LogoStrategyPromptPack,
  changedStrategyIds: string[]
): LogoStrategyPromptPack
```

`projectToBriefValues()` 优先读取 V2 `project.avoidedElements`；旧项目只有 `avoidElements` 字符串时调用 `splitLogoTags()` 迁移显示。`briefToProjectInput()` 显式映射 `logoTypes: [brief.logoType]`、`styleDirections: project?.styleDirections ?? []`、`referenceImageIds: project?.referenceImageIds ?? []` 和 `avoidedElements`，不能把 V2 brief 直接 spread 成旧保存输入。`isPromptDirectionCurrent()` 同时比较 `sourceBriefVersion`、`sourcePromptVersion` 和对应策略的独立 `version`，不能只比较 revision 的全局 `strategyVersion`。`mergeRecompiledPromptPack()` 对 `changedStrategyIds` 使用 rebuilt direction，对其余 ID 使用 previous direction，并采用 rebuilt 的包级版本；缺少任一策略 ID 时抛出明确错误。

- [ ] **步骤 4：先写品牌简报交互测试**

```tsx
test('submits a plain-language V2 brief with tag fields', async () => {
  const onSubmit = vi.fn()
  render(<App><LogoBriefStep initialValues={initialValues} loading={false} onSubmit={onSubmit} /></App>)

  fireEvent.change(screen.getByLabelText('品牌名'), { target: { value: '生花' } })
  fireEvent.change(screen.getByLabelText('业务描述'), { target: { value: '帮助创作者生成图片' } })
  fireEvent.mouseDown(screen.getByLabelText('品牌关键词'))
  fireEvent.change(screen.getByLabelText('品牌关键词'), { target: { value: '清晰、创造力' } })
  fireEvent.keyDown(screen.getByLabelText('品牌关键词'), { key: 'Enter' })
  fireEvent.click(screen.getByRole('button', { name: '生成创意策略' }))

  await waitFor(() => expect(onSubmit).toHaveBeenCalled())
  expect(onSubmit.mock.calls[0][0].brandKeywords).toEqual(['清晰', '创造力'])
})
```

- [ ] **步骤 5：实现品牌简报 UI**

使用一个 `Form`，核心字段直接展示；颜色、避免元素、参考说明放入标题为“更多约束”的 `Collapse`。品牌关键词、颜色、禁忌使用 `Select mode="tags" tokenSeparators={[',', '，', '、']}`，并在 `onBlur` 时调用 `splitLogoTags()` 处理换行。每一步只有底部一个 `type="primary" htmlType="submit"` 按钮“生成创意策略”。

字段规则：品牌名、行业、业务描述必填；品牌关键词 2-4 个；使用场景 1-3 个。Logo 类型继续使用有悬浮详细说明的单选项，不恢复多选风格方向。

- [ ] **步骤 6：验证并提交**

运行：

```bash
pnpm test:run src/renderer/src/components/logo/logoFormUtils.test.ts src/renderer/src/components/logo/LogoBriefStep.test.tsx
```

预期：PASS。

```bash
git add src/renderer/src/components/logo/logoFormUtils.ts src/renderer/src/components/logo/logoFormUtils.test.ts src/renderer/src/components/logo/LogoBriefStep.tsx src/renderer/src/components/logo/LogoBriefStep.test.tsx src/renderer/src/components/logo/logoConstants.ts
git commit -m "feat: add logo brief workflow step"
```

## 任务 3：实现策略采用、单独调整、替换和 Prompt 确认

**文件：**
- 创建：`src/renderer/src/components/logo/LogoStrategyStep.tsx`
- 创建：`src/renderer/src/components/logo/LogoStrategyStep.test.tsx`
- 修改：`src/renderer/src/components/logo/LogoPromptPreview.tsx`

- [ ] **步骤 1：先写三个具体策略和过期保护测试**

```tsx
test('shows concrete strategy content and keeps prompts collapsed by default', () => {
  renderStrategyStep()
  expect(screen.getByText('连续创作路径')).toBeInTheDocument()
  expect(screen.getByText(/品牌依据/)).toBeInTheDocument()
  expect(screen.getByText(/构形方式/)).toBeInTheDocument()
  expect(screen.queryByDisplayValue(/Create exactly one/)).not.toBeVisible()
})

test('blocks generation when any selected prompt is stale', () => {
  renderStrategyStep({ promptPack: stalePromptPack })
  expect(screen.getByRole('button', { name: '生成 Logo 初稿' })).toBeDisabled()
  expect(screen.getByText('上游信息已变化，请重新确认提示词')).toBeInTheDocument()
})

test('replaces only the requested strategy', async () => {
  const onReplaceStrategy = vi.fn()
  renderStrategyStep({ onReplaceStrategy })
  fireEvent.click(screen.getByLabelText('替换策略：连续创作路径'))
  expect(onReplaceStrategy).toHaveBeenCalledWith('strategy-path')
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test:run src/renderer/src/components/logo/LogoStrategyStep.test.tsx`

预期：FAIL，组件不存在。

- [ ] **步骤 3：实现策略步骤**

组件公开契约固定为：

```ts
interface LogoStrategyStepProps {
  revision: LogoDesignRevision
  promptPack: LogoStrategyPromptPack
  loadingStrategyId: string | null
  onChangePrompt: (strategyId: string, finalPrompt: string) => void
  onChangeRenderStyle: (strategyId: string, style: LogoRenderStyle) => void
  onEditStrategy: (strategyId: string, patch: Partial<LogoDesignStrategy>) => void
  onReplaceStrategy: (strategyId: string) => void
  onGenerate: () => void
}
```

每个策略是一张独立结果卡，不嵌套在另一张卡里。卡片展示：策略名、一句话、品牌依据、核心隐喻、构形方式、轮廓、推荐风格、禁用元素；提供铅笔图标“调整策略”和刷新图标“替换策略”，都有 tooltip 与 `aria-label`。表现风格用 `Segmented` 或 `Select`，2.5D/拟物选项说明它们是应用版本，平面母版仍会保留。

Prompt 使用 `Collapse` 默认关闭。用户编辑后，把该 direction 设为 `{ customized: true, finalPrompt }`；上游简报或对应策略 `version` 变化时显示 `Alert`，必须点击“重新编译并确认”后才允许生成。手工调整策略时只把该策略 `version + 1`、revision 全局 `strategyVersion + 1`，另外两个 strategy version 和 Prompt direction 保持不变。

调整/替换策略或切换某个表现风格后，编排层调用 `logoPrompt.buildStrategy()` 得到 rebuilt 包，再用 `mergeRecompiledPromptPack(previous, rebuilt, [strategyId])` 只替换该 direction 并保存项目。简报或颜色导致 `promptVersion` 变化时，changed IDs 传三个策略 ID，全部重编译；任何其他 direction 的 `customized: true` 内容不得被局部操作覆盖。

- [ ] **步骤 4：验证并提交**

运行：`pnpm test:run src/renderer/src/components/logo/LogoStrategyStep.test.tsx`

预期：PASS。

```bash
git add src/renderer/src/components/logo/LogoStrategyStep.tsx src/renderer/src/components/logo/LogoStrategyStep.test.tsx src/renderer/src/components/logo/LogoPromptPreview.tsx
git commit -m "feat: add logo strategy workflow step"
```

## 任务 4：实现逐候选容错的批量生成控制器

**文件：**
- 创建：`src/renderer/src/components/logo/logoGenerationBatch.ts`
- 创建：`src/renderer/src/components/logo/logoGenerationBatch.test.ts`

- [ ] **步骤 1：先写部分成功测试**

```ts
test('continues other candidates and strategies after one failure', async () => {
  const createCandidate = vi.fn(async (strategy: LogoDesignStrategy, candidateIndex: number) => {
    if (strategy.id === 'strategy-frame' && candidateIndex === 0) {
      throw new Error('provider timeout')
    }
    return generationRecord(`${strategy.id}-${candidateIndex}`)
  })
  const updates: LogoBatchItem[][] = []

  const result = await runLogoGenerationBatch({
    strategies: revision.strategies,
    candidatesPerStrategy: 2,
    createCandidate,
    onProgress: (items) => updates.push(items)
  })

  expect(createCandidate).toHaveBeenCalledTimes(6)
  expect(result.records).toHaveLength(5)
  expect(result.failures).toEqual([
    expect.objectContaining({ strategyId: 'strategy-frame', candidateIndex: 0 })
  ])
  expect(updates.at(-1)?.filter((item) => item.status === 'succeeded')).toHaveLength(5)
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test:run src/renderer/src/components/logo/logoGenerationBatch.test.ts`

预期：FAIL，控制器不存在。

- [ ] **步骤 3：实现纯编排器**

```ts
export type LogoBatchItemStatus = 'queued' | 'running' | 'succeeded' | 'failed'

export interface LogoBatchItem {
  key: string
  strategyId: string
  strategyNameZh: string
  candidateIndex: number
  status: LogoBatchItemStatus
  generationId?: string
  errorMessage?: string
}

export async function runLogoGenerationBatch(input: {
  strategies: LogoDesignStrategy[]
  candidatesPerStrategy: 1 | 2
  createCandidate: (
    strategy: LogoDesignStrategy,
    candidateIndex: number
  ) => Promise<GenerationRecord>
  onProgress: (items: LogoBatchItem[]) => void
}): Promise<{
  records: GenerationRecord[]
  failures: LogoBatchItem[]
}>
```

先建立固定长度状态数组并立即通知。使用 `Promise.all(strategies.map(...))` 让三个策略独立推进；同一策略内用普通 `for` 串行生成 1-2 个候选。每个候选单独 `try/catch`，`record.status !== 'succeeded'` 按 `record.errorMessage` 记失败，永远不因一个候选 throw 中断整个批次。每次状态变化复制数组传给 `onProgress`，避免 React 因同一引用不刷新。

- [ ] **步骤 4：验证并提交**

运行：`pnpm test:run src/renderer/src/components/logo/logoGenerationBatch.test.ts`

预期：PASS，6 次调用中一个失败仍返回 5 个成功记录。

```bash
git add src/renderer/src/components/logo/logoGenerationBatch.ts src/renderer/src/components/logo/logoGenerationBatch.test.ts
git commit -m "feat: isolate logo candidate generation failures"
```

## 任务 5：实现质量模式、进度和失败策略重试

**文件：**
- 创建：`src/renderer/src/components/logo/LogoGenerationStep.tsx`
- 创建：`src/renderer/src/components/logo/LogoGenerationStep.test.tsx`
- 修改：`src/renderer/src/components/logo/LogoResultsPanel.tsx`
- 修改：`src/renderer/src/components/logo/LogoResultsPanel.test.tsx`

- [ ] **步骤 1：先写成本与进度测试**

```tsx
test('defaults to six candidates and explains the estimate without inventing price', () => {
  renderGenerationStep({ mode: 'quality-first' })
  expect(screen.getByText('预计生成 6 张候选图')).toBeInTheDocument()
  expect(screen.queryByText(/¥|美元|预计费用/)).not.toBeInTheDocument()
})

test('economy mode requests one candidate per strategy', () => {
  const onGenerate = vi.fn()
  renderGenerationStep({ mode: 'economy', onGenerate })
  fireEvent.click(screen.getByRole('button', { name: '生成 3 张 Logo 初稿' }))
  expect(onGenerate).toHaveBeenCalledWith(expect.objectContaining({ candidatesPerStrategy: 1 }))
})

test('shows a failed candidate without replacing successful images', () => {
  renderGenerationStep({ items: mixedBatchItems, records: successfulRecords })
  expect(screen.getByText('provider timeout')).toBeInTheDocument()
  expect(screen.getAllByRole('img', { name: /方案/ })).toHaveLength(5)
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test:run src/renderer/src/components/logo/LogoGenerationStep.test.tsx`

预期：FAIL，组件不存在。

- [ ] **步骤 3：实现生成步骤**

质量模式用 `Segmented`：`quality-first` 显示“质量优先 · 6 张”，`economy` 显示“省钱 · 3 张”。项目先保存 `aiReviewEnabled: true` 和 `autoQualityRetry: true` 默认值，但本检查点不渲染尚未接通的评审开关或评审状态；第三份计划接通真实评审后再同时加入控件。

生成前显示候选数量，不估算金额。生成时每策略显示一条 `Progress` 和成功/失败计数；已有结果区保持不动，不显示全屏 Spin，不清空项目。失败项显示可理解错误和“只重试此项”；重试使用失败 `generationId` 调用现有 `generations.retry()`，如果失败发生在 IPC 前没有 ID，则按相同 strategy/candidate metadata 新建一次生成。

`LogoResultsPanel` 分组键改为：

```ts
function getLogoGroup(generation: GenerationRecord): { id: string; name: string } {
  const metadata = generation.scenarioMetadata
  if (metadata && 'version' in metadata && metadata.version === 2) {
    return { id: metadata.strategyId, name: metadata.strategyNameZh }
  }
  return {
    id: metadata?.styleDirectionId ?? 'legacy',
    name: metadata?.styleDirectionName ?? '旧版方向'
  }
}
```

结果只渲染成功 record 的真实 variant；失败 record 作为错误行，不渲染灰色图片块。

- [ ] **步骤 4：验证并提交**

运行：

```bash
pnpm test:run src/renderer/src/components/logo/LogoGenerationStep.test.tsx src/renderer/src/components/logo/LogoResultsPanel.test.tsx
```

预期：PASS。

```bash
git add src/renderer/src/components/logo/LogoGenerationStep.tsx src/renderer/src/components/logo/LogoGenerationStep.test.tsx src/renderer/src/components/logo/LogoResultsPanel.tsx src/renderer/src/components/logo/LogoResultsPanel.test.tsx
git commit -m "feat: add logo generation progress and modes"
```

## 任务 6：实现四步工作流编排

**文件：**
- 创建：`src/renderer/src/components/logo/LogoWorkflowPanel.tsx`
- 创建：`src/renderer/src/components/logo/LogoWorkflowPanel.test.tsx`
- 创建：`src/renderer/src/components/logo/LogoQuickRefinementStep.tsx`
- 修改：`src/renderer/src/components/AppShell.tsx`
- 修改：`src/renderer/src/components/AppShell.test.tsx`

- [ ] **步骤 1：先写从简报到六张候选的集成测试**

```tsx
test('moves from brief to strategies and generates six independent requests', async () => {
  vi.mocked(bloomCanvasClient.logoStrategy.generate).mockResolvedValue(revision)
  vi.mocked(bloomCanvasClient.logoPrompt.buildStrategy).mockResolvedValue(strategyPromptPack)
  vi.mocked(bloomCanvasClient.generations.create).mockImplementation(async (input) =>
    generationRecordFromInput(input)
  )
  renderWorkflow()

  fillRequiredBrief()
  fireEvent.click(screen.getByRole('button', { name: '生成创意策略' }))
  await screen.findByText('连续创作路径')
  fireEvent.click(screen.getByRole('button', { name: '生成 Logo 初稿' }))

  await waitFor(() => expect(bloomCanvasClient.generations.create).toHaveBeenCalledTimes(6))
  expect(bloomCanvasClient.generations.create).toHaveBeenCalledWith(
    expect.objectContaining({ parameters: expect.objectContaining({ count: 1 }) })
  )
})

test('does not use a stale revision after the brief changes', async () => {
  renderWorkflow({ project: { ...project, briefVersion: 2, designRevision: revision } })
  expect(screen.getByText('品牌信息已变化，旧策略仅供查看')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '生成 Logo 初稿' })).not.toBeEnabled()
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test:run src/renderer/src/components/logo/LogoWorkflowPanel.test.tsx`

预期：FAIL，工作流组件不存在。

- [ ] **步骤 3：实现唯一工作流编排入口**

`LogoWorkflowPanel` 使用 `Steps` 的四个 `items`：品牌简报、创意策略、生成与筛选、修改与导出。允许回到已完成步骤；没有 revision 不能进入策略/生成，没有成功候选不能进入修改。

关键流程固定为：

```ts
async function createStrategies(brief: LogoBrandBriefV2) {
  const saved = await saveProject({
    ...briefToProjectInput(brief, project),
    workflowStep: 'brief'
  })
  const revision = await bloomCanvasClient.logoStrategy.generate({
    providerId: activeProvider.id,
    briefVersion: saved.briefVersion ?? 1,
    brief
  })
  const promptPack = await bloomCanvasClient.logoPrompt.buildStrategy({
    brief,
    revision,
    promptVersion: saved.promptVersion ?? 1
  })
  await saveProject({ ...saved, designRevision: revision, strategyPromptPack: promptPack, workflowStep: 'strategy' })
}
```

生成时对三个策略都调用 `runLogoGenerationBatch()`；每次请求的 `parameters.count` 强制为 1，V2 metadata 保存完整 brief、revision、direction、strategy、candidateIndex 和 `qualityRetryAttempt: 0` 快照。每个成功 record 立刻调用 `onCreated(record)` 刷新并落到结果，不等全部结束。

第四步 `LogoQuickRefinementStep` 必须在本检查点可用：展示选中图，提供“继续修改”把该图片送入现有通用参考图编辑，以及“导出”按钮。它不展示未实现的控件或说明文字；第三份计划直接替换该组件。

- [ ] **步骤 4：验证工作流测试**

运行：`pnpm test:run src/renderer/src/components/logo/LogoWorkflowPanel.test.tsx`

预期：PASS，质量优先恰好 6 次独立 `count: 1` 请求。

- [ ] **步骤 5：修改 AppShell 为两栏 Logo 工作区**

Logo 场景只渲染：

```tsx
<div className="logo-workspace">
  <LogoProjectPanel ... />
  <LogoWorkflowPanel
    activeProvider={activeProvider}
    generations={generations}
    project={selectedLogoProject}
    settings={settings}
    onCreated={handleGenerationCreated}
    onContinueEdit={handleContinueEdit}
    onExport={handleExport}
    onNeedProvider={() => setProviderModalOpen(true)}
    onProjectSaved={handleLogoProjectSaved}
  />
</div>
```

移除 Logo 场景旧的独立 `LogoCreationPanel` 第三栏。通用创作布局和历史删除改动保持原样。

- [ ] **步骤 6：验证并提交**

运行：

```bash
pnpm test:run src/renderer/src/components/logo/LogoWorkflowPanel.test.tsx src/renderer/src/components/AppShell.test.tsx
pnpm typecheck
```

预期：PASS。

```bash
git add src/renderer/src/components/logo/LogoWorkflowPanel.tsx src/renderer/src/components/logo/LogoWorkflowPanel.test.tsx src/renderer/src/components/logo/LogoQuickRefinementStep.tsx src/renderer/src/components/AppShell.tsx src/renderer/src/components/AppShell.test.tsx
git commit -m "feat: add four-step logo workflow"
```

## 任务 7：完成布局、可访问性和检查点验收

**文件：**
- 修改：`src/renderer/src/assets/main.css`

- [ ] **步骤 1：实现稳定响应式布局**

桌面使用 `grid-template-columns: 260px minmax(0, 1fr)`；步骤导航固定高度，内容区滚动。策略卡网格使用 `repeat(3, minmax(240px, 1fr))`，结果网格使用 `repeat(auto-fit, minmax(220px, 1fr))`。小于 1180px 时策略卡改单列，项目栏保持 220px；小于 820px 时整体单列并允许页面滚动。所有图像容器使用 `aspect-ratio: 1`，运行状态、错误文本和按钮不得改变卡片宽度。

- [ ] **步骤 2：运行完整工作流验证**

运行：

```bash
pnpm test:run src/shared/schemas.test.ts src/main/services/logoProjectService.test.ts src/main/services/generationService.test.ts src/renderer/src/components/logo src/renderer/src/components/AppShell.test.tsx
pnpm typecheck
pnpm lint
pnpm build
```

预期：全部 PASS；构建产物成功生成。

- [ ] **步骤 3：手工冒烟验证**

运行：`pnpm dev`

依次验证：新建项目后第一屏是品牌简报；策略生成后看到三个具体构形方向；质量优先显示 6 张；故意让一个请求失败后其他结果保留；只重试失败项；旧项目显示“需要重新生成创意策略”；Prompt 默认折叠但可编辑；选择真实候选后能进入第四步并继续修改或导出。

- [ ] **步骤 4：提交检查点**

```bash
git add src/renderer/src/assets/main.css
git commit -m "style: refine logo workflow layout"
```

完成本计划后，生成工作流检查点必须在没有第三份计划的情况下仍可完成：创建简报、生成/调整/替换策略、确认 Prompt、得到 3 或 6 张候选、保留部分成功、单独重试、选择候选、送入现有参考图编辑并导出。
