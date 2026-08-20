import { DownloadOutlined, ReloadOutlined, SyncOutlined } from '@ant-design/icons'
import { Button, Modal, Progress, Space, Spin, Tooltip, Typography } from 'antd'
import { useEffect, useState } from 'react'
import type { AppUpdateStatus } from '../../../shared/ipc'
import { bloomCanvasClient } from '../api/bloomCanvasClient'

const initialStatus: AppUpdateStatus = {
  phase: 'idle',
  currentVersion: ''
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '0 MB'
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function UpdateCenter(): React.JSX.Element {
  const [status, setStatus] = useState(initialStatus)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let active = true
    void bloomCanvasClient.updates.getStatus().then((nextStatus) => {
      if (!active) return
      setStatus(nextStatus)
      if (nextStatus.phase === 'available' || nextStatus.phase === 'downloaded') setOpen(true)
    })
    const unsubscribe = bloomCanvasClient.updates.onStatusChanged((nextStatus) => {
      setStatus(nextStatus)
      if (nextStatus.phase === 'available' || nextStatus.phase === 'downloaded') setOpen(true)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  function checkForUpdates(): void {
    setOpen(true)
    void bloomCanvasClient.updates.check().then(setStatus)
  }

  function downloadUpdate(): void {
    void bloomCanvasClient.updates.download().then(setStatus)
  }

  function installUpdate(): void {
    void bloomCanvasClient.updates.install()
  }

  const title = status.availableVersion ? `绽画 ${status.availableVersion}` : '软件更新'

  return (
    <>
      <Tooltip title="检查更新">
        <Button
          aria-label="检查更新"
          disabled={status.phase === 'checking' || status.phase === 'downloading'}
          icon={<SyncOutlined spin={status.phase === 'checking'} />}
          shape="circle"
          type="text"
          onClick={checkForUpdates}
        />
      </Tooltip>
      <Modal
        centered
        footer={null}
        open={open}
        title={title}
        width={480}
        onCancel={() => setOpen(false)}
      >
        <div className="update-modal-content">
          {status.phase === 'idle' && (
            <Button icon={<SyncOutlined />} type="primary" onClick={checkForUpdates}>
              检查更新
            </Button>
          )}
          {status.phase === 'checking' && (
            <Space>
              <Spin size="small" />
              <Typography.Text>正在检查更新...</Typography.Text>
            </Space>
          )}
          {status.phase === 'not-available' && (
            <>
              <Typography.Title level={5}>当前已是最新版本</Typography.Title>
              <Typography.Text type="secondary">当前版本 {status.currentVersion}</Typography.Text>
            </>
          )}
          {status.phase === 'available' && (
            <>
              <Typography.Text>
                新版本 {status.availableVersion} 已可下载，当前版本为 {status.currentVersion}。
              </Typography.Text>
              {status.releaseNotes && (
                <Typography.Paragraph className="update-release-notes">
                  {status.releaseNotes}
                </Typography.Paragraph>
              )}
              <Button icon={<DownloadOutlined />} type="primary" onClick={downloadUpdate}>
                下载更新
              </Button>
            </>
          )}
          {status.phase === 'downloading' && (
            <>
              <Typography.Text>正在下载 {status.availableVersion}...</Typography.Text>
              <Progress percent={Math.round(status.percent ?? 0)} status="active" />
              <Typography.Text type="secondary">
                {formatBytes(status.transferred)} / {formatBytes(status.total)}
              </Typography.Text>
            </>
          )}
          {status.phase === 'downloaded' && (
            <>
              <Typography.Title level={5}>更新已下载完成</Typography.Title>
              <Typography.Text>重启绽画以安装 {status.availableVersion}。</Typography.Text>
              <Button icon={<ReloadOutlined />} type="primary" onClick={installUpdate}>
                重启并安装
              </Button>
            </>
          )}
          {status.phase === 'error' && (
            <>
              <Typography.Text type="danger">{status.message ?? '检查更新失败'}</Typography.Text>
              <Button icon={<SyncOutlined />} onClick={checkForUpdates}>
                重试
              </Button>
            </>
          )}
          {status.phase === 'unsupported' && (
            <>
              <Typography.Title level={5}>开发环境不检查更新</Typography.Title>
              <Typography.Text type="secondary">安装正式版本后即可使用此功能。</Typography.Text>
            </>
          )}
        </div>
      </Modal>
    </>
  )
}
