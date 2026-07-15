import { Button, Form, Input, Modal, Space } from 'antd'
import { useEffect } from 'react'
import { DEFAULT_PROMPT_MODEL } from '../../../shared/providerDefaults'
import type { ProviderConfig, SaveProviderInput } from '../../../shared/types'
import { bloomCanvasClient } from '../api/bloomCanvasClient'

interface ProviderSettingsModalProps {
  open: boolean
  provider: ProviderConfig | null
  onClose: () => void
  onSaved: () => void
  onError: (message: string) => void
}

export function ProviderSettingsModal({
  open,
  provider,
  onClose,
  onSaved,
  onError
}: ProviderSettingsModalProps): React.JSX.Element {
  const [form] = Form.useForm<SaveProviderInput>()

  useEffect(() => {
    if (!open) return
    form.setFieldsValue({
      id: provider?.id,
      name: provider?.name ?? 'OpenAI',
      baseUrl: provider?.baseUrl ?? 'https://api.openai.com/v1',
      imageModel: provider?.imageModel ?? 'gpt-image-2',
      promptModel: provider?.promptModel ?? DEFAULT_PROMPT_MODEL
    })
  }, [form, open, provider])

  async function handleSubmit(): Promise<void> {
    try {
      const values = await form.validateFields()
      await bloomCanvasClient.providers.save(values)
      onSaved()
    } catch (error) {
      onError(error instanceof Error ? error.message : '保存 Provider 失败')
    }
  }

  return (
    <Modal footer={null} open={open} title="Provider 设置" onCancel={onClose}>
      <Form form={form} layout="vertical">
        <Form.Item name="id" hidden>
          <Input />
        </Form.Item>
        <Form.Item
          label="名称"
          name="name"
          rules={[{ required: true, message: '请输入 Provider 名称' }]}
        >
          <Input placeholder="OpenAI" />
        </Form.Item>
        <Form.Item
          label="Base URL"
          name="baseUrl"
          rules={[{ required: true, type: 'url', message: '请输入有效 URL' }]}
        >
          <Input placeholder="https://api.openai.com/v1" />
        </Form.Item>
        <Form.Item
          label="API Key"
          name="apiKey"
          extra={provider?.hasApiKey ? '留空则保留已保存的 API Key' : undefined}
        >
          <Input.Password placeholder="sk-..." />
        </Form.Item>
        <Form.Item
          label="图像模型"
          name="imageModel"
          rules={[{ required: true, message: '请输入图像模型' }]}
        >
          <Input placeholder="gpt-image-2" />
        </Form.Item>
        <Form.Item label="策略与提示词模型" name="promptModel">
          <Input placeholder={DEFAULT_PROMPT_MODEL} />
        </Form.Item>
        <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleSubmit}>
            保存
          </Button>
        </Space>
      </Form>
    </Modal>
  )
}
