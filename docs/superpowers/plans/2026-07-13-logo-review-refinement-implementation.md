# Logo 评审与修改实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为 Logo 候选增加真实的本地可用性预览、可降级的 AI 视觉评审、一次性质量重试，以及以选中候选为父节点的参考图修改和组合标文字预览。

**架构：** Main 进程使用 Sharp 生成确定性的尺寸/灰度/黑白/反白预览，并通过用户当前提示词模型尝试视觉评审；供应商不支持图片输入或评审失败时只返回 `local-only`，不生成审美分数。修改继续复用 `GenerationService` 的参考图生图，但 metadata 保存父候选和修改模式，形成不可覆盖的分支历史。

**技术栈：** Electron 39、TypeScript 5、Sharp 0.35、OpenAI-compatible Responses API、React 19、Ant Design 6、Zod 4、Vitest、Testing Library。

**前置条件：** 先按顺序完整执行策略核心和生成工作流两份计划，并确认两个检查点各自通过测试、类型检查和构建。

**测试夹具：** 继续复用 `src/shared/logoDesign.testFixtures.ts`。评审测试中的 `context` 必须由真实 `Asset` fixture、`logoTestRevision` 和 V2 generation metadata 组成；Renderer 测试中的 candidate 必须是 `GenerationRecord.variants` 的实际结构，不能以不完整对象或 `as never` 跳过类型检查。

---

## 文件结构

- 修改：`src/shared/logoDesign.ts`
  - 增加本地检查、预览集、评审、评审输入、修改模式、修改操作和修改 Prompt 输入类型。
- 修改：`src/shared/types.ts`
  - 给 `LogoProject` 增加 `candidateReviews`；扩展 V2 generation metadata 的分支字段。
- 修改：`src/shared/schemas.ts`
- 修改：`src/shared/schemas.test.ts`
  - 校验 AI 评审有分数、`local-only` 无分数、分支 metadata 和修改输入。
- 创建：`src/main/logo/logoPreviewService.ts`
- 创建：`src/main/logo/logoPreviewService.test.ts`
  - 解码、空白检测、低对比度检查和七种实际预览。
- 修改：`src/main/services/openAIResponsesClient.ts`
- 修改：`src/main/services/openAIResponsesClient.test.ts`
  - 支持 `input_text` 和 `input_image` 内容块，保持纯文本调用兼容。
- 创建：`src/main/logo/logoReviewService.ts`
- 创建：`src/main/logo/logoReviewService.test.ts`
  - 结构化视觉评审和 `local-only` 降级。
- 创建：`src/main/logo/logoRefinementPromptCompiler.ts`
- 创建：`src/main/logo/logoRefinementPromptCompiler.test.ts`
  - 保持结构、继续探索、组合标文字、横版、应用风格和黑白 Prompt。
- 修改：`src/main/services/logoProjectService.ts`
- 修改：`src/main/services/logoProjectService.test.ts`
  - 按候选 ID 原子保存评审，不覆盖其他评审。
- 修改：`src/shared/ipc.ts`
- 修改：`src/preload/index.ts`
- 修改：`src/preload/index.test.ts`
- 修改：`src/renderer/src/api/bloomCanvasClient.ts`
- 修改：`src/main/ipc/registerIpcHandlers.ts`
  - 增加 `logoPreview:get`、`logoReview:run` 和 `logoPrompt:buildRefinement`。
- 创建：`src/renderer/src/components/logo/LogoReviewBadge.tsx`
- 创建：`src/renderer/src/components/logo/LogoReviewBadge.test.tsx`
  - 准确展示推荐、可调整、不建议、未执行 AI 评审。
- 修改：`src/renderer/src/components/logo/LogoUsabilityPreview.tsx`
- 修改：`src/renderer/src/components/logo/LogoUsabilityPreview.test.tsx`
  - 改用 Main 生成的真实预览，不再只用 CSS 缩放。
- 创建：`src/renderer/src/components/logo/logoQualityRetry.ts`
- 创建：`src/renderer/src/components/logo/logoQualityRetry.test.ts`
  - 判定全量质量失败和最多一次自动重试。
- 创建：`src/renderer/src/components/logo/LogoRefinementPanel.tsx`
- 创建：`src/renderer/src/components/logo/LogoRefinementPanel.test.tsx`
  - 修改模式、按需操作、分支版本、导出。
- 修改：`src/renderer/src/components/logo/LogoGenerationStep.tsx`
- 修改：`src/renderer/src/components/logo/LogoGenerationStep.test.tsx`
  - 生成成功后异步评审，不阻塞和不清空图片。
- 修改：`src/renderer/src/components/logo/LogoResultsPanel.tsx`
- 修改：`src/renderer/src/components/logo/LogoResultsPanel.test.tsx`
  - 按真实评审排序并折叠不建议项。
