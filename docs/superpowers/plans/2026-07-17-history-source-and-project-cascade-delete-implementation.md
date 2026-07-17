# 历史来源标识与 Logo 项目级联删除实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为历史记录增加创作来源标签，并允许用户在确认后直接删除 Logo 项目及其生成图片和历史记录。

**架构：** 渲染层直接使用已有 `GenerationScenario`，不迁移数据。项目删除由 `LogoProjectService` 按 `projectId` 一次性更新元数据，共享资产保留工具负责判断输出文件是否仍被其他创作引用。

**技术栈：** Electron、React 19、TypeScript、Ant Design 6、Vitest、Testing Library

---

## 文件结构

- 创建 `src/main/services/assetRetention.ts`：收集仍被引用的资产 ID，并删除无引用资产文件。
- 修改 `src/main/services/generationService.ts`：复用资产保留工具，保持现有单条/批量删除行为。
- 修改 `src/main/services/logoProjectService.ts`：实现项目级联删除。
- 修改 `src/main/services/logoProjectService.test.ts`：覆盖级联清理、参考图保留、共享输出保留和运行中保护。
- 修改 `src/renderer/src/components/HistoryPanel.tsx` 与测试：渲染来源标签。
- 修改 `src/renderer/src/components/logo/LogoProjectPanel.tsx` 与测试：允许直接删除并展示影响范围。
- 修改 `src/renderer/src/components/AppShell.tsx`：向项目面板传递生成图片数量。
- 修改 `src/renderer/src/assets/main.css`：稳定历史标签与时间的紧凑布局。

### 任务 1：历史记录来源标签

**文件：**
- 修改：`src/renderer/src/components/HistoryPanel.test.tsx`
- 修改：`src/renderer/src/components/HistoryPanel.tsx`
- 修改：`src/renderer/src/assets/main.css`

- [ ] **步骤 1：编写失败测试**

新增一条 `scenario: 'logo-design'` 记录，与旧式通用记录一起渲染，并断言：

```tsx
expect(screen.getByText('通用创作')).toBeInTheDocument()
expect(screen.getByText('Logo 设计')).toBeInTheDocument()
```

- [ ] **步骤 2：验证红灯**

运行：

```bash
pnpm exec vitest run src/renderer/src/components/HistoryPanel.test.tsx
```

预期：FAIL，页面中找不到两个来源标签。

- [ ] **步骤 3：实现最少标签渲染**

在历史元信息行增加：

```tsx
<Tag color={generation.scenario === 'logo-design' ? 'cyan' : 'default'}>
  {generation.scenario === 'logo-design' ? 'Logo 设计' : '通用创作'}
</Tag>
```

失败摘要和时间继续保留在同一条记录中。

- [ ] **步骤 4：验证绿灯**

重新运行该测试文件，预期全部通过。

### 任务 2：项目删除确认交互

**文件：**
- 修改：`src/renderer/src/components/logo/LogoProjectPanel.test.tsx`
- 修改：`src/renderer/src/components/logo/LogoProjectPanel.tsx`
- 修改：`src/renderer/src/components/AppShell.tsx`

- [ ] **步骤 1：编写失败测试**

把布尔属性替换为 `selectedProjectImageCount`，断言有 6 张图片时删除按钮仍可点击，弹窗包含：

```tsx
expect(screen.getByText('将同步删除 6 张生成图片和相关历史记录。')).toBeInTheDocument()
expect(screen.getByText(/用户导入的参考图原文件会保留/)).toBeInTheDocument()
```

保留生成中禁用删除的测试。

- [ ] **步骤 2：验证红灯**

运行：

```bash
pnpm exec vitest run src/renderer/src/components/logo/LogoProjectPanel.test.tsx
```

预期：FAIL，现有按钮仍因图片存在而禁用。

- [ ] **步骤 3：实现最少交互**

删除按钮仅在未选项目或 `generating` 时禁用。`AppShell` 使用：

```ts
const selectedLogoProjectImageCount = selectedLogoProject
  ? generations
      .filter((generation) => generation.projectId === selectedLogoProject.id)
      .reduce((count, generation) => count + generation.variants.length, 0)
  : 0
```

弹窗根据图片数量显示级联删除说明，并明确参考图保留和不可撤销。

- [ ] **步骤 4：验证绿灯**

重新运行项目面板测试，预期全部通过。

### 任务 3：服务层原子级联删除

**文件：**
- 创建：`src/main/services/assetRetention.ts`
- 修改：`src/main/services/generationService.ts`
- 修改：`src/main/services/logoProjectService.ts`
- 修改：`src/main/services/logoProjectService.test.ts`

- [ ] **步骤 1：编写失败测试**

替换“项目有图片时拒绝删除”测试，构造项目生成记录、变体、输出资产和参考图，调用：

```ts
await service.remove(project.id)
```

断言项目生成记录、变体、未复用输出资产和文件被删除，参考图和无关记录保留。再增加一个通用创作引用项目输出资产的用例，断言该输出资产文件保留。

- [ ] **步骤 2：验证红灯**

运行：

```bash
pnpm exec vitest run src/main/services/logoProjectService.test.ts
```

预期：FAIL，当前实现抛出 `Logo project still has images`。

- [ ] **步骤 3：提取资产保留工具**

提供两个生产接口：

```ts
export function collectRetainedAssetIds(
  generations: Generation[],
  variants: Variant[],
  logoProjects: Array<{ referenceImageIds: string[] }>
): Set<string>

export async function removeAssetFiles(assets: Asset[]): Promise<void>
```

`GenerationService` 改为调用这两个接口，删除原私有重复实现。

- [ ] **步骤 4：实现级联删除**

`LogoProjectService.remove()`：

1. 根据 `generation.projectId` 找到项目生成记录。
2. 如存在 `pending`/`running` 状态则抛错且不修改状态。
3. 从下一状态删除项目生成记录、对应变体和项目本身。
4. 仅删除未被下一状态引用的 `output` 资产。
5. 写入元数据后删除这些资产的输出文件与缩略图。

- [ ] **步骤 5：验证绿灯与回归**

运行：

```bash
pnpm exec vitest run src/main/services/logoProjectService.test.ts src/main/services/generationService.test.ts
```

预期：全部通过。

### 任务 4：完整验证

**文件：**
- 检查全部本次修改文件

- [ ] **步骤 1：检查 Ant Design 用法**

运行：

```bash
antd lint src/renderer/src/components/HistoryPanel.tsx --format json
antd lint src/renderer/src/components/logo/LogoProjectPanel.tsx --format json
```

- [ ] **步骤 2：运行完整验证**

运行：

```bash
pnpm exec vitest run --no-file-parallelism
pnpm lint
pnpm typecheck
pnpm build
git diff --check
```

预期：命令退出码均为 0。
