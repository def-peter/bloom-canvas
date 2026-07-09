# Logo 设计防呆第一阶段实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 完成 Logo 设计体验升级规格的第一阶段低成本修正：Logo 类型主类型单选、默认 2 个方向、最多 3 个方向、提示词加入行业俗套禁用词，并保持当前项目和结果分组结构不变。

**架构：** 保持现有 `LogoProject.logoTypes: LogoType[]` 存储结构以兼容历史项目，但新输入层限制为最多 1 个主类型。Renderer 表单使用单选控件并在保存时转换为 `logoTypes: [logoType]`；Main schema 拒绝多类型输入；提示词编译器将用户输入编译为明确英文设计要求和默认防俗套规则。

**技术栈：** Electron 39、React 19、TypeScript 5、antd 6、Zod、Vitest、Testing Library。

---

## 文件结构

- 修改：`src/shared/schemas.ts`
  - `saveLogoProjectSchema.logoTypes` 从 `max(5)` 改为 `max(1)`。
  - `saveLogoProjectSchema.styleDirections` 从 `max(4)` 改为 `max(3)`。
  - `logoGenerationMetadataSchema.logoTypes` 从无限制改为 `max(1)`。
- 修改：`src/shared/schemas.test.ts`
  - 增加拒绝多个 Logo 类型和超过 3 个风格方向的测试。
- 修改：`src/renderer/src/components/logo/logoConstants.ts`
  - `defaultLogoStyleDirections` 从 3 个改为 2 个：`modern-minimal`、`symbolic-mark`。
- 修改：`src/renderer/src/components/logo/LogoCreationPanel.tsx`
  - 表单内部新增 `logoType: LogoType`。
  - `createInitialValues()` 从历史 `project.logoTypes[0]` 得到主类型。
  - `toProjectInput()` 保存为 `logoTypes: [values.logoType]`。
  - `generateLogoDrafts()` 的 metadata 保存 `[values.logoType]`。
  - `Logo 类型` 控件从 `Checkbox.Group` 改为 `Radio.Group`。
  - `风格方向` validator 改为最多 3 个。
- 修改：`src/renderer/src/components/logo/LogoCreationPanel.test.tsx`
  - 增加主类型单选和保存转换测试。
  - 增加最多 3 个风格方向测试。
- 修改：`src/main/services/logoPromptCompiler.ts`
  - 追加默认防俗套规则：generic upward arrows、bar charts、rockets、gears、network-node clutter、stock-logo swooshes。
  - 颜色偏好写成“solid colors only”，用户写双色时禁止默认渐变。
- 修改：`src/main/services/logoPromptCompiler.test.ts`
  - 增加防俗套规则测试。
  - 增加蓝绿双色不默认渐变测试。
- 修改：`src/main/services/logoProjectService.test.ts`
  - 更新默认方向数量预期。

## 任务 1：收紧共享 schema

**文件：**
- 修改：`src/shared/schemas.test.ts`
- 修改：`src/shared/schemas.ts`

- [ ] **步骤 1：编写失败的 schema 测试**

在 `src/shared/schemas.test.ts` 的 `describe('logo schemas')` 中新增：

```ts
test('rejects more than one logo type', () => {
  expect(() =>
    saveLogoProjectSchema.parse({
      brandName: '生花',
      industry: 'AI 绘图软件',
      businessDescription: '帮助创作者用 AI 生成图片',
      brandKeywords: ['清晰'],
      logoTypes: ['combination-mark', 'symbol-mark'],
      styleDirections: ['modern-minimal'],
      referenceImageIds: []
    })
  ).toThrow()
})

test('rejects more than three style directions', () => {
  expect(() =>
    saveLogoProjectSchema.parse({
      brandName: '生花',
      industry: 'AI 绘图软件',
      businessDescription: '帮助创作者用 AI 生成图片',
      brandKeywords: ['清晰'],
      logoTypes: ['combination-mark'],
      styleDirections: ['modern-minimal', 'symbolic-mark', 'wordmark', 'lettermark'],
      referenceImageIds: []
    })
  ).toThrow()
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
pnpm test:run src/shared/schemas.test.ts
```

预期：FAIL，新增两个测试至少一个失败，说明 schema 仍允许多个 Logo 类型或 4 个风格方向。

- [ ] **步骤 3：实现 schema 收紧**

在 `src/shared/schemas.ts` 中修改：

