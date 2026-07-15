# 图片与 Logo 项目删除实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 支持结果图精确批量删除、空 Logo 项目删除，并修复 Logo 参考图状态串用和不可预览。

**架构：** 删除行为在主进程 Service 中保证引用与项目关系一致性，再通过类型化 IPC 暴露给 Renderer。界面只管理选择状态和确认流程；参考图状态按通用草稿与当前 Logo 项目分别持有。

**技术栈：** Electron、TypeScript、React 19、Ant Design 6、Vitest、Testing Library

---

### 任务 1：Variant 级批量删除

**文件：**
- 修改：`src/main/services/generationService.ts`
- 测试：`src/main/services/generationService.test.ts`

- [ ] **步骤 1：编写失败测试**：覆盖同次生成部分删除、最后一张删除后清理 Generation、被下游引用 Asset 不删除。
- [ ] **步骤 2：运行 `pnpm test:run src/main/services/generationService.test.ts`**，确认因 `removeVariants` 不存在而失败。
- [ ] **步骤 3：实现 `removeVariants(variantIds: string[]): Promise<void>`**，原子更新 State，并只删除无引用 Asset 文件。
- [ ] **步骤 4：重用同一清理逻辑实现已有 `remove(generationId)`，运行服务测试确认通过。**

### 任务 2：空 Logo 项目删除

**文件：**
- 修改：`src/main/services/logoProjectService.ts`
- 测试：`src/main/services/logoProjectService.test.ts`

- [ ] **步骤 1：编写失败测试**：空项目可删除；仍有有效 Variant 的项目拒绝删除。
- [ ] **步骤 2：运行 `pnpm test:run src/main/services/logoProjectService.test.ts`**，确认因 `remove` 不存在而失败。
- [ ] **步骤 3：实现 `remove(id: LogoProjectId): Promise<void>`**，服务端重新计算项目有效结果。
- [ ] **步骤 4：运行服务测试确认通过。**

### 任务 3：打通 IPC 与客户端

**文件：**
- 修改：`src/shared/ipc.ts`
- 修改：`src/main/ipc/registerIpcHandlers.ts`
- 修改：`src/preload/index.ts`
- 修改：`src/renderer/src/api/bloomCanvasClient.ts`
- 测试：`src/preload/index.test.ts`

- [ ] **步骤 1：先补 IPC 暴露失败测试**：断言 `generation:removeVariants` 与 `logoProject:remove` 通道存在。
- [ ] **步骤 2：运行测试确认失败。**
- [ ] **步骤 3：增加 `generations.removeVariants` 和 `logoProjects.remove` 的类型、handler、bridge 与 unwrap client。**
- [ ] **步骤 4：运行 preload、类型检查确认通过。**

### 任务 4：批量选择界面

**文件：**
- 修改：`src/renderer/src/components/GalleryPanel.tsx`
- 修改：`src/renderer/src/components/logo/LogoResultsPanel.tsx`
- 修改：`src/renderer/src/components/AppShell.tsx`
- 修改：`src/renderer/src/assets/main.css`
- 测试：`src/renderer/src/components/GalleryPanel.test.tsx`
- 测试：`src/renderer/src/components/logo/LogoResultsPanel.test.tsx`

- [ ] **步骤 1：编写失败交互测试**：进入选择、勾选/全选、确认后传出 Variant ID 数组。
- [ ] **步骤 2：运行两个组件测试确认失败。**
- [ ] **步骤 3：实现固定高度选择工具栏、卡片复选覆盖层与统一确认 Modal。**
- [ ] **步骤 4：AppShell 调用新 API 并刷新；运行组件测试确认通过。**

### 任务 5：项目删除和参考图隔离

**文件：**
- 修改：`src/renderer/src/components/logo/LogoProjectPanel.tsx`
- 修改：`src/renderer/src/components/logo/LogoCreationPanel.tsx`
- 修改：`src/renderer/src/components/AppShell.tsx`
- 修改：`src/renderer/src/assets/main.css`
- 测试：`src/renderer/src/components/logo/LogoProjectPanel.test.tsx`
- 测试：`src/renderer/src/components/logo/LogoCreationPanel.test.tsx`
- 测试：`src/renderer/src/components/AppShell.test.tsx`

- [ ] **步骤 1：编写失败测试**：非空项目删除禁用、空项目确认删除、Logo 项目按自身 ID 恢复参考图、新建项目无参考图、缩略图可预览和单张移除。
- [ ] **步骤 2：运行相关组件测试确认失败。**
- [ ] **步骤 3：拆分 `generalReferenceAssets` 与 `logoReferenceAssets`，选择项目时从已加载 Asset 建立映射。**
- [ ] **步骤 4：在 Logo 面板复用通用参考图缩略图交互；接入项目删除并刷新选择状态。**
- [ ] **步骤 5：运行相关组件测试确认通过。**

### 任务 6：完整验证与交付

**文件：**
- 检查：以上所有修改文件

- [ ] **步骤 1：运行 `pnpm test:run`，预期全部测试通过。**
- [ ] **步骤 2：运行 `pnpm typecheck && pnpm lint && pnpm build`，预期退出码均为 0。**
- [ ] **步骤 3：运行 `antd lint` 检查修改的 Ant Design 组件。**
- [ ] **步骤 4：在 Electron 开发页验证批量选择、删除项目、Logo 参考图预览且无布局重叠。**
- [ ] **步骤 5：检查 `git diff --check` 与变更范围，提交并推送 `codex/bloom-canvas-mvp`。**
