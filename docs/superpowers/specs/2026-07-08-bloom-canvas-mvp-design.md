# BloomCanvas / 生花 MVP 产品设计

日期：2026-07-08

## 1. 产品定位

BloomCanvas / 生花首版定位为：面向个人创作者的通用 AI 图像生成桌面工作台。

首版不是聊天机器人，不是 Photoshop，也不是 Logo、电商主图、详情图等垂直设计工具。它只解决一个核心问题：用户用自然语言和参考图，快速生成、比较、保存图像候选结果。

核心原则：

- 泛化生图要轻、快、可控。
- 参考图只是输入材料，参考语义由提示词决定。
- 专题设计工作流后续再引入项目制。
- 默认支持 OpenAI `gpt-image-2`，但不强制绑定官方 OpenAI 服务。

## 2. MVP 功能边界

### 2.1 首版必须做

| 模块 | 内容 |
| --- | --- |
| 文生图 | 输入提示词，生成 1-N 张图片 |
| 参考图生图 | 上传 1-N 张参考图，参考方式由提示词决定 |
| 参数控制 | Provider、模型、尺寸、数量、质量等基础参数 |
| 提示词优化 | 可选按钮，不自动改写用户原文 |
| 本地历史库 | 保存提示词、参考图、参数、结果图、生成时间 |
| 结果操作 | 预览、保存、复制提示词、重新生成、导出图片 |
| Provider 设置 | 用户填写 Base URL、API Key、模型名 |

### 2.2 首版明确不做

| 不做 | 原因 |
| --- | --- |
| 项目制 | 泛化生图心智太重，后续专题功能再引入 |
| 局部编辑/蒙版修图 | 属于第二阶段的深度编辑 |
| 批量生成队列 | 属于电商/运营专题能力 |
| 云同步/账号/额度 | MVP 先验证本地工具体验 |
| 固定参考图模式 | 参考语义交给提示词表达 |
| 聊天式多轮会话 | 产品核心是工作台，不是对话流 |

## 3. 首屏工作流与界面结构

首屏直接进入工作台，不做欢迎页、不做项目列表。

```text
┌────────────────────────────────────────────────────────────┐
│ Top Bar：BloomCanvas / Provider 状态 / API Key 状态 / 设置 │
├───────────────┬──────────────────────────────┬─────────────┤
│ 左侧历史库     │ 中间生成结果区                 │ 右侧创作面板 │
│ History       │ Gallery / Preview             │ Prompt      │
│               │                              │ References  │
│ 最近生成       │ 生成中状态                     │ Parameters  │
│ 收藏           │ 图片网格                       │ Generate    │
│ 搜索           │ 点击后大图预览                  │             │
└───────────────┴──────────────────────────────┴─────────────┘
```

推荐布局：中间结果区最大，右侧创作面板固定，左侧历史库可折叠。图片结果是产品主体，提示词是控制台，历史是辅助。

### 3.1 右侧创作面板

- 大提示词输入框。
- `优化提示词` 按钮。
- 参考图上传区，支持 1-N 张。
- 基础参数：
  - Provider。
  - 图像模型。
  - 图片尺寸。
  - 生成数量。
  - 质量/清晰度。
  - 输出格式。
- 主按钮：`生成`。
- 辅助按钮：`清空`、`复用上次参数`。

### 3.2 中间结果区

- 默认展示最近一次生成结果。
- 生成中显示骨架屏或进度状态。
- 一次生成多图时用网格展示。
- 点击图片进入大图预览。
- 每张图支持：
  - 保存到本地。
  - 复制图片。
  - 复制提示词。
  - 收藏。
  - 基于此图继续生成。

### 3.3 左侧历史库

- 按时间分组展示生成记录。
- 每条记录显示缩略图、提示词摘要、生成数量。
- 支持搜索提示词。
- 支持收藏筛选。
- 不出现“项目”概念。
- 后续专题功能可以扩展出“专题/项目”入口。

### 3.4 首次启动体验

如果没有配置 API Key：

