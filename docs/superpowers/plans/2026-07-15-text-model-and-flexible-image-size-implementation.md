# 文字模型与灵活图像尺寸实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 默认使用 `gpt-5.6-terra` 和 High 推理处理全部文字请求，并让 `gpt-image-2` 在通用创作与 Logo 创作中支持经过双层校验的灵活尺寸。

**架构：** 文字请求继续统一经过 `OpenAIResponsesClient`，由该边界固定添加 High 推理参数。图像尺寸由共享纯函数定义格式、能力识别和约束，Renderer 复用一个受控 Ant Design 尺寸组件，Main 在网络请求前再次执行模型能力校验。

**技术栈：** Electron 39、React 19、TypeScript 5、Ant Design 6、Zod 4、Vitest、Testing Library。

---

## 当前工作树前提

`src/main/services/promptOptimizeService.ts` 与对应测试已经按 TDD 修复 Responses 嵌套文字解析，但尚未提交。本计划任务 1 会把该修复与统一 High 请求一起验证并提交。当前本机 Provider 已保存 `promptModel: "gpt-5.6-terra"`，任务 6 只验证，不再次改写数据。

## 文件结构

- 创建：`src/shared/providerDefaults.ts`
  - 保存新建 Provider 的默认文字模型，避免 UI 内散落模型字符串。
- 创建：`src/shared/imageSize.ts`
  - 定义尺寸类型、预设、解析、通用约束和模型能力校验。
- 创建：`src/shared/imageSize.test.ts`
  - 覆盖灵活尺寸边界和模型能力。
- 创建：`src/renderer/src/components/ImageSizeControl.tsx`
  - 通用创作与 Logo 创作共享的受控尺寸选择器。
- 创建：`src/renderer/src/components/ImageSizeControl.test.tsx`
  - 覆盖预设、自定义输入和非灵活模型降级。
- 创建：`src/renderer/src/components/ProviderSettingsModal.test.tsx`
  - 验证新 Provider 默认模型和已有 Provider 保留行为。
- 修改：`src/main/services/openAIResponsesClient.ts`
  - 为所有文字请求添加 High 推理参数。
- 修改：`src/main/services/openAIResponsesClient.test.ts`
  - 锁定 Responses 请求体。
- 修改：`src/main/services/promptOptimizeService.ts`
- 修改：`src/main/services/promptOptimizeService.test.ts`
  - 纳入已完成的嵌套响应与空文本回归修复。
- 修改：`src/renderer/src/components/ProviderSettingsModal.tsx`
  - 使用默认文字模型并修正字段名称。
- 修改：`src/shared/types.ts`
  - 让 `GenerationParameters.size` 使用共享 `GenerationSize`。
- 修改：`src/shared/schemas.ts`
  - 用共享约束替换固定尺寸枚举。
- 修改：`src/shared/schemas.test.ts`
  - 验证自定义尺寸 Schema。
- 修改：`src/main/services/openAICompatibleProvider.ts`
  - 在网络请求前执行模型能力校验。
- 修改：`src/main/services/openAICompatibleProvider.test.ts`
  - 验证合法尺寸透传、错误模型和非法尺寸不发请求。
- 修改：`src/renderer/src/components/CreationPanel.tsx`
- 修改：`src/renderer/src/components/CreationPanel.test.tsx`
- 修改：`src/renderer/src/components/logo/LogoCreationPanel.tsx`
- 修改：`src/renderer/src/components/logo/LogoCreationPanel.test.tsx`
  - 两处创作表单改用共享尺寸控件。
- 修改：`src/renderer/src/assets/main.css`
  - 稳定自定义宽高输入布局。

## 任务 1：统一文字响应解析与 High 推理参数

**文件：**
- 修改：`src/main/services/openAIResponsesClient.ts`
- 修改：`src/main/services/openAIResponsesClient.test.ts`
- 修改：`src/main/services/promptOptimizeService.ts`
- 修改：`src/main/services/promptOptimizeService.test.ts`

- [ ] **步骤 1：把 High 推理写入现有精确请求测试**

