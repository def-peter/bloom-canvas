import { BulbOutlined, CloseOutlined, DeleteOutlined, FileImageOutlined } from '@ant-design/icons'
import { Button, Form, Image, Input, InputNumber, Select, Space, Upload, Typography } from 'antd'
import { useState } from 'react'
import { assetProtocolUrl, thumbnailProtocolUrl } from '../../../shared/assetProtocol'
import type {
  AppSettings,
  Asset,
  GenerationParameters,
  GenerationRecord,
  ProviderConfig
} from '../../../shared/types'
import { bloomCanvasClient } from '../api/bloomCanvasClient'
import { assertGenerationSucceeded } from '../utils/generationStatus'

interface CreationPanelProps {
  activeProvider: ProviderConfig | null
  referenceAssets: Asset[]
  settings: AppSettings | null
  onNeedProvider: () => void
  onCreated: (record: GenerationRecord) => Promise<void>
  onError: (error: string | null) => void
  onGeneratingChange: (generating: boolean) => void
  onReferenceAssetsChange: (assets: Asset[]) => void
}

interface CreationFormValues {
  prompt: string
  optimizedPrompt?: string
  size: GenerationParameters['size']
  count: number
  quality: GenerationParameters['quality']
  outputFormat: GenerationParameters['outputFormat']
}