```ts
logoTypes: z.array(logoTypeSchema).min(1).max(1),
styleDirections: z.array(logoStyleDirectionSchema).min(1).max(3),
```

在 `logoGenerationMetadataSchema` 中修改：

```ts
logoTypes: z.array(logoTypeSchema).min(1).max(1),
```

- [ ] **步骤 4：运行测试验证通过**

运行：

```bash
pnpm test:run src/shared/schemas.test.ts
pnpm typecheck
```

预期：PASS。

- [ ] **步骤 5：Commit**

```bash
git add src/shared/schemas.ts src/shared/schemas.test.ts
git commit -m "feat: restrict logo design choices"
```

## 任务 2：把 Logo 类型改为主类型单选

**文件：**
- 修改：`src/renderer/src/components/logo/logoConstants.ts`
- 修改：`src/renderer/src/components/logo/LogoCreationPanel.tsx`
- 修改：`src/renderer/src/components/logo/LogoCreationPanel.test.tsx`

- [ ] **步骤 1：编写失败的 UI 测试**

在 `LogoCreationPanel.test.tsx` 的 import 区新增：

```ts
import type { ComponentProps } from 'react'
import { bloomCanvasClient } from '../../api/bloomCanvasClient'
```

在 `describe('LogoCreationPanel')` 上方新增：

```tsx
function renderPanel(overrides?: Partial<ComponentProps<typeof LogoCreationPanel>>) {
  return render(
    <App>
      <LogoCreationPanel
        activeProvider={provider}
        project={null}
        referenceAssets={[]}
        settings={null}
        onCreated={vi.fn()}
        onError={vi.fn()}
        onGeneratingChange={vi.fn()}
        onNeedProvider={vi.fn()}
        onProjectSaved={vi.fn()}
        onReferenceAssetsChange={vi.fn()}
        {...overrides}
      />
    </App>
  )
}

test('saves one primary logo type from the radio choice', async () => {
  const save = vi.mocked(bloomCanvasClient.logoProjects.save)
  renderPanel()

  fireEvent.change(screen.getByLabelText('品牌名'), { target: { value: '生花' } })
  fireEvent.change(screen.getByLabelText('行业'), { target: { value: 'AI 绘图软件' } })
  fireEvent.change(screen.getByLabelText('业务描述'), {
    target: { value: '帮助创作者生成图片' }
  })
  fireEvent.change(screen.getByLabelText('品牌关键词'), { target: { value: '清晰' } })
  fireEvent.click(screen.getByText('纯图形图标'))
  fireEvent.click(screen.getByText('生成 Logo 初稿'))

  await waitFor(() => expect(save).toHaveBeenCalled())
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ logoTypes: ['symbol-mark'] }))
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
pnpm test:run src/renderer/src/components/logo/LogoCreationPanel.test.tsx
```

预期：FAIL，因为当前 Logo 类型仍是 Checkbox 多选，不是主类型单选保存。

- [ ] **步骤 3：实现单选表单**

修改 `LogoCreationPanel.tsx`：

```ts
import { Button, Checkbox, Form, Input, InputNumber, Radio, Select, Space, Tooltip, Typography } from 'antd'

interface LogoCreationFormValues {
  logoType: LogoType
  styleDirections: LogoStyleDirectionId[]
  // remove logoTypes from form-only values
}

function createInitialValues(project, settings) {
  return {
    logoType: project?.logoTypes[0] ?? 'combination-mark',
    styleDirections: project?.styleDirections?.slice(0, 3) ?? [...defaultLogoStyleDirections]
  }
}

function toProjectInput(values, project, referenceAssets, promptPack) {
  return {
    logoTypes: [values.logoType],
    styleDirections: values.styleDirections
  }
}
```

把 Logo 类型控件改为：

```tsx
<Form.Item
  label="Logo 类型"
  name="logoType"
  rules={[{ required: true, message: '请选择 Logo 类型' }]}
>
  <Radio.Group options={buildCheckboxOptions(logoTypeOptions)} />
</Form.Item>
```

在 `generateLogoDrafts()` 的 metadata 中改为：

```ts
logoTypes: [values.logoType],
```

- [ ] **步骤 4：默认方向改为 2 个，最多 3 个**

在 `logoConstants.ts` 中修改：

```ts
export const defaultLogoStyleDirections = ['modern-minimal', 'symbolic-mark'] as const
```

