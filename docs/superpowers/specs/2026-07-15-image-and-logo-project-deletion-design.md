# 图片与 Logo 项目删除设计

## 目标

让通用创作和 Logo 设计的结果图支持按单张勾选后批量删除；当 Logo 项目不再包含任何结果图时允许删除项目；修复 Logo 设计错误复用通用创作参考图且无法预览的问题。

## 方案选择

采用 Variant 级删除。批量操作只删除用户勾选的结果图；当某个 Generation 的最后一个 Variant 被删除时，自动删除空 Generation，并同步清理 Logo 项目的 `generationIds` 与 `favoriteVariantIds`。相比按 Generation 删除，它不会误删同批未勾选结果；相比项目级联删除，它把高风险操作拆成可核对的两步。

## 数据一致性

- `GenerationService.removeVariants(variantIds)` 在一次存储写入中删除 Variant、更新非空 Generation 的 `outputVariantIds`、清理空 Generation，并同步 Logo 项目关联。
- 输出 Asset 只有在不再被任何保留的 Variant、Generation 参考图或 Logo 项目参考图引用时才删除。仍被引用的 Asset 与磁盘文件继续保留。
- `LogoProjectService.remove(id)` 只允许删除没有有效结果图的项目；服务层重新检查当前数据，不能依赖按钮禁用状态。
- 删除项目不会删除用户导入的参考图，也不会删除仍被其他记录引用的 Asset。

## 界面交互

- 通用结果与 Logo 结果使用相同的选择模式：进入“选择”后出现图片复选框、全选/取消全选、已选数量和“删除所选”。删除前统一确认，成功后刷新数据并退出选择模式。
- 原有单次生成历史删除保留，继续用于清理失败记录或整次历史。
- Logo 项目列表的当前项目显示删除按钮。项目有结果图时按钮禁用；结果图清空后启用，点击后再次确认。
- 通用创作草稿参考图与 Logo 项目参考图使用独立状态。选择 Logo 项目时从项目 `referenceImageIds` 恢复对应 Asset；新建 Logo 项目时为空。
- Logo 参考图区域与通用创作一致，显示缩略图、点击预览、单张移除和清空操作。

## 错误处理

空选择不发起删除。不存在的 Variant、项目仍有结果、IPC/文件错误均由服务返回错误，并由 AppShell 显示现有错误提示；文件清理使用强制删除，缺失文件不阻断元数据一致性。

## 测试

- Service：部分删除、最后一张自动清理、跨记录引用保护、空项目删除与非空项目拒绝。
- IPC/Preload/Client：新通道与方法签名完整。
- React：批量选择与确认、项目删除门禁、Logo 项目参考图隔离、缩略图预览与移除。
- 完整执行 Vitest、TypeScript、ESLint、生产构建，并在 Electron 页面做桌面宽度交互验证。
