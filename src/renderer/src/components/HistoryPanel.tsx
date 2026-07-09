import {
  ClockCircleOutlined,
  CloseCircleOutlined,
  StarFilled,
  StarOutlined
} from '@ant-design/icons'
import { Button, Empty, Input, List, Segmented, Space, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { thumbnailProtocolUrl } from '../../../shared/assetProtocol'
import type { GenerationRecord } from '../../../shared/types'

interface HistoryPanelProps {
  generations: GenerationRecord[]
  selectedId?: string
  onSelect: (generation: GenerationRecord) => void
}

export function HistoryPanel({
  generations,
  selectedId,
  onSelect
}: HistoryPanelProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'favorite'>('all')

  const filteredGenerations = useMemo(() => {
    return generations.filter((generation) => {
      const matchesQuery = generation.promptFinal.toLowerCase().includes(query.trim().toLowerCase())
      const matchesFilter = filter === 'all' || generation.favorite
      return matchesQuery && matchesFilter
    })
  }, [filter, generations, query])

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
          renderItem={(generation) => (
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
                <Typography.Text type="secondary">
                  {generation.status === 'failed'
                    ? `生成失败：${generation.errorMessage ?? '未知错误'}`
                    : new Date(generation.createdAt).toLocaleString()}
                </Typography.Text>
              </div>
              <Button
                aria-label={generation.favorite ? '已收藏' : '未收藏'}
                icon={generation.favorite ? <StarFilled /> : <StarOutlined />}
                size="small"
                type="text"
              />
            </List.Item>
          )}
        />
      )}
    </aside>
  )
}