- 仍进入工作台。
- 顶部显示未配置状态。
- 点击生成时弹出 Provider 设置面板。
- 设置完成后可立即生成。

## 4. 数据模型与本地存储

首版不做 Project，核心数据单位是 `Generation`，也就是“一次生成”。

```text
Generation
├─ id
├─ mode: text-to-image | image-to-image
├─ promptOriginal
├─ promptOptimized?
├─ promptFinal
├─ referenceImageIds[]
├─ parameters
├─ outputVariantIds[]
├─ providerId
├─ status
├─ favorite
├─ createdAt
└─ updatedAt
```

### 4.1 Asset

参考图和生成图都作为 `Asset`，只是类型不同。

```text
Asset
├─ id
├─ type: reference | output
├─ filePath
├─ thumbnailPath
├─ mimeType
├─ width
├─ height
├─ size
├─ sha256
├─ createdAt
└─ sourceGenerationId?
```

### 4.2 Variant

一次生成返回的候选图作为 `Variant`。

```text
Variant
├─ id
├─ generationId
├─ assetId
├─ index
├─ revisedPrompt?
├─ favorite
└─ createdAt
```

### 4.3 ProviderConfig

Provider 不强绑定官方 OpenAI。

```text
ProviderConfig
├─ id
├─ name
├─ baseUrl
├─ imageModel
├─ promptModel?
├─ apiKeyRef
├─ createdAt
└─ updatedAt
```

默认配置：

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| Provider Name | OpenAI | 用户可自定义名称 |
| Base URL | `https://api.openai.com/v1` | 可改成兼容 OpenAI API 的服务 |
| API Key | 用户填写 | 本地安全保存 |
| Image Model | `gpt-image-2` | 可改 |
| Prompt Model | 用户配置 | 用于提示词优化 |

### 4.4 Settings

```text
Settings
├─ defaultProviderId
├─ defaultSize
├─ defaultQuality
├─ defaultCount
├─ outputDirectory?
├─ theme
└─ apiKeyStored: boolean
```

API Key 不放 Settings 表，应放在系统钥匙串或加密存储里。

### 4.5 存储方式

| 内容 | 存储方式 |
| --- | --- |
| 元数据 | SQLite |
| 原图/结果图 | 应用数据目录下的文件系统 |
| 缩略图 | 文件系统缓存 |
| API Key | 系统 Keychain / Credential Manager 或加密存储 |
| 临时生成文件 | 应用缓存目录 |

建议目录结构：

```text
BloomCanvasData/
├─ bloom-canvas.sqlite
├─ assets/
│  ├─ references/
│  └─ outputs/
├─ thumbnails/
└─ temp/
```

## 5. 技术架构与调用边界

首版用 Electron Main 作为后端边界，Renderer 只负责 UI。

```text
Renderer React UI
  ↓ typed IPC
Preload API Bridge
  ↓
Electron Main
  ├─ ImageGenerationProvider
  ├─ OpenAICompatibleProvider
  ├─ PromptOptimizeService
  ├─ ProviderConfigService
  ├─ CredentialService
  ├─ StorageService
  └─ AssetService
```

### 5.1 API 策略

默认面向 OpenAI-compatible 图像生成接口：

| 能力 | 策略 |
| --- | --- |
| 文生图 | 调用当前 Provider 的图像生成接口，默认模型 `gpt-image-2` |
| 参考图生图 | 调用当前 Provider 的图像编辑/参考图接口，传 1-N 张图片和 prompt |
| 提示词优化 | 调用当前 Provider 的文本/Responses 兼容接口 |
| 多轮编辑 | 暂不做，后续再考虑更完整的 Responses API image tool |

兼容服务不一定完全支持 `gpt-image-2` 的全部参数和多参考图行为。首版先暴露基础参数，调用失败时展示清晰错误摘要；后续再做 Provider 能力检测和参数映射。

### 5.2 安全边界

