import { DeleteOutlined, FileImageOutlined } from '@ant-design/icons'
import { Button, Checkbox, Form, Input, InputNumber, Select, Space, Typography } from 'antd'
import { useEffect, useState } from 'react'
import type {
  AppSettings,
  Asset,
  GenerationParameters,
  GenerationRecord,
  LogoProject,
  LogoPromptPack,
  LogoStyleDirectionId,
  LogoType,
  LogoUsageScenario,
  ProviderConfig,
  SaveLogoProjectInput
} from '../../../../shared/types'
import { bloomCanvasClient } from '../../api/bloomCanvasClient'
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
  logoTypes: LogoType[]
  styleDirections: LogoStyleDirectionId[]
  usageScenarios: LogoUsageScenario[]
  referenceNote?: string
  promptPack?: LogoPromptPack
  size: GenerationParameters['size']
  count: number
  quality: GenerationParameters['quality']
  outputFormat: GenerationParameters['outputFormat']
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
    logoTypes: project?.logoTypes ?? ['combination-mark'],
    styleDirections: project?.styleDirections ?? [...defaultLogoStyleDirections],
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
): SaveLogoProjectInput {
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
    logoTypes: values.logoTypes,
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
  const [promptPack, setPromptPack] = useState<LogoPromptPack | null>(project?.promptPack ?? null)

  useEffect(() => {
    const nextValues = createInitialValues(project, settings)
    form.setFieldsValue(nextValues)
    setPromptPack(nextValues.promptPack ?? null)
  }, [form, project, settings])

  async function buildPromptPackFromValues(
    values: LogoCreationFormValues
  ): Promise<LogoPromptPack> {
    const nextPromptPack = await bloomCanvasClient.logoPrompt.build(
      toProjectInput(values, project, referenceAssets)
    )
    form.setFieldValue('promptPack', nextPromptPack)
    setPromptPack(nextPromptPack)
    return nextPromptPack
  }

  async function buildPromptPack(): Promise<void> {
    const values = await form.validateFields()
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

    const values = await form.validateFields()
    const confirmedPromptPack = values.promptPack ?? promptPack ?? (await buildPromptPackFromValues(values))
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
            logoTypes: values.logoTypes,
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
        <Form.Item label="品牌名" name="brandName" rules={[{ required: true, message: '请输入品牌名' }]}>
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
          name="logoTypes"
          rules={[{ required: true, message: '请选择 Logo 类型' }]}
        >
          <Checkbox.Group options={[...logoTypeOptions]} />
        </Form.Item>
        <Form.Item
          label="风格方向"
          name="styleDirections"
          rules={[
            { required: true, message: '请选择风格方向' },
            {
              validator: async (_, value: LogoStyleDirectionId[] | undefined) => {
                if (value && value.length > 4) throw new Error('最多选择 4 个风格方向')
              }
            }
          ]}
        >
          <Checkbox.Group options={[...logoStyleDirectionOptions]} />
        </Form.Item>
        <Form.Item label="使用场景" name="usageScenarios">
          <Checkbox.Group options={[...logoUsageScenarioOptions]} />
        </Form.Item>
        <Form.Item label="参考说明" name="referenceNote">
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
        </Form.Item>
        {referenceAssets.length > 0 ? (
          <div className="reference-summary">
            <Typography.Text strong>参考图 {referenceAssets.length} 张</Typography.Text>
            <Button size="small" type="link" onClick={() => onReferenceAssetsChange([])}>
              清空参考图
            </Button>
          </div>
        ) : null}

        <LogoPromptPreview promptPack={promptPack} />

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
