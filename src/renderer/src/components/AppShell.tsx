import { SettingOutlined } from '@ant-design/icons'
import {
  App as AntdApp,
  Button,
  ConfigProvider,
  Layout,
  Segmented,
  Select,
  Spin,
  Typography
} from 'antd'
import { useState } from 'react'
import { bloomCanvasClient } from '../api/bloomCanvasClient'
import { useWorkbenchStore } from '../state/workbenchStore'
import { bloomTheme } from '../theme'
import type { Asset, GenerationRecord } from '../../../shared/types'
import { CreationPanel } from './CreationPanel'
import { ErrorNotice } from './ErrorNotice'
import { GalleryPanel } from './GalleryPanel'
import { HistoryPanel } from './HistoryPanel'
import { LogoCreationPanel } from './logo/LogoCreationPanel'
import { LogoProjectPanel } from './logo/LogoProjectPanel'
import { ProviderSettingsModal } from './ProviderSettingsModal'

const { Header } = Layout

function WorkbenchShell(): React.JSX.Element {
  const {
    activeScene,
    providers,
    activeProvider,
    settings,
    generations,
    selectedGeneration,
    logoProjects,
    selectedLogoProject,
    loading,
    generating,
    error,
    refresh,
    refreshLogoProjects,
    setActiveScene,
    selectGeneration,
    selectLogoProject,
    setGenerating,
    setError
  } = useWorkbenchStore()
  const { message } = AntdApp.useApp()
  const [providerModalOpen, setProviderModalOpen] = useState(false)
  const [draftReferenceAssets, setDraftReferenceAssets] = useState<Asset[]>([])

  async function handleProviderChange(providerId: string): Promise<void> {
    try {
      await bloomCanvasClient.settings.save({ defaultProviderId: providerId })
      await refresh()
    } catch (providerError) {
      setError(providerError instanceof Error ? providerError.message : '切换 Provider 失败')
    }
  }

  async function handleGenerationCreated(record: GenerationRecord): Promise<void> {
    await refresh()
    selectGeneration(record)
  }

  async function handleExport(assetId: string): Promise<void> {
    try {
      const targetPath = await bloomCanvasClient.assets.export({ assetId })
      message.success(`已导出到 ${targetPath}`)
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : '导出图片失败')
    }
  }

  async function handleRetry(generationId: string): Promise<void> {
    if (!activeProvider?.hasApiKey) {
      setProviderModalOpen(true)
      return
    }

    setGenerating(true)
    try {
      const record = await bloomCanvasClient.generations.retry(generationId)
      await refresh()
      selectGeneration(record)
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : '重新生成失败')
    } finally {
      setGenerating(false)
    }
  }

  function handleContinueEdit(asset: Asset): void {
    setDraftReferenceAssets([asset])
    setError(null)
    message.info('已加入参考图，请输入修改要求')
  }

  async function handleProviderSaved(): Promise<void> {
    await refresh()
    setProviderModalOpen(false)
  }

  async function handleLogoProjectSaved(project: NonNullable<typeof selectedLogoProject>): Promise<void> {
    await refreshLogoProjects()
    selectLogoProject(project)
  }

  return (
    <Layout className="app-shell">
      <Header className="app-header">
        <div className="brand-block">
          <Typography.Title level={3}>生花</Typography.Title>
          <Typography.Text>BloomCanvas</Typography.Text>
        </div>
        <div className="header-controls">
          <Segmented
            options={[
              { label: '通用创作', value: 'general' },
              { label: 'Logo 设计', value: 'logo-design' }
            ]}
            value={activeScene}
            onChange={(value) => setActiveScene(value as 'general' | 'logo-design')}
          />
          <Select
            aria-label="Provider"
            className="provider-select"
            disabled={providers.length === 0}
            options={providers.map((provider) => ({
              label: provider.name,
              value: provider.id
            }))}
            placeholder="未配置 Provider"
            value={activeProvider?.id}
            onChange={handleProviderChange}
          />
          <Button icon={<SettingOutlined />} onClick={() => setProviderModalOpen(true)}>
            Provider 设置
          </Button>
        </div>
      </Header>
      <ErrorNotice error={error} onClose={() => setError(null)} />
      {loading ? (
        <main className="loading-view">
          <Spin />
        </main>
      ) : activeScene === 'general' ? (
        <div className="workspace-grid">
          <HistoryPanel
            generations={generations}
            selectedId={selectedGeneration?.id}
            onSelect={selectGeneration}
          />
          <GalleryPanel
            generating={generating}
            generation={selectedGeneration}
            onContinueEdit={handleContinueEdit}
            onExport={handleExport}
            onRetry={handleRetry}
          />
          <CreationPanel
            activeProvider={activeProvider}
            referenceAssets={draftReferenceAssets}
            settings={settings}
            onCreated={handleGenerationCreated}
            onError={setError}
            onGeneratingChange={setGenerating}
            onNeedProvider={() => setProviderModalOpen(true)}
            onReferenceAssetsChange={setDraftReferenceAssets}
          />
        </div>
      ) : (
        <div className="workspace-grid logo-workspace-grid">
          <LogoProjectPanel
            projects={logoProjects}
            selectedId={selectedLogoProject?.id ?? null}
            onCreateNew={() => selectLogoProject(null)}
            onSelect={selectLogoProject}
          />
          <main className="gallery-panel">
            <Typography.Text strong>Logo 结果</Typography.Text>
          </main>
          <LogoCreationPanel
            activeProvider={activeProvider}
            project={selectedLogoProject}
            referenceAssets={draftReferenceAssets}
            settings={settings}
            onCreated={handleGenerationCreated}
            onError={setError}
            onGeneratingChange={setGenerating}
            onNeedProvider={() => setProviderModalOpen(true)}
            onProjectSaved={handleLogoProjectSaved}
            onReferenceAssetsChange={setDraftReferenceAssets}
          />
        </div>
      )}
      <ProviderSettingsModal
        open={providerModalOpen}
        provider={activeProvider}
        onClose={() => setProviderModalOpen(false)}
        onError={setError}
        onSaved={handleProviderSaved}
      />
    </Layout>
  )
}

export function AppShell(): React.JSX.Element {
  return (
    <ConfigProvider theme={bloomTheme}>
      <AntdApp>
        <WorkbenchShell />
      </AntdApp>
    </ConfigProvider>
  )
}
