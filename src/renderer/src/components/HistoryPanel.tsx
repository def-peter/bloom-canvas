import {
  ClockCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  StarFilled,
  StarOutlined
} from '@ant-design/icons'
import { Button, Empty, Input, List, Modal, Segmented, Space, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { thumbnailProtocolUrl } from '../../../shared/assetProtocol'
import type { GenerationRecord } from '../../../shared/types'
import { summarizeGenerationError } from '../utils/generationStatus'

interface HistoryPanelProps {
  generations: GenerationRecord[]
  selectedId?: string
  onDelete: (generationId: string) => Promise<void>
  onSelect: (generation: GenerationRecord) => void
}

export function HistoryPanel({
  generations,
  onDelete,
  selectedId,
  onSelect
}: HistoryPanelProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'favorite'>('all')
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filteredGenerations = useMemo(() => {
    return generations.filter((generation) => {
      const matchesQuery = generation.promptFinal.toLowerCase().includes(query.trim().toLowerCase())
      const matchesFilter = filter === 'all' || generation.favorite
      return matchesQuery && matchesFilter
    })
  }, [filter, generations, query])

  const deleteTarget = useMemo(
    () => generations.find((generation) => generation.id === deleteTargetId) ?? null,
    [deleteTargetId, generations]
  )

  async function handleConfirmDelete(): Promise<void> {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      await onDelete(deleteTarget.id)
      setDeleteTargetId(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <aside className="history-panel">
      <div className="panel-header">
        <Typography.Text strong>历史</Typography.Text>
        <ClockCircleOutlined />
      </div>
      <Space orientation="vertical" size={10} style={{ width: '100%' }}>
        <Input.Search
          allowClear
          placeholder="搜索提示词"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Segmented
          block
          options={[
            { label: '全部', value: 'all' },
            { label: '收藏', value: 'favorite' }
          ]}
          value={filter}
          onChange={(value) => setFilter(value as 'all' | 'favorite')}
        />
      </Space>
      {filteredGenerations.length === 0 ? (
        <Empty description="还没有生成记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          className="history-list"
          dataSource={filteredGenerations}
          renderItem={(generation) => {
            const failureSummary =
              generation.status === 'failed'
                ? summarizeGenerationError(generation.errorMessage)
                : null

            return (
              <List.Item
                className={
                  generation.id === selectedId ? 'history-item history-item-active' : 'history-item'
                }
                onClick={() => onSelect(generation)}
              >
                <div className="history-thumb">
                  {generation.status === 'failed' ? (
                    <CloseCircleOutlined aria-label="生成失败" className="history-failed-icon" />
                  ) : generation.variants[0]?.asset.thumbnailPath ? (
                    <img alt="" src={thumbnailProtocolUrl(generation.variants[0].assetId)} />
                  ) : (
                    <span />
                  )}
                </div>
                <div className="history-content">
                  <Typography.Text ellipsis>{generation.promptFinal}</Typography.Text>
                  {failureSummary ? (
                    <span className="history-error-summary" title={failureSummary}>
                      生成失败 · {failureSummary}
                    </span>
                  ) : (
                    <Typography.Text type="secondary">
                      {new Date(generation.createdAt).toLocaleString()}
                    </Typography.Text>
                  )}
                </div>
                <Space size={2} onClick={(event) => event.stopPropagation()}>
                  <Button
                    aria-label={generation.favorite ? '已收藏' : '未收藏'}
                    icon={generation.favorite ? <StarFilled /> : <StarOutlined />}
                    size="small"
                    type="text"
                  />
                  <Button
                    aria-label="删除历史记录"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    type="text"
                    onClick={() => setDeleteTargetId(generation.id)}
                  />
                </Space>
              </List.Item>
            )
          }}
        />
      )}
      <Modal
        cancelText="取消"
        confirmLoading={deleting}
        okButtonProps={{ danger: true }}
        okText="删除"
        open={Boolean(deleteTarget)}
        title="删除这条历史记录？"
        onCancel={() => setDeleteTargetId(null)}
        onOk={handleConfirmDelete}
      >
        <Typography.Paragraph>
          删除后会移除这次生成的输出文件和历史记录。用户添加的参考图不会被删除。
        </Typography.Paragraph>
      </Modal>
    </aside>
  )
}