在 `LogoCreationPanel.tsx` validator 中修改：

```ts
if (value && value.length > 3) throw new Error('最多选择 3 个风格方向')
```

- [ ] **步骤 5：运行测试验证通过**

运行：

```bash
pnpm test:run src/renderer/src/components/logo/LogoCreationPanel.test.tsx
pnpm typecheck
```

预期：PASS。

- [ ] **步骤 6：Commit**

```bash
git add src/renderer/src/components/logo/logoConstants.ts src/renderer/src/components/logo/LogoCreationPanel.tsx src/renderer/src/components/logo/LogoCreationPanel.test.tsx
git commit -m "feat: use primary logo type selection"
```

## 任务 3：强化提示词防俗套规则

**文件：**
- 修改：`src/main/services/logoPromptCompiler.test.ts`
- 修改：`src/main/services/logoPromptCompiler.ts`

- [ ] **步骤 1：编写失败的提示词测试**

在 `logoPromptCompiler.test.ts` 中新增：

```ts
test('adds default anti-cliche logo rules', () => {
  const pack = buildLogoPromptPack({
    brandName: 'BI 向前冲',
    shortName: 'BI',
    industry: '电商 BI',
    businessDescription: '电商平台 BI 部门',
    brandKeywords: ['可靠', '创造力'],
    preferredColors: ['蓝绿组合双色'],
    logoTypes: ['lettermark'],
    styleDirections: ['modern-minimal'],
    usageScenarios: ['app-icon'],
    referenceImageIds: []
  })

  expect(pack.basePrompt).toContain('two solid colors')
  expect(pack.basePrompt).toContain('no generic upward arrows')
  expect(pack.basePrompt).toContain('no bar charts')
  expect(pack.basePrompt).toContain('no rockets')
  expect(pack.basePrompt).toContain('no gears')
  expect(pack.basePrompt).toContain('no stock-logo swooshes')
  expect(pack.basePrompt).toContain('no gradients unless explicitly requested')
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
pnpm test:run src/main/services/logoPromptCompiler.test.ts
```

预期：FAIL，因为当前 prompt 没有完整 anti-cliche 规则，也没有把蓝绿双色转成 solid colors 表述。

- [ ] **步骤 3：实现防俗套规则**

在 `logoPromptCompiler.ts` 中新增：

```ts
function formatPreferredColors(values: string[] | undefined): string {
  const text = joinList(values)
  if (text.includes('双色') || text.toLowerCase().includes('two')) {
    return `${text}; use two solid colors only, no gradients unless explicitly requested`
  }
  return text === '未指定' ? text : `${text}; solid colors preferred`
}
```

把 preferred colors 行改为：

```ts
`- Preferred colors: ${formatPreferredColors(input.preferredColors)}`,
```

在 hard rules 中追加：

```ts
'- no generic upward arrows, no bar charts, no rockets, no gears',
'- no dense network-node diagrams, no circuit-board details',
'- no stock-logo swooshes, no generic speed lines',
'- no gradients unless explicitly requested',
'- no tiny text, no slogan, no decorative micro-details',
```

- [ ] **步骤 4：运行测试验证通过**

运行：

```bash
pnpm test:run src/main/services/logoPromptCompiler.test.ts
pnpm typecheck
```

预期：PASS。

- [ ] **步骤 5：Commit**

```bash
git add src/main/services/logoPromptCompiler.ts src/main/services/logoPromptCompiler.test.ts
git commit -m "feat: add logo anti-cliche prompt rules"
```

## 任务 4：集成验证

**文件：**
- 按前面任务修改范围

- [ ] **步骤 1：运行完整验证**

运行：

```bash
pnpm typecheck
pnpm test:run
pnpm lint
pnpm build
```

预期：

- typecheck exit 0。
- Vitest 全部测试 PASS。
- ESLint exit 0。
- production build exit 0。

- [ ] **步骤 2：启动开发服务手动检查**

运行：

```bash
pnpm dev
```

预期：

- Electron dev 能启动。
- Logo 类型是单选。
- 默认风格方向只有 2 个。
- 选择第 4 个风格方向时出现最多 3 个的提示。
- 生成的提示词包含防俗套规则。

- [ ] **步骤 3：检查 diff 范围**

运行：

```bash
git status --short
git diff --stat
```

预期：只包含 Logo 防呆第一阶段相关改动。