export function CreationPanel({
  activeProvider,
  referenceAssets,
  settings,
  onNeedProvider,
  onCreated,
  onError,
  onGeneratingChange,
  onReferenceAssetsChange
}: CreationPanelProps): React.JSX.Element {
  const [form] = Form.useForm<CreationFormValues>()
  const [uploading, setUploading] = useState(false)
  const [optimizing, setOptimizing] = useState(false)

  function addReferenceAsset(asset: Asset): void {
    const nextAssets = referenceAssets.some((item) => item.id === asset.id)
      ? referenceAssets
      : [...referenceAssets, asset]
    onReferenceAssetsChange(nextAssets)
  }

  function removeReferenceAsset(assetId: string): void {
    onReferenceAssetsChange(referenceAssets.filter((asset) => asset.id !== assetId))
  }

  function clearDraft(): void {
    form.resetFields()
    onReferenceAssetsChange([])
  }

  async function optimizePrompt(): Promise<void> {
    const prompt = form.getFieldValue('prompt')
    if (!activeProvider) {
      onNeedProvider()
      return
    }
    if (!prompt?.trim()) {
      onError('请先输入提示词')
      return
    }

    setOptimizing(true)
    try {
      const optimized = await bloomCanvasClient.prompt.optimize({
        providerId: activeProvider.id,
        prompt
      })
      form.setFieldValue('optimizedPrompt', optimized)
    } catch (error) {
      onError(error instanceof Error ? error.message : '优化提示词失败')
    } finally {
      setOptimizing(false)
    }
  }

  async function createGeneration(): Promise<void> {
    if (!activeProvider?.hasApiKey) {
      onNeedProvider()
      return
    }

    const values = await form.validateFields()
    onGeneratingChange(true)
    try {
      const record = await bloomCanvasClient.generations.create({
        providerId: activeProvider.id,
        prompt: values.prompt,
        optimizedPrompt: values.optimizedPrompt,
        useOptimizedPrompt: Boolean(values.optimizedPrompt?.trim()),
        referenceAssetIds: referenceAssets.map((asset) => asset.id),
        parameters: {
          size: values.size,
          count: values.count,
          quality: values.quality,
          outputFormat: values.outputFormat
        }
      })
      assertGenerationSucceeded(record)
      await onCreated(record)
      onError(null)
    } catch (error) {
      onError(error instanceof Error ? error.message : '生成失败')
    } finally {
      onGeneratingChange(false)
    }
  }

  return (
    <aside className="creation-panel">
      <div className="panel-header">
        <Typography.Text strong>创作</Typography.Text>
        <FileImageOutlined />
      </div>
      <Form
        form={form}
        initialValues={{
          size: settings?.defaultSize ?? '1024x1024',
          count: settings?.defaultCount ?? 1,
          quality: settings?.defaultQuality ?? 'standard',
          outputFormat: settings?.defaultOutputFormat ?? 'png'
        }}
        layout="vertical"
      >
        <Form.Item
          label="提示词"
          name="prompt"
          rules={[{ required: true, message: '请输入提示词' }]}
        >
          <Input.TextArea
            autoSize={{ minRows: 7, maxRows: 12 }}
            placeholder={
              referenceAssets.length > 0
                ? '描述要怎么修改参考图，例如：保留主体，把背景换成白色'
                : '描述你想生成的画面'
            }
          />
        </Form.Item>
        <Button block icon={<BulbOutlined />} loading={optimizing} onClick={optimizePrompt}>
          优化提示词
        </Button>
        <Form.Item label="优化后提示词" name="optimizedPrompt">
          <Input.TextArea
            autoSize={{ minRows: 4, maxRows: 8 }}
            placeholder="优化结果会显示在这里，可继续编辑"
          />
        </Form.Item>
        <Upload
          accept="image/png,image/jpeg,image/webp"
          beforeUpload={async (file) => {
            const filePath = bloomCanvasClient.assets.getPathForFile(file)
            if (!filePath) {
              onError('无法读取参考图路径，请在桌面应用中重新选择文件')
              return false
            }
            setUploading(true)
            try {
              const asset = await bloomCanvasClient.assets.import({ filePath })
              addReferenceAsset(asset)
            } catch (error) {
              onError(error instanceof Error ? error.message : '导入参考图失败')
            } finally {
              setUploading(false)
            }
            return false
          }}
          maxCount={8}
          multiple
        >
          <Button block loading={uploading}>
            添加参考图
          </Button>
        </Upload>
        {referenceAssets.length > 0 ? (
          <div className="reference-summary">
            <div className="reference-summary-header">
              <Typography.Text strong>参考图 {referenceAssets.length} 张</Typography.Text>
              <Button size="small" type="link" onClick={() => onReferenceAssetsChange([])}>
                清空参考图
              </Button>
            </div>
            <div className="reference-preview-grid">
              {referenceAssets.map((asset, index) => (
                <div className="reference-preview-item" key={asset.id}>
                  <Image
                    alt={`参考图 ${index + 1}`}
                    preview={{ src: assetProtocolUrl(asset.id) }}
                    src={thumbnailProtocolUrl(asset.id)}
                  />
                  <Button
                    aria-label={`移除参考图 ${index + 1}`}
                    className="reference-remove-button"
                    icon={<CloseOutlined />}
                    shape="circle"
                    size="small"
                    onClick={() => removeReferenceAsset(asset.id)}
                  />
                </div>
              ))}
            </div>
            <Typography.Text type="secondary">生成时会按提示词决定参考方式</Typography.Text>
          </div>
        ) : null}
        <Space.Compact block>
          <Form.Item label="尺寸" name="size" style={{ flex: 1 }}>
            <Select
              options={[
                { label: '1024 x 1024', value: '1024x1024' },
                { label: '1024 x 1536', value: '1024x1536' },
                { label: '1536 x 1024', value: '1536x1024' },
                { label: '自动', value: 'auto' }
              ]}
            />
          </Form.Item>
          <Form.Item label="数量" name="count" style={{ width: 96 }}>
            <InputNumber max={4} min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Space.Compact>
        <Space.Compact block>
          <Form.Item label="质量" name="quality" style={{ flex: 1 }}>
            <Select
              options={[
                { label: '标准', value: 'standard' },
                { label: '高清', value: 'hd' }
              ]}
            />
          </Form.Item>
          <Form.Item label="格式" name="outputFormat" style={{ flex: 1 }}>
            <Select
              options={[
                { label: 'PNG', value: 'png' },
                { label: 'JPEG', value: 'jpeg' },
                { label: 'WEBP', value: 'webp' }
              ]}
            />
          </Form.Item>
        </Space.Compact>
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Button
            autoInsertSpace={false}
            block
            size="large"
            type="primary"
            onClick={createGeneration}
          >
            生成
          </Button>
          <Button block icon={<DeleteOutlined />} onClick={clearDraft}>
            清空
          </Button>
        </Space>
      </Form>
    </aside>
  )
}