- 修改：`src/renderer/src/components/logo/LogoWorkflowPanel.tsx`
- 修改：`src/renderer/src/components/logo/LogoWorkflowPanel.test.tsx`
  - 接入评审、一次重试和第四步分支修改。
- 删除：`src/renderer/src/components/logo/LogoQuickRefinementStep.tsx`
  - 由完整 `LogoRefinementPanel` 替代。
- 修改：`src/renderer/src/assets/main.css`
  - 评审标记、预览矩阵、修改区和版本轨迹样式。

## 任务 1：建立评审、预览和修改领域类型

**文件：**
- 修改：`src/shared/logoDesign.ts`
- 修改：`src/shared/types.ts`
- 修改：`src/shared/schemas.ts`
- 修改：`src/shared/schemas.test.ts`

- [ ] **步骤 1：先写 AI 与本地降级的 Schema 测试**

```ts
test('accepts scored vision review', () => {
  const review = logoCandidateReviewSchema.parse({
    candidateId: 'variant-1',
    status: 'recommended',
    reviewMode: 'vision-model',
    scores: {
      strategyFit: 86,
      distinctiveness: 78,
      simplicity: 91,
      smallSizePotential: 84,
      craft: 80
    },
    hardFailures: [],
    risksZh: ['内侧转角可以更统一'],
    suggestedRevisionZh: '统一转角半径。',
    revisionInstructionEn: 'Use one consistent corner radius.'
  })
  expect(review.scores?.simplicity).toBe(91)
})

test('accepts local-only review without fake scores', () => {
  const review = logoCandidateReviewSchema.parse({
    candidateId: 'variant-1',
    status: 'unreviewed',
    reviewMode: 'local-only',
    hardFailures: [],
    risksZh: [],
    unavailableReasonZh: '当前供应商未执行 AI 视觉评审'
  })
  expect(review.scores).toBeUndefined()
})

test('rejects local-only review with aesthetic scores', () => {
  expect(() => logoCandidateReviewSchema.parse({
    candidateId: 'variant-1',
    status: 'unreviewed',
    reviewMode: 'local-only',
    scores: { strategyFit: 50, distinctiveness: 50, simplicity: 50, smallSizePotential: 50, craft: 50 },
    hardFailures: [],
    risksZh: []
  })).toThrow()
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test:run src/shared/schemas.test.ts`

预期：FAIL，评审 Schema 尚未定义。

- [ ] **步骤 3：增加共享类型**

```ts
export interface LogoLocalCheck {
  decodable: boolean
  blank: boolean
  lowContrast: boolean
  width: number
  height: number
}

export interface LogoPreviewSet {
  assetId: string
  localCheck: LogoLocalCheck
  whiteBackgroundDataUrl: string
  blackBackgroundDataUrl: string
  size64DataUrl: string
  size32DataUrl: string
  grayscaleDataUrl: string
  monochromeDataUrl: string
  inverseDataUrl: string
}

export type LogoReviewStatus =
  | 'recommended'
  | 'adjustable'
  | 'not-recommended'
  | 'unreviewed'

export interface LogoReviewScores {
  strategyFit: number
  distinctiveness: number
  simplicity: number
  smallSizePotential: number
  craft: number
}

export type LogoCandidateReview =
  | {
      candidateId: string
      status: Exclude<LogoReviewStatus, 'unreviewed'>
      reviewMode: 'vision-model'
      scores: LogoReviewScores
      hardFailures: string[]
      risksZh: string[]
      suggestedRevisionZh?: string
      revisionInstructionEn?: string
    }
  | {
      candidateId: string
      status: 'unreviewed'
      reviewMode: 'local-only'
      hardFailures: string[]
      risksZh: string[]
      unavailableReasonZh: string
    }

export interface ReviewLogoCandidateInput {
  providerId: string
  projectId: string
  variantId: string
  useVision: boolean
}

export type LogoRefinementMode = 'preserve-structure' | 'explore'
export type LogoRefinementOperation =
  | 'custom'
  | 'add-brand-name'
  | 'horizontal-lockup'
  | 'application-style'
  | 'monochrome'

export interface BuildLogoRefinementPromptInput {
  brief: LogoBrandBriefV2
  strategy: LogoDesignStrategy
  sourcePrompt: LogoStrategyPromptDirection
  mode: LogoRefinementMode
  operation: LogoRefinementOperation
  instruction: string
  renderStyle?: LogoRenderStyle
}
```

给 `LogoProject` 和 `SaveLogoProjectInput` 增加：

```ts
candidateReviews?: Record<string, LogoCandidateReview>
```

给 `LogoGenerationMetadataV2` 增加：

```ts
parentVariantId?: string
refinementMode?: LogoRefinementMode
refinementOperation?: LogoRefinementOperation
```

- [ ] **步骤 4：实现判别联合 Schema**

使用 `z.discriminatedUnion('reviewMode', [...])`。`vision-model` 分支的五个分数都是 `0..100`；`local-only` 分支没有 `scores` 字段且 `status` 只能是 `unreviewed`。`LogoProjectService.save()` 使用 `candidateReviews: input.candidateReviews ?? existing?.candidateReviews ?? {}`，保存项目表单时不能清空已有评审。

