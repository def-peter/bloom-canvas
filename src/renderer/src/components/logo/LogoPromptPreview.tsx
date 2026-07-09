import { Collapse, Form, Input, Typography } from 'antd'
import type { LogoPromptPack } from '../../../../shared/types'

interface LogoPromptPreviewProps {
  promptPack: LogoPromptPack | null
}

export function LogoPromptPreview({
  promptPack
}: LogoPromptPreviewProps): React.JSX.Element | null {
  if (!promptPack) return null

  return (
    <section className="logo-prompt-preview">
      <Typography.Text strong>提示词预览</Typography.Text>
      <Form.Item label="公共提示词" name={['promptPack', 'basePrompt']}>
        <Input.TextArea autoSize={{ minRows: 4, maxRows: 8 }} />
      </Form.Item>
      <Collapse
        defaultActiveKey={promptPack.directions.map((direction) => direction.id)}
        items={promptPack.directions.map((direction, index) => ({
          children: (
            <>
              <Form.Item name={['promptPack', 'directions', index, 'id']} hidden>
                <Input />
              </Form.Item>
              <Form.Item name={['promptPack', 'directions', index, 'name']} hidden>
                <Input />
              </Form.Item>
              <Form.Item label="方向提示词" name={['promptPack', 'directions', index, 'prompt']}>
                <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} />
              </Form.Item>
              <Form.Item label="最终提示词" name={['promptPack', 'directions', index, 'finalPrompt']}>
                <Input.TextArea autoSize={{ minRows: 5, maxRows: 10 }} />
              </Form.Item>
            </>
          ),
          forceRender: true,
          key: direction.id,
          label: direction.name
        }))}
        size="small"
      />
    </section>
  )
}