在 `openAIResponsesClient.test.ts` 的 `posts the exact Responses request` 测试中把期望 body 改为：

```ts
body: JSON.stringify({
  model: logoTestProvider.promptModel,
  reasoning: { effort: 'high' },
  input
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：

```bash
pnpm test:run src/main/services/openAIResponsesClient.test.ts src/main/services/promptOptimizeService.test.ts
```

预期：High 请求断言 FAIL；提示词优化的嵌套响应、空文本保护测试保持 PASS。

- [ ] **步骤 3：在唯一文字请求边界添加 High**

把 `OpenAIResponsesClient.createText()` 的 body 改为：

```ts
body: JSON.stringify({
  model: provider.promptModel,
  reasoning: { effort: 'high' },
  input
})
```

保留现有顶层 `output_text`、嵌套 `output[].content[].text` 和空文本错误处理。`PromptOptimizeService` 继续复用该客户端，不再自行 `fetch`。

- [ ] **步骤 4：运行文字服务测试确认通过**

运行：

```bash
pnpm test:run src/main/services/openAIResponsesClient.test.ts src/main/services/promptOptimizeService.test.ts src/main/logo/logoStrategyService.test.ts
```

预期：全部 PASS；Logo 策略和通用优化都经过同一个 High 请求边界。

- [ ] **步骤 5：提交文字请求修复**

```bash
git add src/main/services/openAIResponsesClient.ts src/main/services/openAIResponsesClient.test.ts src/main/services/promptOptimizeService.ts src/main/services/promptOptimizeService.test.ts
git commit -m "fix: unify high-reasoning text requests"
```

## 任务 2：设置新 Provider 的默认文字模型

**文件：**
- 创建：`src/shared/providerDefaults.ts`
- 创建：`src/renderer/src/components/ProviderSettingsModal.test.tsx`
- 修改：`src/renderer/src/components/ProviderSettingsModal.tsx`

- [ ] **步骤 1：编写默认值与保留值测试**

创建 `ProviderSettingsModal.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import type { ProviderConfig } from '../../../shared/types'
import { ProviderSettingsModal } from './ProviderSettingsModal'

vi.mock('../api/bloomCanvasClient', () => ({
  bloomCanvasClient: { providers: { save: vi.fn() } }
}))

const existing: ProviderConfig = {
  id: 'provider-1',
  name: 'Existing',
  baseUrl: 'https://api.example.test/v1',
  imageModel: 'gpt-image-2',
  promptModel: 'custom-text-model',
  hasApiKey: true,
  createdAt: '2026-07-15T00:00:00.000Z',
  updatedAt: '2026-07-15T00:00:00.000Z'
}

