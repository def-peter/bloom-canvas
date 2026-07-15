# 文字模型默认值与推理强度设计

## 背景

Bloom Canvas 的通用提示词优化和 Logo 创意策略共用 `OpenAIResponsesClient`，但新建 Provider 当前没有文字模型默认值，请求也没有声明推理强度。当前本机 Provider 使用 `gpt-5.5`。

## 目标

- 新建 Provider 默认使用 `gpt-5.6-terra` 作为文字模型。
- 所有通过 `OpenAIResponsesClient` 发出的文字请求统一使用 High 推理强度。
- 将当前本机正在使用的 Provider 从 `gpt-5.5` 更新为 `gpt-5.6-terra`。
- 保持通用创作现有行为：优化结果非空时，点击“生成”直接使用优化后的提示词，无需复制。

## 方案

采用统一固定配置，不增加推理强度控件，也不按场景区分强度。

### Provider 默认值

定义共享的默认文字模型常量 `gpt-5.6-terra`。新建 Provider 时，设置表单使用该值作为 `promptModel` 初始值，并将字段名称从“提示词优化模型”改为“策略与提示词模型”，准确表达它同时服务于通用优化和 Logo 策略生成。

编辑已有 Provider 时始终显示其已保存值，不用新默认值覆盖。应用代码不批量迁移其他已有 Provider。

### Responses 请求

`OpenAIResponsesClient.createText()` 的请求体固定为：

```json
{
  "model": "<provider.promptModel>",
  "reasoning": { "effort": "high" },
  "input": []
}
```

因此通用提示词优化、Logo 策略生成及后续复用该客户端的文字能力都会使用 High。若兼容网关不接受该参数，沿用现有非 2xx 错误处理并向界面显示错误，不静默删除参数或降低推理强度。

### 当前本机配置

实现完成后，一次性把当前本机默认 Provider 的 `promptModel` 从 `gpt-5.5` 更新为 `gpt-5.6-terra`，保留现有 Provider ID、Base URL、图像模型和已保存 API Key。该数据更新不作为面向所有用户的迁移逻辑发布。

## 数据流

1. 用户在通用创作点击“优化提示词”，或在 Logo 流程点击“生成创意策略”。
2. Main 进程读取当前 Provider 的 Base URL、API Key 和 `promptModel`。
3. `OpenAIResponsesClient` 调用 `/responses`，请求携带 `reasoning.effort = high`。
4. 服务读取文字结果；无有效文字时明确报错。
5. 通用创作把优化结果写入“优化后提示词”。该字段非空时，点击“生成”自动使用它。

## 错误处理

- `promptModel` 为空时，保持当前通用优化的兼容行为；新建 Provider 默认不会为空。
- `/responses` 返回非 2xx 时保留状态码和响应体。
- 响应没有有效文字时抛出明确错误，不回退成原始提示词。
- 不对不支持 High 的网关做静默降级。

## 测试

- Provider 设置测试验证新建表单默认显示 `gpt-5.6-terra`，编辑已有 Provider 时保留原值。
- Responses 客户端测试验证请求体包含 `reasoning: { effort: 'high' }`。
- 现有顶层与嵌套文字响应解析测试继续通过。
- 运行完整测试、Node/Web 类型检查和 ESLint。

## 不在范围内

- 不增加可配置的 Low、Medium、High 选择器。
- 不为不同文字场景设置不同推理强度。
- 不自动覆盖其他已有 Provider 的自定义模型。
- 不处理“修改原提示词后旧优化结果仍保留”的交互问题。