- API Key 不进入 Renderer。
- API Key 不写普通 JSON 配置。
- Main 进程通过系统凭据或加密存储保存。
- Renderer 只能通过白名单 IPC 调用：
  - `provider:save`
  - `provider:list`
  - `generation:create`
  - `generation:list`
  - `asset:import`
  - `asset:export`
- 禁止 Renderer 直接访问任意文件路径或直接发 Provider 请求。
- Electron 保持 `contextIsolation: true`，并收紧模板中的安全配置。

### 5.3 生成任务流

```text
用户点击生成
→ Renderer 提交 prompt / referenceAssetIds / parameters / providerId
→ Main 读取 ProviderConfig 和 API Key
→ Main 解析参考图文件
→ ImageGenerationProvider 调用当前 Provider
→ AssetService 保存输出图和缩略图
→ StorageService 写 Generation / Variant
→ Renderer 刷新结果区和历史库
```

### 5.4 错误处理

| 错误 | UI 表达 |
| --- | --- |
| 未配置 API Key | 弹出 Provider 设置面板 |
| Key 无效 | 明确提示重新配置 |
| Base URL 不可用 | 显示连接失败和当前地址 |
| 额度/限流 | 显示 Provider 返回原因，保留任务草稿 |
| 图片太大/格式不支持 | 上传时提前校验 |
| 内容安全拒绝 | 显示温和失败原因，不保存空结果 |
| 网络失败 | 支持重试 |
| 文件保存失败 | 提示本地存储路径问题 |

## 6. UI 技术选择

| 区域 | 建议 |
| --- | --- |
| 整体框架、表单、按钮、弹窗、布局、设置页 | `antd` |
| 提示词输入区 | 可考虑 `@ant-design/x` 的 Sender / Attachments 类组件 |
| 提示词建议、快捷模板 | 可考虑 `Prompts` / `Suggestion` |
| 生成历史、图片网格、预览、参数面板 | 自研组件 + `antd` 基础组件 |
| 聊天气泡、会话列表、思维链 | 首版不需要 |
| `@ant-design/x-card` / A2UI | 首版不需要 |

产品形态是 Do 为主、Chat 为辅。用户主要在工作台里操作：写提示词、上传参考图、调参数、看结果、保存历史；AI 只是帮助优化提示词，而不是持续聊天。

## 7. 版本路线

| 阶段 | 目标 | 功能 |
| --- | --- | --- |
| v0.1 MVP | 通用生图可用 | 文生图、参考图生图、自定义 Provider、历史库、导出图片 |
| v0.2 打磨体验 | 提升日常效率 | 提示词优化、提示词版本对比、收藏、搜索、参数预设 |
| v0.3 深度编辑 | 从生成到修图 | 基于结果继续生成、局部编辑、画布/蒙版、版本链 |
| v0.4 专题工作流 | 引入项目制 | Logo 设计、电商主图、详情图、海报等专题项目 |
| v0.5 生产化 | 批量和协作 | 批量生成、模板变量、项目包、云同步/账号/额度 |

v0.1 只需要证明：

> 用户可以在桌面端稳定地用文字和参考图生成图片，并且生成记录不会丢。

## 8. 后续可扩展方向

- 专题工作流：
  - Logo 设计。
  - 电商主图。
  - 商品详情图。
  - 社媒海报。
- 局部编辑：
  - 画布。
  - 蒙版。
  - 局部提示词。
  - 版本链。
- 批量生产：
  - 模板变量。
  - 多尺寸导出。
  - 队列管理。
- 平台化：
  - 平台账号。
  - 内置额度。
  - 云同步。
  - 团队素材库。

## 9. 已确认决策

- 首版做泛化生图，不做项目制。
- 文生图和参考图生图是核心。
- 参考图语义由提示词决定，不固化为风格/主体/构图模式。
- 提示词优化做成可选按钮。
- API Key、Base URL、模型名均支持用户自定义。
- 数据默认本地保存。
- UI 主体使用 `antd`，Ant Design X 仅作为局部候选。
- 后续专题功能再引入项目制。