- [ ] **步骤 5：验证并提交**

运行：

```bash
pnpm test:run src/shared/schemas.test.ts src/main/services/logoProjectService.test.ts
pnpm typecheck
```

预期：PASS。

```bash
git add src/shared/logoDesign.ts src/shared/types.ts src/shared/schemas.ts src/shared/schemas.test.ts src/main/services/logoProjectService.ts src/main/services/logoProjectService.test.ts
git commit -m "feat: define logo review and refinement types"
```

## 任务 2：用 Sharp 生成真实本地检查和预览

**文件：**
- 创建：`src/main/logo/logoPreviewService.ts`
- 创建：`src/main/logo/logoPreviewService.test.ts`

- [ ] **步骤 1：先写空白、低对比度和预览测试**

```ts
test('flags a solid image as blank', async () => {
  const file = await writeFixture('blank.png', '#ffffff')
  const preview = await new LogoPreviewService().create(asset('asset-1', file))
  expect(preview.localCheck).toMatchObject({ decodable: true, blank: true })
})

test('creates actual 64px, 32px, grayscale, monochrome, and inverse PNG previews', async () => {
  const file = await writeTwoToneLogoFixture()
  const preview = await new LogoPreviewService().create(asset('asset-1', file))

  for (const dataUrl of [
    preview.size64DataUrl,
    preview.size32DataUrl,
    preview.grayscaleDataUrl,
    preview.monochromeDataUrl,
    preview.inverseDataUrl
  ]) {
    expect(dataUrl).toMatch(/^data:image\/png;base64,/)
  }
  const size32 = await sharp(Buffer.from(preview.size32DataUrl.split(',')[1], 'base64')).metadata()
  expect(size32).toMatchObject({ width: 32, height: 32 })
})

test('throws a visible error for undecodable image bytes', async () => {
  await expect(new LogoPreviewService().create(asset('bad', invalidFile)))
    .rejects.toThrow(/无法解码 Logo 图片/)
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test:run src/main/logo/logoPreviewService.test.ts`

预期：FAIL，服务不存在。

- [ ] **步骤 3：实现预览服务**

```ts
export class LogoPreviewService {
  async create(asset: Asset): Promise<LogoPreviewSet>
}
```

实现约束：只读取 `asset.filePath`；先 `metadata()` 和 `stats()`。所有颜色通道标准差小于 `2.5` 判为空白；转换到灰度后标准差小于 `12` 判低对比度。本地检查只陈述可测事实，不输出原创性、审美或品牌相关性。

生成管线：

- 白底和黑底：`resize(256, 256, contain)` 后分别 `flatten()`。
- 64px、32px：白底 contain，输出精确方形 PNG。
- 灰度：256px、白底、`grayscale()`。
- 纯黑：灰度后 `threshold(180)`，用于轮廓观察。
- 反白：纯黑预览后 `negate({ alpha: false })`。

每个 Buffer 用统一 `toPngDataUrl()` 转换。不得把预览写成新的 `Asset`，避免污染历史。

- [ ] **步骤 4：验证并提交**

运行：`pnpm test:run src/main/logo/logoPreviewService.test.ts`

预期：PASS。

```bash
git add src/main/logo/logoPreviewService.ts src/main/logo/logoPreviewService.test.ts
git commit -m "feat: add deterministic logo previews"
```

## 任务 3：实现可降级的 AI 视觉评审

**文件：**
- 修改：`src/main/services/openAIResponsesClient.ts`
- 修改：`src/main/services/openAIResponsesClient.test.ts`
- 创建：`src/main/logo/logoReviewService.ts`
- 创建：`src/main/logo/logoReviewService.test.ts`

- [ ] **步骤 1：先写多模态 Responses 请求测试**

```ts
test('sends input_image content without changing text-only calls', async () => {
  const fetchMock = vi.fn().mockResolvedValue(okResponse('{"status":"recommended"}'))
  vi.stubGlobal('fetch', fetchMock)

  await client.createText(provider, 'sk-test', [{
    role: 'user',
    content: [
      { type: 'input_text', text: 'Review this mark.' },
      { type: 'input_image', image_url: 'data:image/png;base64,AA==' }
    ]
  }])

  const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
  expect(body.input[0].content[1]).toEqual({
    type: 'input_image', image_url: 'data:image/png;base64,AA=='
  })
})
```

- [ ] **步骤 2：扩展客户端输入类型并验证**

```ts
export type ResponsesContentPart =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; image_url: string }

export type ResponsesInputMessage = {
  role: 'system' | 'user'
  content: string | ResponsesContentPart[]
}
```

请求和输出解析保持第一份计划的行为不变。

运行：`pnpm test:run src/main/services/openAIResponsesClient.test.ts`

预期：PASS。

