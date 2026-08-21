import {
  DownloadOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  SyncOutlined
} from '@ant-design/icons'
import { Button, Divider, Modal, Progress, Space, Spin, Typography } from 'antd'
import { useEffect, useState } from 'react'
import appIconUrl from '../../../../build/icon.png'
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

  return (
    <>
      <Button aria-label="关于" icon={<InfoCircleOutlined />} onClick={() => setOpen(true)}>
        关于
      </Button>
      <Modal
        centered
        footer={null}
        open={open}
        title="关于绽画"
        width={500}
        onCancel={() => setOpen(false)}
      >
        <div className="about-modal-content">
          <div className="about-product">
            <img className="about-product-logo" src={appIconUrl} alt="绽画 Logo" />
            <div className="about-product-copy">
              <Typography.Title level={3}>绽画</Typography.Title>
              <Typography.Text>AI 图像工作台</Typography.Text>
              <Typography.Text className="about-version" type="secondary">
                版本 {status.currentVersion || '--'}
              </Typography.Text>
            </div>
          </div>
          <Divider size="small" />
          <section className="update-modal-content" aria-labelledby="software-update-title">
            <Typography.Title id="software-update-title" level={5}>
              软件更新
            </Typography.Title>
            {status.phase === 'idle' && (
              <Button
                aria-label="检查更新"
                icon={<SyncOutlined />}
                type="primary"
                onClick={checkForUpdates}
              >
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
                <Typography.Text strong>当前已是最新版本</Typography.Text>
                <Typography.Text type="secondary">当前版本 {status.currentVersion}</Typography.Text>
                <Button aria-label="重新检查" icon={<SyncOutlined />} onClick={checkForUpdates}>
                  重新检查
                </Button>
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
                <Button
                  aria-label="下载更新"
                  icon={<DownloadOutlined />}
                  type="primary"
                  onClick={downloadUpdate}
                >
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
                <Typography.Text strong>更新已下载完成</Typography.Text>
                <Typography.Text>重启绽画以安装 {status.availableVersion}。</Typography.Text>
                <Button
                  aria-label="重启并安装"
                  icon={<ReloadOutlined />}
                  type="primary"
                  onClick={installUpdate}
                >
                  重启并安装
                </Button>
              </>
            )}
            {status.phase === 'error' && (
              <>
                <Typography.Text type="danger">{status.message ?? '检查更新失败'}</Typography.Text>
                <Button aria-label="重试" icon={<SyncOutlined />} onClick={checkForUpdates}>
                  重试
                </Button>
              </>
            )}
            {status.phase === 'unsupported' && (
              <>
                <Typography.Text strong>开发环境不检查更新</Typography.Text>
                <Typography.Text type="secondary">安装正式版本后即可使用此功能。</Typography.Text>
              </>
            )}
          </section>
        </div>
      </Modal>
    </>
  )
}
