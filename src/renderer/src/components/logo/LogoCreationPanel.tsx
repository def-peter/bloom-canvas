import {
  CloseOutlined,
  DeleteOutlined,
  FileImageOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons'
import {
  Button,
  Checkbox,
  Form,
  Image,
  Input,
  InputNumber,
  Radio,
  Select,
  Space,
  Tooltip,
  Typography
} from 'antd'
import { useEffect, useState } from 'react'
import { assetProtocolUrl, thumbnailProtocolUrl } from '../../../../shared/assetProtocol'
import { getImageSizeModelError } from '../../../../shared/imageSize'
import type {
  AppSettings,
  Asset,
  BuildLogoPromptPackInput,
  GenerationParameters,
  GenerationRecord,
  LogoProject,
  LogoPromptPack,
  LogoStyleDirectionId,
  LogoType,
  LogoUsageScenario,
  ProviderConfig
} from '../../../../shared/types'
import { bloomCanvasClient } from '../../api/bloomCanvasClient'
import { assertGenerationSucceeded } from '../../utils/generationStatus'
import { ImageSizeControl } from '../ImageSizeControl'
import {
  defaultLogoStyleDirections,
  logoStyleDirectionOptions,
  logoTypeOptions,
  logoUsageScenarioOptions
} from './logoConstants'
import { LogoPromptPreview } from './LogoPromptPreview'

interface LogoCreationPanelProps {
  activeProvider: ProviderConfig | null
  project: LogoProject | null
  referenceAssets: Asset[]
  settings: AppSettings | null
  onNeedProvider: () => void
  onCreated: (record: GenerationRecord) => Promise<void>
  onError: (error: string | null) => void
  onGeneratingChange: (generating: boolean) => void
  onProjectSaved: (project: LogoProject) => Promise<void> | void
  onReferenceAssetsChange: (assets: Asset[]) => void
}

interface LogoCreationFormValues {
  brandName: string
  brandNameAlt?: string
  shortName?: string
  slogan?: string
  industry: string
  businessDescription: string
  targetAudience?: string
  brandKeywordsInput: string
  differentiator?: string
  avoidElements?: string
  preferredColorsInput?: string
  avoidedColorsInput?: string
  logoType: LogoType
  styleDirections: LogoStyleDirectionId[]
  usageScenarios: LogoUsageScenario[]
  referenceNote?: string
  promptPack?: LogoPromptPack
  size: GenerationParameters['size']
  count: number
  quality: GenerationParameters['quality']
  outputFormat: GenerationParameters['outputFormat']
}

function buildCheckboxOptions<T extends string>(
  options: ReadonlyArray<{ description?: string; label: string; value: T }>
): Array<{ label: React.ReactNode; value: T }> {
  return options.map((option) => ({
    label: (
      <span className="logo-option-label">
        <span>{option.label}</span>
        {option.description ? (
          <Tooltip title={option.description}>
            <span
              aria-label={`说明：${option.label}`}
              className="logo-option-help"
              role="img"
              tabIndex={0}
            >
              <QuestionCircleOutlined />
            </span>
          </Tooltip>
        ) : null}
      </span>
    ),
    value: option.value
  }))
}

function splitInput(value: string | undefined): string[] {
  return (value ?? '')
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function joinInput(values: string[] | undefined): string {
  return values?.join('，') ?? ''
}

function createInitialValues(
  project: LogoProject | null,
  settings: AppSettings | null
): Partial<LogoCreationFormValues> {
  return {
    brandName: project?.brandName,
    brandNameAlt: project?.brandNameAlt,
    shortName: project?.shortName,
    slogan: project?.slogan,
    industry: project?.industry,
    businessDescription: project?.businessDescription,
    targetAudience: project?.targetAudience,
    brandKeywordsInput: joinInput(project?.brandKeywords),
    differentiator: project?.differentiator,
    avoidElements: project?.avoidElements,
    preferredColorsInput: joinInput(project?.preferredColors),
    avoidedColorsInput: joinInput(project?.avoidedColors),
    logoType: project?.logoTypes[0] ?? 'combination-mark',
    styleDirections: project?.styleDirections?.slice(0, 3) ?? [...defaultLogoStyleDirections],
    usageScenarios: project?.usageScenarios ?? ['app-icon', 'website'],
    referenceNote: project?.referenceNote,
    promptPack: project?.promptPack,
    size: settings?.defaultSize ?? '1024x1024',
    count: settings?.defaultCount ?? 1,
    quality: settings?.defaultQuality ?? 'standard',
    outputFormat: settings?.defaultOutputFormat ?? 'png'
  }
}

function toProjectInput(
  values: LogoCreationFormValues,
  project: LogoProject | null,
  referenceAssets: Asset[],
  promptPack?: LogoPromptPack
): BuildLogoPromptPackInput {
  return {
    id: project?.id,
    brandName: values.brandName,
    brandNameAlt: values.brandNameAlt,
    shortName: values.shortName,
    slogan: values.slogan,
    industry: values.industry,
    businessDescription: values.businessDescription,
    targetAudience: values.targetAudience,
    brandKeywords: splitInput(values.brandKeywordsInput),
    differentiator: values.differentiator,
    avoidElements: values.avoidElements,
    preferredColors: splitInput(values.preferredColorsInput),
    avoidedColors: splitInput(values.avoidedColorsInput),
    logoTypes: [values.logoType],
    styleDirections: values.styleDirections,
    usageScenarios: values.usageScenarios ?? [],
    referenceImageIds: referenceAssets.map((asset) => asset.id),
    referenceNote: values.referenceNote,
    promptPack
  }
}

export function LogoCreationPanel({
  activeProvider,
  project,
  referenceAssets,
  settings,
  onNeedProvider,
  onCreated,
  onError,
  onGeneratingChange,
  onProjectSaved,
  onReferenceAssetsChange
}: LogoCreationPanelProps): React.JSX.Element {
  const [form] = Form.useForm<LogoCreationFormValues>()
  const [buildingPrompt, setBuildingPrompt] = useState(false)
  const promptPack =
    (Form.useWatch('promptPack', { form, preserve: true }) as LogoPromptPack | undefined) ?? null

  useEffect(() => {
    const nextValues = createInitialValues(project, settings)
    form.setFieldsValue(nextValues)
  }, [form, project, settings])

  function removeReferenceAsset(assetId: string): void {
    onReferenceAssetsChange(referenceAssets.filter((asset) => asset.id !== assetId))
  }

  async function buildPromptPackFromValues(
    values: LogoCreationFormValues
  ): Promise<LogoPromptPack> {
    const nextPromptPack = await bloomCanvasClient.logoPrompt.build(
      toProjectInput(values, project, referenceAssets)
    )
    form.setFieldValue('promptPack', nextPromptPack)
    return nextPromptPack
  }

  async function buildPromptPack(): Promise<void> {
    let values: LogoCreationFormValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    setBuildingPrompt(true)
    try {
      await buildPromptPackFromValues(values)
      onError(null)
    } catch (error) {
      onError(error instanceof Error ? error.message : '生成 Logo 提示词失败')
    } finally {
      setBuildingPrompt(false)
    }
  }

  async function generateLogoDrafts(): Promise<void> {
    if (!activeProvider?.hasApiKey) {
      onNeedProvider()
      return
    }

    let values: LogoCreationFormValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    const confirmedPromptPack =
      values.promptPack ?? promptPack ?? (await buildPromptPackFromValues(values))
    const savedProject = await bloomCanvasClient.logoProjects.save(
      toProjectInput(values, project, referenceAssets, confirmedPromptPack)
    )
    await onProjectSaved(savedProject)

    onGeneratingChange(true)
    try {
      for (const direction of confirmedPromptPack.directions) {
        const record = await bloomCanvasClient.generations.create({
          providerId: activeProvider.id,
          prompt: direction.finalPrompt,
          useOptimizedPrompt: false,
          referenceAssetIds: referenceAssets.map((asset) => asset.id),
          parameters: {
            size: values.size,
            count: values.count,
            quality: values.quality,
            outputFormat: values.outputFormat
          },
          scenario: 'logo-design',
          projectId: savedProject.id,
          scenarioMetadata: {
            logoProjectId: savedProject.id,
            styleDirectionId: direction.id,
            styleDirectionName: direction.name,
            logoTypes: [values.logoType],
            promptPackSnapshot: confirmedPromptPack,
            finalPrompt: direction.finalPrompt,
            briefSnapshot: {
              brandName: values.brandName,
              brandNameAlt: values.brandNameAlt,
              shortName: values.shortName,
              slogan: values.slogan,
              industry: values.industry,
              businessDescription: values.businessDescription,
              targetAudience: values.targetAudience,
              brandKeywords: splitInput(values.brandKeywordsInput),
              differentiator: values.differentiator,
              avoidElements: values.avoidElements,
              preferredColors: splitInput(values.preferredColorsInput),
              avoidedColors: splitInput(values.avoidedColorsInput),
              usageScenarios: values.usageScenarios,
              referenceNote: values.referenceNote
            },
            qualityRulesVersion: 1
          }
        })
        assertGenerationSucceeded(record)
        await onCreated(record)
      }
      onError(null)
    } catch (error) {
      onError(error instanceof Error ? error.message : '生成 Logo 初稿失败')
    } finally {
      onGeneratingChange(false)
    }
  }

  return (
    <aside className="creation-panel logo-creation-panel">
      <div className="panel-header">
        <Typography.Text strong>品牌简报</Typography.Text>
        <FileImageOutlined />
      </div>
      <Form
        form={form}
        initialValues={createInitialValues(project, settings)}
        layout="vertical"
        requiredMark={false}
      >
        <Typography.Text strong>基础信息</Typography.Text>
        <Form.Item
          label="品牌名"
          name="brandName"
          rules={[{ required: true, message: '请输入品牌名' }]}
        >
          <Input allowClear />
        </Form.Item>
        <Form.Item label="英文名/简称" name="shortName">
          <Input allowClear />
        </Form.Item>
        <Form.Item label="行业" name="industry" rules={[{ required: true, message: '请输入行业' }]}>
          <Input allowClear />
        </Form.Item>
        <Form.Item
          label="业务描述"
          name="businessDescription"
          rules={[{ required: true, message: '请输入业务描述' }]}
        >
          <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} />
        </Form.Item>
        <Form.Item label="目标用户" name="targetAudience">
          <Input allowClear />
        </Form.Item>

        <Typography.Text strong>品牌气质</Typography.Text>
        <Form.Item
          label="品牌关键词"
          name="brandKeywordsInput"
          rules={[{ required: true, message: '请输入至少 1 个品牌关键词' }]}
        >
          <Input allowClear placeholder="例如：可靠，清晰，创造力" />
        </Form.Item>
        <Form.Item label="核心差异点" name="differentiator">
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
        </Form.Item>
        <Form.Item label="想避免的感觉/元素" name="avoidElements">
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
        </Form.Item>
        <Form.Item label="颜色偏好" name="preferredColorsInput">
          <Input allowClear placeholder="例如：蓝色，黑白" />
        </Form.Item>
        <Form.Item label="避免颜色" name="avoidedColorsInput">
          <Input allowClear />
        </Form.Item>

        <Typography.Text strong>Logo 方向</Typography.Text>
        <Form.Item
          label="Logo 类型"
          name="logoType"
          rules={[{ required: true, message: '请选择 Logo 类型' }]}
        >
          <Radio.Group options={buildCheckboxOptions(logoTypeOptions)} />
        </Form.Item>
        <Form.Item
          label="风格方向"
          name="styleDirections"
          rules={[
            { required: true, message: '请选择风格方向' },
            {
              validator: async (_, value: LogoStyleDirectionId[] | undefined) => {
                if (value && value.length > 3) throw new Error('最多选择 3 个风格方向')
              }
            }
          ]}
        >
          <Checkbox.Group options={buildCheckboxOptions(logoStyleDirectionOptions)} />
        </Form.Item>
        <Form.Item label="使用场景" name="usageScenarios">
          <Checkbox.Group options={buildCheckboxOptions(logoUsageScenarioOptions)} />
        </Form.Item>
        <Form.Item label="参考说明" name="referenceNote">
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
        </Form.Item>
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
          </div>
        ) : null}

        <LogoPromptPreview promptPack={promptPack} />

        <Space.Compact block>
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
            style={{ flex: 1 }}
          >
            <ImageSizeControl imageModel={activeProvider?.imageModel} />
          </Form.Item>
          <Form.Item label="每方向数量" name="count" style={{ width: 112 }}>
            <InputNumber max={2} min={1} style={{ width: '100%' }} />
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
          <Button block loading={buildingPrompt} onClick={buildPromptPack}>
            生成/更新提示词
          </Button>
          <Button block size="large" type="primary" onClick={generateLogoDrafts}>
            生成 Logo 初稿
          </Button>
          <Button block icon={<DeleteOutlined />} onClick={() => form.resetFields()}>
            清空
          </Button>
        </Space>
      </Form>
    </aside>
  )
}
