import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Empty, List, Modal, Space, Typography } from 'antd'
import { useState } from 'react'
import type { LogoProject } from '../../../../shared/types'

interface LogoProjectPanelProps {
  generating: boolean
  projects: LogoProject[]
  selectedId: string | null
  selectedProjectImageCount: number
  onCreateNew: () => void
  onDelete: (projectId: string) => Promise<void>
  onSelect: (project: LogoProject) => void
}

export function LogoProjectPanel({
  generating,
  projects,
  selectedId,
  selectedProjectImageCount,
  onCreateNew,
  onDelete,
  onSelect
}: LogoProjectPanelProps): React.JSX.Element {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const selectedProject = projects.find((project) => project.id === selectedId) ?? null

  async function deleteSelectedProject(): Promise<void> {
    if (!selectedProject) return
    setDeleting(true)
    try {
      await onDelete(selectedProject.id)
      setDeleteOpen(false)
    } catch {
      // AppShell owns error reporting; keep the confirmation open for a retry.
    } finally {
      setDeleting(false)
    }
  }

  return (
    <aside className="history-panel logo-project-panel">
      <div className="panel-header">
        <Typography.Text strong>Logo 项目</Typography.Text>
        <Space.Compact>
          <Button
            aria-label="删除项目"
            danger
            disabled={!selectedProject || generating}
            icon={<DeleteOutlined />}
            size="small"
            title={generating ? '生成完成后才能删除项目' : undefined}
            onClick={() => setDeleteOpen(true)}
          />
          <Button icon={<PlusOutlined />} size="small" type="primary" onClick={onCreateNew}>
            新建
          </Button>
        </Space.Compact>
      </div>
      {projects.length === 0 ? (
        <Empty description="还没有 Logo 项目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={projects}
          renderItem={(project) => (
            <List.Item
              className={project.id === selectedId ? 'history-item selected' : 'history-item'}
              onClick={() => onSelect(project)}
            >
              <List.Item.Meta title={project.brandName} description={project.industry} />
            </List.Item>
          )}
        />
      )}
      <Modal
        cancelText="取消"
        confirmLoading={deleting}
        okButtonProps={{ danger: true, disabled: generating }}
        okText="删除"
        open={deleteOpen}
        title="删除 Logo 项目及图片？"
        onCancel={() => setDeleteOpen(false)}
        onOk={deleteSelectedProject}
      >
        <Typography.Paragraph>项目：“{selectedProject?.brandName}”</Typography.Paragraph>
        <Typography.Paragraph>
          {selectedProjectImageCount > 0
            ? `将同步删除 ${selectedProjectImageCount} 张生成图片和相关历史记录。`
            : '将删除该项目和相关历史记录。'}
        </Typography.Paragraph>
        <Typography.Paragraph type="secondary">
          用户导入的参考图原文件会保留。此操作不可撤销。
        </Typography.Paragraph>
      </Modal>
    </aside>
  )
}