- [ ] **步骤 3：先写视觉成功与降级测试**

```ts
test('returns a scored review from a vision-capable provider', async () => {
  responses.createText.mockResolvedValue(JSON.stringify(validVisionReview))
  const result = await service.review(provider, 'sk-test', context, true)
  expect(result).toMatchObject({ reviewMode: 'vision-model', status: 'recommended' })
  expect(result.scores?.strategyFit).toBe(86)
})

test('returns local-only without scores when image input is unsupported', async () => {
  responses.createText.mockRejectedValue(new Error('Responses request failed: 400 input_image is not supported'))
  const result = await service.review(provider, 'sk-test', context, true)
  expect(result).toEqual(expect.objectContaining({
    reviewMode: 'local-only',
    status: 'unreviewed',
    unavailableReasonZh: '当前供应商未执行 AI 视觉评审'
  }))
  expect(result).not.toHaveProperty('scores')
})

test('skips the network when vision review is disabled', async () => {
  const result = await service.review(provider, 'sk-test', context, false)
  expect(responses.createText).not.toHaveBeenCalled()
  expect(result.reviewMode).toBe('local-only')
})
```

- [ ] **步骤 4：实现评审服务**

`LogoReviewService.review()` 接收 Provider、API Key、真实 Asset、V2 metadata 和 `useVision`。先调用 `LogoPreviewService`；图片空白时可返回 `local-only` + `hardFailures: ['图片为空白或接近空白']`，但仍不产生审美分数。

视觉 Prompt 必须同时提供：品牌事实、策略、禁忌、Logo 类型、预期文字；要求 JSON only。评审项为策略匹配、独特性、简洁、小尺寸潜力、完成度。硬失败固定包括：一图多标、方案合集、未要求文字/伪文字/水印、Mockup/海报/场景、明显违背禁忌、细节无法缩小；`wordmark` 还必须把错字、漏字、伪字符判为硬失败。

JSON 输出：

```json
{
  "status": "recommended",
  "scores": {
    "strategyFit": 86,
    "distinctiveness": 78,
    "simplicity": 91,
    "smallSizePotential": 84,
    "craft": 80
  },
  "hardFailures": [],
  "risksZh": ["内侧转角可以更统一"],
  "suggestedRevisionZh": "统一转角半径。",
  "revisionInstructionEn": "Use one consistent corner radius."
}
```

当 `provider.promptModel.trim()` 为空或 `useVision` 为 false 时不发网络请求。任何网络错误、不支持图片、无文本、无效 JSON 或 Schema 错误都降级为 `local-only`；评审异常不向 `GenerationService` 回写失败状态。

- [ ] **步骤 5：验证并提交**

运行：

```bash
pnpm test:run src/main/services/openAIResponsesClient.test.ts src/main/logo/logoReviewService.test.ts
```

预期：PASS。

```bash
git add src/main/services/openAIResponsesClient.ts src/main/services/openAIResponsesClient.test.ts src/main/logo/logoReviewService.ts src/main/logo/logoReviewService.test.ts
git commit -m "feat: add optional logo vision review"
```

## 任务 4：保存评审并接通 Preview/Review IPC

**文件：**
- 修改：`src/main/services/logoProjectService.ts`
- 修改：`src/main/services/logoProjectService.test.ts`
- 修改：`src/shared/ipc.ts`
- 修改：`src/preload/index.ts`
- 修改：`src/preload/index.test.ts`
- 修改：`src/renderer/src/api/bloomCanvasClient.ts`
- 修改：`src/main/ipc/registerIpcHandlers.ts`

- [ ] **步骤 1：先写原子保存测试**

```ts
test('upserts one candidate review without deleting another', async () => {
  await service.saveCandidateReview('project-1', review('variant-1'))
  const project = await service.saveCandidateReview('project-1', review('variant-2'))
  expect(Object.keys(project.candidateReviews ?? {})).toEqual(['variant-1', 'variant-2'])
})
```

- [ ] **步骤 2：实现项目评审写入**

```ts
async saveCandidateReview(
  projectId: LogoProjectId,
  review: LogoCandidateReview
): Promise<LogoProject>
```

在一个 `storage.update()` 中合并 `[review.candidateId]: review` 并更新 `updatedAt`。项目不存在时抛 `Logo project not found`。

- [ ] **步骤 3：先写 IPC 暴露测试**

```ts
expect(exposedApi.logoPreview.get).toBeTypeOf('function')
expect(exposedApi.logoReview.run).toBeTypeOf('function')
```

- [ ] **步骤 4：实现 typed IPC**

新增：

```ts
logoPreviewGet: 'logoPreview:get',
logoReviewRun: 'logoReview:run'
```

API：

```ts
logoPreview: {
  get: (assetId: AssetId) => Promise<AppResult<LogoPreviewSet>>
}
logoReview: {
  run: (input: ReviewLogoCandidateInput) => Promise<AppResult<LogoCandidateReview>>
}
```

