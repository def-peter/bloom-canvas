import {
  BulbOutlined,
  CloseOutlined,
  DeleteOutlined,
  FileImageOutlined,
  InboxOutlined
} from '@ant-design/icons'
import { Button, Form, Image, Input, InputNumber, Select, Space, Upload, Typography } from 'antd'
import { useRef, useState } from 'react'
import { assetProtocolUrl, thumbnailProtocolUrl } from '../../../shared/assetProtocol'
import { getImageSizeModelError } from '../../../shared/imageSize'
import type {
  AppSettings,
  Asset,
  GenerationParameters,
  GenerationRecord,
  ImportAssetDataInput,
  ProviderConfig
} from '../../../shared/types'
import { bloomCanvasClient } from '../api/bloomCanvasClient'
import { assertGenerationSucceeded } from '../utils/generationStatus'
import { ImageSizeControl } from './ImageSizeControl'

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

const MAX_REFERENCE_IMAGES = 8
const PARAMETER_ROW_STYLE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  columnGap: 12
}
const SIZE_PARAMETER_ROW_STYLE: React.CSSProperties = {
  ...PARAMETER_ROW_STYLE,
  gridTemplateColumns: 'minmax(0, 1fr) 96px'
}
const MIME_BY_IMAGE_EXTENSION: Record<string, ImportAssetDataInput['mimeType']> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp'
}

function getReferenceImageMimeType(file: File): ImportAssetDataInput['mimeType'] | null {
  if (
    Object.values(MIME_BY_IMAGE_EXTENSION).includes(file.type as ImportAssetDataInput['mimeType'])
  ) {
    return file.type as ImportAssetDataInput['mimeType']
  }
  return MIME_BY_IMAGE_EXTENSION[file.name.split('.').pop()?.toLowerCase() ?? ''] ?? null
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
  const handledUploadBatches = useRef(new WeakSet<object>())

  async function importReferenceFiles(files: File[]): Promise<void> {
    const availableCount = MAX_REFERENCE_IMAGES - referenceAssets.length
    const acceptedFiles = files
      .map((file) => ({ file, mimeType: getReferenceImageMimeType(file) }))
      .filter(
        (item): item is { file: File; mimeType: ImportAssetDataInput['mimeType'] } =>
          item.mimeType !== null
      )
      .slice(0, availableCount)

    if (acceptedFiles.length === 0) {
      onError(`参考图最多支持 ${MAX_REFERENCE_IMAGES} 张`)
      return
    }

    setUploading(true)
    const importedAssets: Asset[] = []
    try {
      for (const { file, mimeType } of acceptedFiles) {
        const filePath = bloomCanvasClient.assets.getPathForFile(file)
        const asset = filePath
          ? await bloomCanvasClient.assets.import({ filePath })
          : await bloomCanvasClient.assets.importData({
              bytes: new Uint8Array(await file.arrayBuffer()),
              mimeType
            })
        importedAssets.push(asset)
      }

      onReferenceAssetsChange([...referenceAssets, ...importedAssets])
      onError(
        files.length > acceptedFiles.length
          ? `参考图最多支持 ${MAX_REFERENCE_IMAGES} 张，已忽略其余图片`
          : null
      )
    } catch (error) {
      if (importedAssets.length > 0) {
        onReferenceAssetsChange([...referenceAssets, ...importedAssets])
      }
      onError(error instanceof Error ? error.message : '导入参考图失败')
    } finally {
      setUploading(false)
    }
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

    let values: CreationFormValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }
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
        className="creation-form"
        form={form}
        initialValues={{
          size: settings?.defaultSize ?? '1024x1024',
          count: settings?.defaultCount ?? 1,
          quality: settings?.defaultQuality ?? 'standard',
          outputFormat: settings?.defaultOutputFormat ?? 'png'
        }}
        layout="vertical"
        style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
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
        <div className="reference-upload-section">
          <Upload.Dragger
            accept="image/png,image/jpeg,image/webp"
            beforeUpload={(_, fileList) => {
              if (!handledUploadBatches.current.has(fileList)) {
                handledUploadBatches.current.add(fileList)
                void importReferenceFiles(fileList)
              }
              return Upload.LIST_IGNORE
            }}
            className="reference-upload"
            disabled={uploading || referenceAssets.length >= MAX_REFERENCE_IMAGES}
            height={64}
            maxCount={MAX_REFERENCE_IMAGES}
            multiple
            pastable
            showUploadList={false}
          >
            <div className="reference-upload-content">
              <InboxOutlined spin={uploading} />
              <div className="reference-upload-copy">
                <span className="ant-upload-text">
                  {uploading
                    ? '正在导入参考图'
                    : referenceAssets.length >= MAX_REFERENCE_IMAGES
                      ? '已添加 8 张参考图'
                      : '点击、拖拽或粘贴图片'}
                </span>
                <span className="ant-upload-hint">PNG · JPEG · WEBP · 最多 8 张</span>
              </div>
            </div>
          </Upload.Dragger>
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
        </div>
        <div className="creation-parameter-row" style={SIZE_PARAMETER_ROW_STYLE}>
          <Form.Item
            label="尺寸"
            name="size"
            rules={[
              {
                validator: async (_, value: GenerationParameters['size']) => {
                  const error = getImageSizeModelError(activeProvider?.imageModel ?? '', value)
                  if (error) throw new Error(error)
                }
              }
            ]}
          >
            <ImageSizeControl imageModel={activeProvider?.imageModel} />
          </Form.Item>
          <Form.Item label="数量" name="count">
            <InputNumber max={4} min={1} style={{ width: '100%' }} />
          </Form.Item>
        </div>
        <div className="creation-parameter-row" style={PARAMETER_ROW_STYLE}>
          <Form.Item label="质量" name="quality">
            <Select
              options={[
                { label: '标准', value: 'standard' },
                { label: '高清', value: 'hd' }
              ]}
            />
          </Form.Item>
          <Form.Item label="格式" name="outputFormat">
            <Select
              options={[
                { label: 'PNG', value: 'png' },
                { label: 'JPEG', value: 'jpeg' },
                { label: 'WEBP', value: 'webp' }
              ]}
            />
          </Form.Item>
        </div>
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
