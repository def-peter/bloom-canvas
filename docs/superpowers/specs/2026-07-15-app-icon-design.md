# 应用图标接入设计

## 目标

将 `/Users/peter/Downloads/图片批量处理_20260715_140656` 中的新图标接入 Bloom Canvas，让 Windows、macOS、Linux 安装包以及开发态窗口使用同一套品牌图标。

## 资源方案

- Windows 使用现成的多尺寸 `icon.ico`，保存为 Electron Builder 约定的 `build/icon.ico`。
- `logo.png` 作为高分辨率源图，生成 `build/icon.icns` 和 `build/icon.png`，分别供 macOS 与 Linux 打包使用。
- `resources/icon.png` 与 `build/icon.png` 保持相同内容，供 Electron 开发态和 Linux `BrowserWindow` 使用。
- 保留 `build/icon.*` 的标准文件名。Electron Builder 会按平台自动选择对应格式，不需要在配置中维护平台专属路径。

## 运行时行为

Windows 与 macOS 的窗口、Dock、任务栏和安装包图标由打包产物读取；Linux 窗口继续通过 `resources/icon.png` 显式设置。应用名称、应用 ID、窗口逻辑和界面样式不变。

## 生成约束

- PNG 与 ICNS 从 1136×1136、带透明通道的 `logo.png` 生成。
- 输出保持正方形画布和透明通道，不额外裁切图案或添加背景。
- Windows 直接采用用户提供的多尺寸 ICO，避免重复转换导致小尺寸图标质量下降。

## 验证

- 检查 ICO、ICNS、PNG 文件格式、尺寸与透明通道。
- 执行 TypeScript 检查、生产构建和 Electron Builder macOS 目录打包。
- 检查生成的 `.app` 是否包含新 ICNS，并启动打包后的应用确认窗口可正常显示。