Main 必须从 Storage 中验证：variant 存在；variant 的 generation 属于 `projectId`；asset 是该 variant 的 output；generation metadata 是 V2。不能信任 Renderer 传入文件路径、策略或 Prompt。评审完成后调用 `saveCandidateReview()`；Preview 只返回转换结果，不写项目。

- [ ] **步骤 5：验证并提交**

运行：

```bash
pnpm test:run src/main/services/logoProjectService.test.ts src/preload/index.test.ts
pnpm typecheck
```

预期：PASS。

```bash
git add src/main/services/logoProjectService.ts src/main/services/logoProjectService.test.ts src/shared/ipc.ts src/preload/index.ts src/preload/index.test.ts src/renderer/src/api/bloomCanvasClient.ts src/main/ipc/registerIpcHandlers.ts
git commit -m "feat: expose logo preview and review APIs"
```

## 任务 5：展示真实预览、评审状态和排序

**文件：**
- 创建：`src/renderer/src/components/logo/LogoReviewBadge.tsx`
- 创建：`src/renderer/src/components/logo/LogoReviewBadge.test.tsx`
- 修改：`src/renderer/src/components/logo/LogoUsabilityPreview.tsx`
- 修改：`src/renderer/src/components/logo/LogoUsabilityPreview.test.tsx`
- 修改：`src/renderer/src/components/logo/LogoResultsPanel.tsx`
- 修改：`src/renderer/src/components/logo/LogoResultsPanel.test.tsx`

- [ ] **步骤 1：先写降级文案和无伪分数测试**

```tsx
test('shows an explicit local-only state without score UI', () => {
  render(<LogoReviewBadge review={localOnlyReview} />)
  expect(screen.getByText('未执行 AI 评审')).toBeInTheDocument()
  expect(screen.getByText('当前供应商未执行 AI 视觉评审')).toBeInTheDocument()
  expect(screen.queryByText(/50|评分|分$/)).not.toBeInTheDocument()
})

test('shows concrete reasons for a not-recommended result', () => {
  render(<LogoReviewBadge review={notRecommendedReview} />)
  expect(screen.getByText('不建议继续')).toBeInTheDocument()
  expect(screen.getByText('出现未要求的伪文字')).toBeInTheDocument()
})
```

- [ ] **步骤 2：实现评审标记**

映射固定为：`recommended` -> 绿色“推荐继续”；`adjustable` -> 蓝色“可以调整”；`not-recommended` -> 红色“不建议继续”；`unreviewed` -> 默认色“未执行 AI 评审”。只有 `vision-model` 展开五项分数；风险和建议用短列表展示。

- [ ] **步骤 3：先写实际预览加载测试**

```tsx
test('loads generated local previews instead of reusing one source URL', async () => {
  vi.mocked(bloomCanvasClient.logoPreview.get).mockResolvedValue(previewSet)
  render(<LogoUsabilityPreview asset={asset} />)
  expect(await screen.findByAltText('32px 预览')).toHaveAttribute('src', previewSet.size32DataUrl)
  expect(screen.getByAltText('灰度预览')).toHaveAttribute('src', previewSet.grayscaleDataUrl)
  expect(screen.getByAltText('反白预览')).toHaveAttribute('src', previewSet.inverseDataUrl)
})
```

- [ ] **步骤 4：改造可用性预览和结果排序**

`LogoUsabilityPreview` 加载时显示卡片内部 Skeleton，不影响外部结果布局；加载失败显示行内 `Alert`。展示白底、黑底、64px、32px、灰度、纯黑、反白七格，并显示“低对比度”或“图片接近空白”的确定性警告。

结果排序权重：recommended 0、adjustable 1、unreviewed 2、无 review 3、not-recommended 4；同权重保持生成时间和 candidate index。默认完整展示推荐、可调整、未评审和评审中的结果；`not-recommended` 放到“查看不建议继续的结果（N）”Collapse 中，不删除、不隐藏历史入口。

- [ ] **步骤 5：验证并提交**

运行：

```bash
pnpm test:run src/renderer/src/components/logo/LogoReviewBadge.test.tsx src/renderer/src/components/logo/LogoUsabilityPreview.test.tsx src/renderer/src/components/logo/LogoResultsPanel.test.tsx
```

预期：PASS。

```bash
git add src/renderer/src/components/logo/LogoReviewBadge.tsx src/renderer/src/components/logo/LogoReviewBadge.test.tsx src/renderer/src/components/logo/LogoUsabilityPreview.tsx src/renderer/src/components/logo/LogoUsabilityPreview.test.tsx src/renderer/src/components/logo/LogoResultsPanel.tsx src/renderer/src/components/logo/LogoResultsPanel.test.tsx
git commit -m "feat: show logo reviews and real previews"
```

## 任务 6：接入评审编排和最多一次质量重试

