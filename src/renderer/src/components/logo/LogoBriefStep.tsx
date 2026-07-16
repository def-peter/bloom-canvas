import { CloseOutlined, QuestionCircleOutlined, UploadOutlined } from '@ant-design/icons'
import {
  Button,
  Checkbox,
  Collapse,
  Form,
  Image,
  Input,
  Radio,
  Select,
  Tooltip,
  Typography,
  Upload
} from 'antd'
import { useState } from 'react'
import { assetProtocolUrl, thumbnailProtocolUrl } from '../../../../shared/assetProtocol'
import type { Asset } from '../../../../shared/types'
import { bloomCanvasClient } from '../../api/bloomCanvasClient'
import { logoTypeOptions, logoUsageScenarioOptions } from './logoConstants'
import { briefValuesToV2, type LogoBriefFormValues } from './logoFormUtils'

interface LogoBriefStepProps {
  initialValues: LogoBriefFormValues
  loading: boolean
  referenceAssets?: Asset[]
  onError?: (error: string | null) => void
  onReferenceAssetsChange?: (assets: Asset[]) => void
  onSubmit: (values: LogoBriefFormValues) => Promise<void> | void
}

const tokenSeparators = [',', '，', '、', '\n']

export function LogoBriefStep({
  initialValues,
  loading,
  referenceAssets = [],
  onError,
  onReferenceAssetsChange,
  onSubmit
}: LogoBriefStepProps): React.JSX.Element {
  const [uploading, setUploading] = useState(false)

  async function submit(values: LogoBriefFormValues): Promise<void> {
    const brief = briefValuesToV2(values)
    await onSubmit({ ...values, ...brief })
  }

  function updateReferenceAssets(assets: Asset[]): void {
    onReferenceAssetsChange?.(assets)
  }

  async function importReference(file: File): Promise<void> {
    const filePath = bloomCanvasClient.assets.getPathForFile(file)
    if (!filePath) {
      onError?.('无法读取参考图路径，请在桌面应用中重新选择文件')
      return
    }
    setUploading(true)
    try {
      const asset = await bloomCanvasClient.assets.import({ filePath })
      updateReferenceAssets(
        referenceAssets.some((item) => item.id === asset.id)
          ? referenceAssets
          : [...referenceAssets, asset]
      )
      onError?.(null)
    } catch (error) {
      onError?.(error instanceof Error ? error.message : '导入参考图失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="logo-workflow-step logo-brief-step">
      <div className="logo-step-heading">
        <Typography.Title level={4}>品牌简报</Typography.Title>
        <Typography.Text type="secondary">先说清品牌，再让系统提出不同创意方向。</Typography.Text>
      </div>
      <Form<LogoBriefFormValues>
        initialValues={initialValues}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => void submit(values)}
      >
        <div className="logo-brief-grid">
          <Form.Item
            label="品牌名"
            name="brandName"
            rules={[{ required: true, message: '请输入品牌名' }]}
          >
            <Input allowClear />
          </Form.Item>
          <Form.Item
            label="行业"
            name="industry"
            rules={[{ required: true, message: '请输入行业' }]}
          >
            <Input allowClear />
          </Form.Item>
        </div>
        <Form.Item
          label="业务描述"
          name="businessDescription"
          rules={[{ required: true, message: '请输入业务描述' }]}
        >
          <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} />
        </Form.Item>
        <div className="logo-brief-grid">
          <Form.Item label="目标用户" name="targetAudience">
            <Input allowClear />
          </Form.Item>
          <Form.Item label="核心差异点" name="differentiator">
            <Input allowClear />
          </Form.Item>
        </div>
        <Form.Item
          label="品牌关键词"
          name="brandKeywords"
          rules={[
            { required: true, message: '请输入 2-4 个品牌关键词' },
            {
              validator: async (_, value: string[] | undefined) => {
                if (!value || value.length < 2 || value.length > 4) {
                  throw new Error('请输入 2-4 个品牌关键词')
                }
              }
            }
          ]}
        >
          <Select
            maxCount={4}
            mode="tags"
            placeholder="例如：清晰、可靠、创造力"
            tokenSeparators={tokenSeparators}
          />
        </Form.Item>
        <Form.Item label="Logo 类型" name="logoType" rules={[{ required: true }]}>
          <Radio.Group className="logo-type-options">
            {logoTypeOptions.map((option) => (
              <Radio key={option.value} value={option.value}>
                {option.label}
                <Tooltip title={option.description}>
                  <QuestionCircleOutlined
                    aria-label={`说明：${option.label}`}
                    className="logo-option-help"
                  />
                </Tooltip>
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>
        <Form.Item
          label="使用场景"
          name="usageScenarios"
          rules={[
            { required: true, message: '请选择 1-3 个使用场景' },
            {
              validator: async (_, value: string[] | undefined) => {
                if (!value || value.length < 1 || value.length > 3) {
                  throw new Error('请选择 1-3 个使用场景')
                }
              }
            }
          ]}
        >
          <Checkbox.Group options={[...logoUsageScenarioOptions]} />
        </Form.Item>
        <Collapse
          ghost
          items={[
            {
              key: 'more',
              label: '更多约束',
              children: (
                <>
                  <div className="logo-brief-grid">
                    <Form.Item label="英文名 / 简称" name="shortName">
                      <Input allowClear />
                    </Form.Item>
                    <Form.Item label="其他语言名称" name="brandNameAlt">
                      <Input allowClear />
                    </Form.Item>
                  </div>
                  <Form.Item label="想避免的元素" name="avoidedElements">
                    <Select mode="tags" tokenSeparators={tokenSeparators} />
                  </Form.Item>
                  <div className="logo-brief-grid">
                    <Form.Item label="颜色偏好" name="preferredColors">
                      <Select mode="tags" tokenSeparators={tokenSeparators} />
                    </Form.Item>
                    <Form.Item label="避免颜色" name="avoidedColors">
                      <Select mode="tags" tokenSeparators={tokenSeparators} />
                    </Form.Item>
                  </div>
                  <Form.Item label="参考说明" name="referenceNote">
                    <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
                  </Form.Item>
                  {onReferenceAssetsChange ? (
                    <Upload
                      accept="image/png,image/jpeg,image/webp"
                      beforeUpload={(file) => {
                        void importReference(file)
                        return false
                      }}
                      maxCount={8}
                      multiple
                      showUploadList={false}
                    >
                      <Button icon={<UploadOutlined />} loading={uploading}>
                        添加参考图
                      </Button>
                    </Upload>
                  ) : null}
                </>
              )
            }
          ]}
        />
        {onReferenceAssetsChange && referenceAssets.length > 0 ? (
          <div className="reference-summary">
            <div className="reference-summary-header">
              <Typography.Text strong>参考图 {referenceAssets.length} 张</Typography.Text>
              <Button size="small" type="link" onClick={() => updateReferenceAssets([])}>
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
                    onClick={() =>
                      updateReferenceAssets(referenceAssets.filter((item) => item.id !== asset.id))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <Button block htmlType="submit" loading={loading} size="large" type="primary">
          生成创意策略
        </Button>
      </Form>
    </section>
  )
}