describe('ProviderSettingsModal', () => {
  test('defaults a new provider to gpt-5.6-terra', async () => {
    render(<ProviderSettingsModal open provider={null} onClose={vi.fn()} onSaved={vi.fn()} onError={vi.fn()} />)
    expect(await screen.findByLabelText('策略与提示词模型')).toHaveValue('gpt-5.6-terra')
  })

  test('preserves an existing provider text model', async () => {
    render(<ProviderSettingsModal open provider={existing} onClose={vi.fn()} onSaved={vi.fn()} onError={vi.fn()} />)
    expect(await screen.findByLabelText('策略与提示词模型')).toHaveValue('custom-text-model')
  })
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test:run src/renderer/src/components/ProviderSettingsModal.test.tsx`

预期：FAIL，新建 Provider 当前得到空字符串，标签仍为“提示词优化模型”。

- [ ] **步骤 3：定义并使用默认模型常量**

创建 `src/shared/providerDefaults.ts`：

```ts
export const DEFAULT_PROMPT_MODEL = 'gpt-5.6-terra'
```

在 `ProviderSettingsModal.tsx` 中导入常量，并改为：

```tsx
promptModel: provider?.promptModel ?? DEFAULT_PROMPT_MODEL
```

字段使用：

```tsx
<Form.Item label="策略与提示词模型" name="promptModel">
  <Input placeholder={DEFAULT_PROMPT_MODEL} />
</Form.Item>
```

- [ ] **步骤 4：运行 Provider 设置测试确认通过**

运行：`pnpm test:run src/renderer/src/components/ProviderSettingsModal.test.tsx`

预期：2 个测试 PASS。

- [ ] **步骤 5：提交默认值改动**

```bash
git add src/shared/providerDefaults.ts src/renderer/src/components/ProviderSettingsModal.tsx src/renderer/src/components/ProviderSettingsModal.test.tsx
git commit -m "feat: default text strategy model"
```

## 任务 3：建立共享灵活尺寸契约

**文件：**
- 创建：`src/shared/imageSize.ts`
- 创建：`src/shared/imageSize.test.ts`
- 修改：`src/shared/types.ts`
- 修改：`src/shared/schemas.ts`
- 修改：`src/shared/schemas.test.ts`

- [ ] **步骤 1：编写尺寸能力与边界测试**

创建 `imageSize.test.ts`，覆盖：

```ts
import { describe, expect, test } from 'vitest'
import {
  getImageSizeError,
  getImageSizeModelError,
  parseImageSize,
  supportsFlexibleImageSize
} from './imageSize'

test.each(['gpt-image-2', 'gpt-image-2-2026-04-21'])(
  'recognizes %s as flexible',
  (model) => expect(supportsFlexibleImageSize(model)).toBe(true)
)

test('parses a valid flexible size', () => {
  expect(parseImageSize('1536x864')).toEqual({ width: 1536, height: 864 })
  expect(getImageSizeError('1536x864')).toBeNull()
})

test.each([
  ['1537x864', '16 的倍数'],
  ['3072x512', '1:3 到 3:1'],
  ['3856x1024', '单边不得超过 3840'],
  ['3840x2176', '总像素不得超过']
])('rejects %s', (size, message) => {
  expect(getImageSizeError(size)).toContain(message)
})

test('blocks a flexible-only preset for older models', () => {
  expect(getImageSizeModelError('gpt-image-1.5', '1536x864')).toContain('不支持自定义尺寸')
  expect(getImageSizeModelError('gpt-image-1.5', '1024x1024')).toBeNull()
})
```

在 `schemas.test.ts` 增加一个接受 `1536x864` 和一个拒绝 `1537x864` 的 `generationParametersSchema` 测试。

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test:run src/shared/imageSize.test.ts src/shared/schemas.test.ts`

预期：FAIL，共享尺寸模块不存在且 Schema 仍是固定枚举。

- [ ] **步骤 3：实现尺寸类型、预设和校验**

创建 `src/shared/imageSize.ts`：

```ts
export type GenerationSize = 'auto' | `${number}x${number}`

export const STANDARD_IMAGE_SIZES = ['1024x1024', '1024x1536', '1536x1024'] as const
export const FLEXIBLE_IMAGE_SIZE_PRESETS = [
  ...STANDARD_IMAGE_SIZES,
  '1536x864',
  '864x1536'
] as const

const MAX_EDGE = 3840
const MAX_PIXELS = 3840 * 2160

export function supportsFlexibleImageSize(imageModel: string): boolean {
  return imageModel === 'gpt-image-2' || imageModel.startsWith('gpt-image-2-')
}

export function parseImageSize(size: string): { width: number; height: number } | null {
  const match = /^(\d+)x(\d+)$/.exec(size)
  if (!match) return null
  return { width: Number(match[1]), height: Number(match[2]) }
}

export function getImageSizeError(size: string): string | null {
  if (size === 'auto') return null
  const parsed = parseImageSize(size)
  if (!parsed || parsed.width < 1 || parsed.height < 1) return '尺寸格式必须为 WIDTHxHEIGHT'
  const { width, height } = parsed
  if (width % 16 !== 0 || height % 16 !== 0) return '宽和高都必须是 16 的倍数'
  const ratio = width / height
  if (ratio < 1 / 3 || ratio > 3) return '宽高比必须在 1:3 到 3:1 之间'
  if (width > MAX_EDGE || height > MAX_EDGE) return '单边不得超过 3840'
  if (width * height > MAX_PIXELS) return `总像素不得超过 ${MAX_PIXELS}`
  return null
}

export function getImageSizeModelError(imageModel: string, size: string): string | null {
  const constraintError = getImageSizeError(size)
  if (constraintError) return constraintError
  if (supportsFlexibleImageSize(imageModel) || size === 'auto') return null
  if ((STANDARD_IMAGE_SIZES as readonly string[]).includes(size)) return null
  return `图像模型 ${imageModel} 不支持自定义尺寸`
}
```

在 `types.ts` 导入 `GenerationSize`，把 `GenerationParameters.size` 改为 `GenerationSize`。在 `schemas.ts` 导入 `getImageSizeError`，用 `z.string().superRefine()` 返回同一条错误消息，替换固定 `z.enum()`。

- [ ] **步骤 4：运行共享测试确认通过**

运行：`pnpm test:run src/shared/imageSize.test.ts src/shared/schemas.test.ts`

预期：全部 PASS。

- [ ] **步骤 5：提交共享尺寸契约**

```bash
git add src/shared/imageSize.ts src/shared/imageSize.test.ts src/shared/types.ts src/shared/schemas.ts src/shared/schemas.test.ts
git commit -m "feat: define flexible image sizes"
```

## 任务 4：在 Main 网络边界校验模型尺寸能力

**文件：**
- 修改：`src/main/services/openAICompatibleProvider.ts`
- 修改：`src/main/services/openAICompatibleProvider.test.ts`

- [ ] **步骤 1：编写透传与拒绝测试**

在 `openAICompatibleProvider.test.ts` 增加：

```ts
it('forwards a valid gpt-image-2 flexible size', async () => {
  const fetchMock = successfulImageFetch()
  vi.stubGlobal('fetch', fetchMock)

  await new OpenAICompatibleProvider().generateImages({
    ...createRequest(),
    parameters: { ...createRequest().parameters, size: '1536x864' }
  })

  expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toMatchObject({ size: '1536x864' })
})

it('rejects unsupported model sizes before calling the provider', async () => {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)

  await expect(
    new OpenAICompatibleProvider().generateImages({
      ...createRequest(),
      provider: { ...createRequest().provider, imageModel: 'gpt-image-1.5' },
      parameters: { ...createRequest().parameters, size: '1536x864' }
    })
  ).rejects.toThrow('不支持自定义尺寸')
  expect(fetchMock).not.toHaveBeenCalled()
})
```

同时增加 `1537x864` 非 16 倍数测试，并断言 `fetch` 未调用。若测试文件没有 `successfulImageFetch()`，先从现有成功响应 mock 提取该无参数 helper，再供原测试和新测试复用。

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test:run src/main/services/openAICompatibleProvider.test.ts`

预期：合法尺寸已能透传；两个非法场景 FAIL，因为 Main 尚未阻止请求。

- [ ] **步骤 3：在请求循环前执行能力校验**

在 `generateImages()` 读取 endpoint 之前加入：

```ts
const sizeError = getImageSizeModelError(request.provider.imageModel, request.parameters.size)
if (sizeError) throw new Error(sizeError)
```

从 `../../shared/imageSize` 导入 `getImageSizeModelError`。校验必须发生在任何 `fetch`、文件读取或循环之前。

- [ ] **步骤 4：运行 Provider 测试确认通过**

运行：`pnpm test:run src/main/services/openAICompatibleProvider.test.ts src/main/services/generationService.test.ts`

预期：全部 PASS，合法自定义尺寸原样透传，非法尺寸没有网络调用。

- [ ] **步骤 5：提交 Main 防线**

```bash
git add src/main/services/openAICompatibleProvider.ts src/main/services/openAICompatibleProvider.test.ts
git commit -m "fix: validate provider image sizes"
```

## 任务 5：实现共享尺寸控件

**文件：**
- 创建：`src/renderer/src/components/ImageSizeControl.tsx`
- 创建：`src/renderer/src/components/ImageSizeControl.test.tsx`
- 修改：`src/renderer/src/assets/main.css`

- [ ] **步骤 1：编写控件行为测试**

创建测试并覆盖以下行为：

```tsx
test('shows flexible presets and custom inputs for gpt-image-2', () => {
  render(<ImageSizeControl imageModel="gpt-image-2" value="1024x1024" onChange={vi.fn()} />)
  fireEvent.mouseDown(screen.getByRole('combobox', { name: '图像尺寸' }))
  expect(screen.getByText('1536 x 864')).toBeInTheDocument()
  fireEvent.click(screen.getByText('自定义'))
  expect(screen.getByLabelText('自定义宽度')).toBeInTheDocument()
  expect(screen.getByLabelText('自定义高度')).toBeInTheDocument()
})

test('hides flexible options for older image models', () => {
  render(<ImageSizeControl imageModel="gpt-image-1.5" value="1024x1024" onChange={vi.fn()} />)
  fireEvent.mouseDown(screen.getByRole('combobox', { name: '图像尺寸' }))
  expect(screen.queryByText('自定义')).not.toBeInTheDocument()
  expect(screen.queryByText('1536 x 864')).not.toBeInTheDocument()
})

test('emits normalized width and height from custom inputs', () => {
  const onChange = vi.fn()
  render(<ImageSizeControl imageModel="gpt-image-2" value="1024x1024" onChange={onChange} />)
  fireEvent.mouseDown(screen.getByRole('combobox', { name: '图像尺寸' }))
  fireEvent.click(screen.getByText('自定义'))
  fireEvent.change(screen.getByLabelText('自定义宽度'), { target: { value: '1536' } })
  fireEvent.change(screen.getByLabelText('自定义高度'), { target: { value: '864' } })
  expect(onChange).toHaveBeenLastCalledWith('1536x864')
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm test:run src/renderer/src/components/ImageSizeControl.test.tsx`

预期：FAIL，组件不存在。

- [ ] **步骤 3：实现受控尺寸组件**

组件契约固定为：

```ts
interface ImageSizeControlProps {
  imageModel?: string
  value?: GenerationSize
  onChange?: (value: GenerationSize) => void
}
```

使用 `Select` 渲染标准或灵活预设；灵活模型额外渲染 `value: 'custom'`。选择自定义后，用内部 `customSelected` 状态保持模式，并渲染两个 `InputNumber`：`min={16}`、`max={3840}`、`step={16}`。初始宽高从当前非预设尺寸解析，否则为 `1024`。

每个数字变化时更新本地宽高；两者都有值时调用：

```ts
onChange?.(`${nextWidth}x${nextHeight}` as GenerationSize)
```

当 `imageModel` 变为非灵活模型且当前值不是标准尺寸时，退出自定义模式并调用 `onChange?.('1024x1024')`。Select 使用 `aria-label="图像尺寸"`，两个 InputNumber 分别使用 `aria-label="自定义宽度"` 和 `aria-label="自定义高度"`。

- [ ] **步骤 4：添加稳定布局样式**

在 `main.css` 增加：

```css
.image-size-control {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.image-size-custom-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
}

.image-size-custom-fields .ant-input-number {
  width: 100%;
}
```

- [ ] **步骤 5：运行控件测试确认通过**

运行：`pnpm test:run src/renderer/src/components/ImageSizeControl.test.tsx`

预期：全部 PASS，无 act 警告和可访问性查询失败。

- [ ] **步骤 6：提交共享控件**

```bash
git add src/renderer/src/components/ImageSizeControl.tsx src/renderer/src/components/ImageSizeControl.test.tsx src/renderer/src/assets/main.css
git commit -m "feat: add flexible image size control"
```

## 任务 6：接入通用创作与 Logo 创作并完成验证

**文件：**
- 修改：`src/renderer/src/components/CreationPanel.tsx`
- 修改：`src/renderer/src/components/CreationPanel.test.tsx`
- 修改：`src/renderer/src/components/logo/LogoCreationPanel.tsx`
- 修改：`src/renderer/src/components/logo/LogoCreationPanel.test.tsx`
- 验证：`/Users/peter/Library/Application Support/bloom-canvas/BloomCanvasData/bloom-canvas.json`

- [ ] **步骤 1：编写两处接入测试**

分别在通用创作和 Logo 创作测试中使用 `imageModel: 'gpt-image-2'` 的 Provider，打开“尺寸”控件后断言存在“自定义”和“1536 x 864”。再增加一个通用创作测试，选择自定义并输入 `1536`、`864`，点击生成后断言：

```ts
expect(bloomCanvasClient.generations.create).toHaveBeenCalledWith(
  expect.objectContaining({
    parameters: expect.objectContaining({ size: '1536x864' })
  })
)
```

- [ ] **步骤 2：运行接入测试确认失败**

运行：

```bash
pnpm test:run src/renderer/src/components/CreationPanel.test.tsx src/renderer/src/components/logo/LogoCreationPanel.test.tsx
```

预期：FAIL，两处仍使用固定 Select。

- [ ] **步骤 3：替换两处重复尺寸 Select**

在两个组件中删除尺寸 `Select` 的内联 `options`，改为：

```tsx
<Form.Item
  label="尺寸"
  name="size"
  rules={[
    {
      validator: async (_, value: string) => {
        const error = getImageSizeModelError(activeProvider?.imageModel ?? '', value)
        if (error) throw new Error(error)
      }
    }
  ]}
  style={{ flex: 1 }}
>
  <ImageSizeControl imageModel={activeProvider?.imageModel} />
</Form.Item>
```

导入 `getImageSizeModelError` 和 `ImageSizeControl`。保留相邻的数量字段宽度、默认尺寸和生成参数传递逻辑。

- [ ] **步骤 4：运行 Renderer 测试确认通过**

运行：

```bash
pnpm test:run src/renderer/src/components/ImageSizeControl.test.tsx src/renderer/src/components/CreationPanel.test.tsx src/renderer/src/components/logo/LogoCreationPanel.test.tsx src/renderer/src/components/AppShell.test.tsx
```

预期：全部 PASS。

- [ ] **步骤 5：验证当前本机 Provider**

只读取不打印凭据：

```bash
jq '{providers: [.providers[] | {id, imageModel, promptModel, hasApiKey}], defaultProviderId: .settings.defaultProviderId}' \
  '/Users/peter/Library/Application Support/bloom-canvas/BloomCanvasData/bloom-canvas.json'
```

预期：默认 Provider 的 `imageModel` 为 `gpt-image-2`、`promptModel` 为 `gpt-5.6-terra`、`hasApiKey` 为 `true`。如果 `promptModel` 已是目标值，不写文件；只有仍为旧值时才通过现有 Provider 设置保存语义更新，保留 ID、URL、图像模型和凭据。

- [ ] **步骤 6：运行完整验证**

运行：

```bash
pnpm test:run
pnpm typecheck
pnpm lint
pnpm build
```

预期：全部退出码为 0；测试无失败，Node/Web 类型检查通过，ESLint 无错误，Electron 构建成功。

- [ ] **步骤 7：提交两处接入**

```bash
git add src/renderer/src/components/CreationPanel.tsx src/renderer/src/components/CreationPanel.test.tsx src/renderer/src/components/logo/LogoCreationPanel.tsx src/renderer/src/components/logo/LogoCreationPanel.test.tsx
git commit -m "feat: use flexible sizes in creation flows"
```

- [ ] **步骤 8：手工冒烟验证**

运行：`pnpm dev`

依次验证：Provider 新建表单默认显示 `gpt-5.6-terra`；通用优化请求成功；`gpt-image-2` 尺寸列表显示宽屏、竖屏和自定义；输入 `1536 x 864` 能生成；输入非 16 倍数时表单内阻止生成；Logo 创作显示相同尺寸能力；切换到非 `gpt-image-2` 模型后自定义入口消失。