**文件：**
- 创建：`src/renderer/src/components/logo/logoQualityRetry.ts`
- 创建：`src/renderer/src/components/logo/logoQualityRetry.test.ts`
- 修改：`src/renderer/src/components/logo/LogoGenerationStep.tsx`
- 修改：`src/renderer/src/components/logo/LogoGenerationStep.test.tsx`
- 修改：`src/renderer/src/components/logo/LogoWorkflowPanel.tsx`
- 修改：`src/renderer/src/components/logo/LogoWorkflowPanel.test.tsx`

- [ ] **步骤 1：先写重试判定测试**

```ts
test('retries only when every expected candidate has a vision-model rejection', () => {
  expect(shouldAutoRetryQuality({
    enabled: true,
    expectedCount: 6,
    reviews: sixNotRecommendedVisionReviews,
    existingRetryAttempts: []
  })).toBe(true)
})

test.each([
  ['one recommendation', [...fiveRejected, recommendedReview]],
  ['one local-only review', [...fiveRejected, localOnlyReview]],
  ['incomplete reviews', fiveRejected]
])('does not retry for %s', (_, reviews) => {
  expect(shouldAutoRetryQuality({
    enabled: true,
    expectedCount: 6,
    reviews,
    existingRetryAttempts: []
  })).toBe(false)
})

test('never retries when a quality retry record already exists', () => {
  expect(shouldAutoRetryQuality({
    enabled: true,
    expectedCount: 6,
    reviews: sixNotRecommendedVisionReviews,
    existingRetryAttempts: [1]
  })).toBe(false)
})
```

- [ ] **步骤 2：实现重试纯函数**

```ts
export function shouldAutoRetryQuality(input: {
  enabled: boolean
  expectedCount: number
  reviews: LogoCandidateReview[]
  existingRetryAttempts: Array<0 | 1>
}): boolean

export function buildQualityRetryPrompt(
  direction: LogoStrategyPromptDirection,
  reviews: LogoCandidateReview[]
): string
```

`buildQualityRetryPrompt()` 保留原 Prompt，只追加去重后的 `revisionInstructionEn` 和以下硬边界：保持品牌简报与核心策略不变；修正列出的失败；仍然只生成一个独立标志。没有英文修改建议时使用硬失败的英文映射，不把中文 UI 文案盲目拼入 Prompt。

- [ ] **步骤 3：生成成功后异步评审**

在 `LogoGenerationStep` 的质量模式下加入“AI 视觉评审”和“全部不合格时自动重试一次”两个 Checkbox；质量优先默认都开，省钱模式允许独立关闭。控件变化立即保存项目设置，生成前摘要明确显示本轮是否执行评审。

每个成功 variant 立即展示，然后分别调用：

```ts
await bloomCanvasClient.logoReview.run({
  providerId: activeProvider.id,
  projectId: savedProject.id,
  variantId: variant.id,
  useVision: savedProject.aiReviewEnabled ?? true
})
```

评审请求单个失败时显示 `local-only`，不能撤销图片、不能让批量生成 Promise reject。每个评审返回后刷新项目，使 badge 逐张出现。

- [ ] **步骤 4：实现一次性整批质量重试**

只有初始批次所有预期候选都得到 `vision-model/not-recommended` 且开关启用时，自动再跑一批相同数量。每个新请求使用 `buildQualityRetryPrompt()`，metadata 设 `qualityRetryAttempt: 1`。当前 revision 只要已有任一 attempt 1 记录，重新打开项目也不能再次自动触发。UI 在重试前显示“本轮结果均不建议继续，正在按评审原因自动重试 1 次”，完成后不再循环。

- [ ] **步骤 5：验证并提交**

运行：

```bash
pnpm test:run src/renderer/src/components/logo/logoQualityRetry.test.ts src/renderer/src/components/logo/LogoGenerationStep.test.tsx src/renderer/src/components/logo/LogoWorkflowPanel.test.tsx
```

预期：PASS，评审降级不触发自动重试，已有 attempt 1 永不再触发。

```bash
git add src/renderer/src/components/logo/logoQualityRetry.ts src/renderer/src/components/logo/logoQualityRetry.test.ts src/renderer/src/components/logo/LogoGenerationStep.tsx src/renderer/src/components/logo/LogoGenerationStep.test.tsx src/renderer/src/components/logo/LogoWorkflowPanel.tsx src/renderer/src/components/logo/LogoWorkflowPanel.test.tsx
git commit -m "feat: review logo batches and retry quality once"
```

## 任务 7：编译参考图修改和组合标文字 Prompt

**文件：**
- 创建：`src/main/logo/logoRefinementPromptCompiler.ts`
- 创建：`src/main/logo/logoRefinementPromptCompiler.test.ts`
- 修改：`src/shared/ipc.ts`
- 修改：`src/preload/index.ts`
- 修改：`src/preload/index.test.ts`
- 修改：`src/renderer/src/api/bloomCanvasClient.ts`
- 修改：`src/main/ipc/registerIpcHandlers.ts`

