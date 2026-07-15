# 应用图标接入实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将用户提供的新品牌图标接入 Bloom Canvas 的 Windows、macOS、Linux 安装包和 Electron 开发态窗口。

**架构：** 保留 Electron Builder 默认识别的 `build/icon.*` 文件名，Windows 直接使用用户提供的多尺寸 ICO；macOS 和 Linux 资源从同目录高分辨率 PNG 生成。运行时 `resources/icon.png` 与打包用 PNG 保持字节一致，现有 `BrowserWindow` 配置无需修改。

**技术栈：** Electron 39、electron-builder 26、macOS `sips`、`iconutil`、Shell 文件校验

---

## 文件结构

- 修改：`build/icon.ico`，Windows 安装包和可执行文件图标。
- 修改：`build/icon.icns`，macOS 应用包和 Dock 图标。
- 修改：`build/icon.png`，Linux 安装包图标和跨平台后备资源。
- 修改：`resources/icon.png`，Electron 开发态及 Linux `BrowserWindow` 图标。

### 任务 1：生成并替换跨平台图标资源

**文件：**
- 输入：`/Users/peter/Downloads/图片批量处理_20260715_140656/icon.ico`
- 输入：`/Users/peter/Downloads/图片批量处理_20260715_140656/logo.png`
- 修改：`build/icon.ico`
- 修改：`build/icon.icns`
- 修改：`build/icon.png`
- 修改：`resources/icon.png`

- [ ] **步骤 1：验证源资源格式**

运行：

```bash
file '/Users/peter/Downloads/图片批量处理_20260715_140656/icon.ico' \
  '/Users/peter/Downloads/图片批量处理_20260715_140656/logo.png'
sips -g pixelWidth -g pixelHeight -g hasAlpha \
  '/Users/peter/Downloads/图片批量处理_20260715_140656/logo.png'
```

预期：ICO 被识别为 Windows icon resource 且包含多个尺寸；PNG 为 1136×1136，`hasAlpha: yes`。

- [ ] **步骤 2：替换 Windows 图标并生成标准 PNG**

运行：

```bash
cp '/Users/peter/Downloads/图片批量处理_20260715_140656/icon.ico' build/icon.ico
sips -z 1024 1024 \
  '/Users/peter/Downloads/图片批量处理_20260715_140656/logo.png' \
  --out build/icon.png
cp build/icon.png resources/icon.png
```

预期：`build/icon.ico` 使用用户提供的原始多尺寸文件；两个 PNG 均为 1024×1024 且内容一致。

- [ ] **步骤 3：生成 macOS ICNS**

运行：

```bash
ICONSET_DIR="$(mktemp -d)/icon.iconset"
mkdir -p "$ICONSET_DIR"
sips -z 16 16 build/icon.png --out "$ICONSET_DIR/icon_16x16.png"
sips -z 32 32 build/icon.png --out "$ICONSET_DIR/icon_16x16@2x.png"
sips -z 32 32 build/icon.png --out "$ICONSET_DIR/icon_32x32.png"
sips -z 64 64 build/icon.png --out "$ICONSET_DIR/icon_32x32@2x.png"
sips -z 128 128 build/icon.png --out "$ICONSET_DIR/icon_128x128.png"
sips -z 256 256 build/icon.png --out "$ICONSET_DIR/icon_128x128@2x.png"
sips -z 256 256 build/icon.png --out "$ICONSET_DIR/icon_256x256.png"
sips -z 512 512 build/icon.png --out "$ICONSET_DIR/icon_256x256@2x.png"
sips -z 512 512 build/icon.png --out "$ICONSET_DIR/icon_512x512.png"
cp build/icon.png "$ICONSET_DIR/icon_512x512@2x.png"
iconutil -c icns "$ICONSET_DIR" -o build/icon.icns
```

预期：`iconutil` 退出码为 0，`build/icon.icns` 被识别为 macOS icon。

- [ ] **步骤 4：验证生成资源**

运行：

```bash
file build/icon.ico build/icon.icns build/icon.png resources/icon.png
sips -g pixelWidth -g pixelHeight -g hasAlpha build/icon.png resources/icon.png
cmp build/icon.png resources/icon.png
```

预期：ICO、ICNS、PNG 格式正确；两个 PNG 均为 1024×1024、带透明通道；`cmp` 退出码为 0。

- [ ] **步骤 5：提交图标资源**

```bash
git add build/icon.ico build/icon.icns build/icon.png resources/icon.png
git commit -m "feat: update cross-platform app icon"
```

### 任务 2：验证构建产物与应用启动

**文件：**
- 验证：`electron-builder.yml`
- 产物：`dist/mac*/bloom-canvas.app`

- [ ] **步骤 1：运行静态验证和生产构建**

运行：

```bash
pnpm test:run
pnpm run typecheck
pnpm run lint
pnpm run build
```

预期：306 个测试全部通过；TypeScript 和 ESLint 无错误；Main、Preload、Renderer 构建均成功。

- [ ] **步骤 2：生成 macOS 目录包**

运行：

```bash
pnpm exec electron-builder --mac --dir
```

预期：命令退出码为 0，并在 `dist/mac*` 下生成 `bloom-canvas.app`。

- [ ] **步骤 3：确认新图标进入应用包**

运行：

```bash
APP_PATH="$(find dist -maxdepth 3 -type d -name 'bloom-canvas.app' -print -quit)"
test -n "$APP_PATH"
PLIST_ICON="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIconFile' "$APP_PATH/Contents/Info.plist")"
test -f "$APP_PATH/Contents/Resources/$PLIST_ICON"
shasum build/icon.icns "$APP_PATH/Contents/Resources/$PLIST_ICON"
```

预期：`CFBundleIconFile` 指向应用包中存在的 ICNS；两个 `shasum` 哈希相同。

- [ ] **步骤 4：启动打包应用做烟雾验证**

运行：

```bash
open "$APP_PATH"
```

预期：Bloom Canvas 正常启动，主窗口可见，Dock 显示新图标。

- [ ] **步骤 5：确认工作树和提交状态**

运行：

```bash
git status --short --branch
git log -2 --oneline
```

预期：工作树干净；最新提交为图标资源提交，其前一个提交为图标设计或实现计划文档提交。

