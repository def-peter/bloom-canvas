import { PlusOutlined } from '@ant-design/icons'
import { Button, Empty, List, Typography } from 'antd'
import type { LogoProject } from '../../../../shared/types'

interface LogoProjectPanelProps {
  projects: LogoProject[]
  selectedId: string | null
  onCreateNew: () => void
  onSelect: (project: LogoProject) => void
}

export function LogoProjectPanel({
  projects,
  selectedId,
  onCreateNew,
  onSelect
}: LogoProjectPanelProps): React.JSX.Element {
  return (
    <aside className="history-panel logo-project-panel">
      <div className="panel-header">
        <Typography.Text strong>Logo 项目</Typography.Text>
        <Button icon={<PlusOutlined />} size="small" type="primary" onClick={onCreateNew}>
          新建
        </Button>
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
    </aside>
  )
}