- [ ] **步骤 1：先写修改模式和文字边界测试**

```ts
test('locks the silhouette in preserve-structure mode', () => {
  const prompt = buildLogoRefinementPrompt({
    ...input,
    mode: 'preserve-structure',
    operation: 'custom',
    instruction: '改成蓝色，转角更圆润'
  })
  expect(prompt).toContain('Preserve the exact dominant silhouette and core geometry')
  expect(prompt).toContain('change only color, stroke weight, corner radius, spacing, or proportion')
})

test('allows local reconstruction in explore mode without changing the strategy', () => {
  const prompt = buildLogoRefinementPrompt({ ...input, mode: 'explore', operation: 'custom' })
  expect(prompt).toContain('keep the same core metaphor and grammar')
  expect(prompt).toContain('local geometry may be reconstructed')
})

test('adds only the exact full brand name for combination preview', () => {
  const prompt = buildLogoRefinementPrompt({
    ...combinationInput,
    operation: 'add-brand-name'
  })
  expect(prompt).toContain('Add exactly this full brand name: 生花')
  expect(prompt).toContain('no slogan and no additional text')
})
```

- [ ] **步骤 2：实现纯 Prompt 编译器**

`buildLogoRefinementPrompt()` 总是先声明参考图是结构来源、只输出一个结果、无 Mockup。操作规则：

- `custom`：按 Switch 决定保持结构或继续探索。
- `add-brand-name`：对 `combination-mark` 加入完整品牌名并形成图文组合；对 `emblem` 把精确品牌名加入已确认的外轮廓，不加 slogan 或其他小字；其他类型拒绝该操作。两者都标明是光栅排版草案。
- `horizontal-lockup`：保留图形，生成一版横排图文组合，只出现完整品牌名。
- `application-style`：允许 2.5D/软质/浮雕/拟物处理，但明确平面母版仍是参考图中的结构。
- `monochrome`：只改为纯黑白，不重构几何。

- [ ] **步骤 3：增加 typed IPC**

新增 `logoPromptBuildRefinement: 'logoPrompt:buildRefinement'` 和：

```ts
logoPrompt: {
  // 保留已有 build 与 buildStrategy
  buildRefinement: (
    input: BuildLogoRefinementPromptInput
  ) => Promise<AppResult<string>>
}
```

Main 用 `buildLogoRefinementPromptInputSchema` 校验并调用纯函数。

- [ ] **步骤 4：验证并提交**

运行：

```bash
pnpm test:run src/main/logo/logoRefinementPromptCompiler.test.ts src/preload/index.test.ts
pnpm typecheck
```

预期：PASS。

```bash
git add src/main/logo/logoRefinementPromptCompiler.ts src/main/logo/logoRefinementPromptCompiler.test.ts src/shared/ipc.ts src/preload/index.ts src/preload/index.test.ts src/renderer/src/api/bloomCanvasClient.ts src/main/ipc/registerIpcHandlers.ts
git commit -m "feat: compile logo refinement prompts"
```

## 任务 8：实现完整修改与导出步骤

**文件：**
- 创建：`src/renderer/src/components/logo/LogoRefinementPanel.tsx`
- 创建：`src/renderer/src/components/logo/LogoRefinementPanel.test.tsx`
- 修改：`src/renderer/src/components/logo/LogoWorkflowPanel.tsx`
- 修改：`src/renderer/src/components/logo/LogoWorkflowPanel.test.tsx`
- 删除：`src/renderer/src/components/logo/LogoQuickRefinementStep.tsx`

- [ ] **步骤 1：先写保持结构和组合标测试**

```tsx
test('defaults to preserving structure and creates an image-to-image branch', async () => {
  renderRefinementPanel({ selectedCandidate: candidate })
  expect(screen.getByRole('switch', { name: '保持结构' })).toBeChecked()
  fireEvent.change(screen.getByLabelText('修改要求'), { target: { value: '改成蓝色' } })
  fireEvent.click(screen.getByRole('button', { name: '生成修改版本' }))

  await waitFor(() => expect(bloomCanvasClient.generations.create).toHaveBeenCalledWith(
    expect.objectContaining({
      referenceAssetIds: [candidate.asset.id],
      scenarioMetadata: expect.objectContaining({
        parentVariantId: candidate.id,
        refinementMode: 'preserve-structure',
        refinementOperation: 'custom'
      })
    })
  ))
})

test('offers exact brand-name preview only for supported second-stage types', () => {
  renderRefinementPanel({ logoType: 'combination-mark' })
  expect(screen.getByRole('button', { name: '增加品牌文字' })).toBeInTheDocument()
  rerenderRefinementPanel({ logoType: 'emblem' })
  expect(screen.getByRole('button', { name: '增加徽章文字' })).toBeInTheDocument()
  rerenderRefinementPanel({ logoType: 'symbol-mark' })
  expect(screen.queryByRole('button', { name: /增加.*文字/ })).not.toBeInTheDocument()
})

test('keeps parent and child variants in version history', () => {
  renderRefinementPanel({ selectedCandidate: candidate, generations: [parentGeneration, childGeneration] })
  expect(screen.getByText('原始候选')).toBeInTheDocument()
  expect(screen.getByText('修改版本 1')).toBeInTheDocument()
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test:run src/renderer/src/components/logo/LogoRefinementPanel.test.tsx`

预期：FAIL，完整修改组件不存在。

- [ ] **步骤 3：实现修改面板**

第四步展示选中大图和真实可用性预览。主编辑区包含：`Switch`“保持结构”（关闭即继续探索）、修改要求输入、表现风格选项；唯一主按钮是“生成修改版本”。按需操作放在次要操作区：组合标显示“增加品牌文字”，徽章显示“增加徽章文字”，另有适用时的横版组合、2.5D 应用版、黑白版本；按钮使用现有 Ant Design 图标并有 tooltip。

生成流程先调用 `logoPrompt.buildRefinement()`，再调用 `generations.create()`；`referenceAssetIds` 只含选中父候选 asset，`scenarioMetadata` 复制父记录的 V2 快照并更新 `parentVariantId`、mode、operation、Prompt direction 和 `candidateIndex`。每次修改创建新 generation/variant，绝不覆盖父图片。

版本历史按 `parentVariantId` 建立一层可见分支；选中任一子版本后可继续从它生成下一层。导出始终导出当前选中版本。组合标文字、字标和徽章文字结果旁显示“AI 文字组合为光栅设计草案”的中性提示。

- [ ] **步骤 4：替换工作流第四步并验证**

删除 `LogoQuickRefinementStep`，`LogoWorkflowPanel` 改用 `LogoRefinementPanel`。从第三步选择候选时保存 `selectedCandidateId` 和 `workflowStep: 'refinement'`；删除候选后如果 ID 无效，回退到“生成与筛选”并要求重新选择，不显示破图。

运行：

```bash
pnpm test:run src/renderer/src/components/logo/LogoRefinementPanel.test.tsx src/renderer/src/components/logo/LogoWorkflowPanel.test.tsx
```

预期：PASS。

- [ ] **步骤 5：提交**

```bash
git add src/renderer/src/components/logo/LogoRefinementPanel.tsx src/renderer/src/components/logo/LogoRefinementPanel.test.tsx src/renderer/src/components/logo/LogoWorkflowPanel.tsx src/renderer/src/components/logo/LogoWorkflowPanel.test.tsx
git rm src/renderer/src/components/logo/LogoQuickRefinementStep.tsx
git commit -m "feat: add branched logo refinement workflow"
```

## 任务 9：完成视觉样式和全流程验收

**文件：**
- 修改：`src/renderer/src/assets/main.css`

- [ ] **步骤 1：实现稳定布局**

评审 badge 固定最小高度，分数用紧凑列表而不是大号仪表盘。七格可用性预览使用 `repeat(auto-fit, minmax(88px, 1fr))`；图片容器保持 1:1。修改面板桌面为主图与控制区两列，小于 980px 改单列。版本历史缩略图固定 72px，不因错误、加载或 hover 改变轨道尺寸。继续使用 Ant Design 默认蓝色主题，不增加新的主色。

- [ ] **步骤 2：运行完整自动化验证**

运行：

```bash
pnpm test:run src/shared/schemas.test.ts src/main/logo src/main/services/openAIResponsesClient.test.ts src/main/services/logoProjectService.test.ts src/main/services/generationService.test.ts src/preload/index.test.ts src/renderer/src/components/logo src/renderer/src/components/AppShell.test.tsx
pnpm typecheck
pnpm lint
pnpm build
```

预期：全部 PASS；没有新增 lint warning；Electron 构建成功。

- [ ] **步骤 3：对支持视觉模型的 Provider 冒烟验证**

运行：`pnpm dev`。质量优先生成 6 张，确认图片逐张出现；评审 badge 随后出现；推荐项排前；不建议项仍可展开；全不建议时最多只自动重试一轮；组合标先得到纯图形，选定后“增加品牌文字”只出现完整品牌名；保持结构修改产生子版本且原图保留。

- [ ] **步骤 4：对不支持视觉模型的自定义 Provider 冒烟验证**

使用一个能生图但拒绝 `input_image` 的兼容 Provider。确认所有成功图片保留；界面显示“当前供应商未执行 AI 视觉评审”；没有五项分数；不触发全量质量重试；32px/64px/灰度/黑白/反白预览仍可用。

- [ ] **步骤 5：提交检查点**

```bash
git add src/renderer/src/assets/main.css
git commit -m "style: refine logo review and editing UI"
```

完成本计划后，评审与修改检查点必须满足：本地预览和 AI 评审边界真实；任何评审故障不破坏生成结果；自动质量重试至多一次；组合标遵守先图形后文字；每次修改形成可追溯的新分支；用户可从任一版本继续修改或导出。
