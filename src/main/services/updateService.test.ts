import { EventEmitter } from 'events'
import type { ProgressInfo, UpdateInfo } from 'electron-updater'
import { describe, expect, it, vi } from 'vitest'
import type { AppUpdateStatus } from '../../shared/ipc'
import { UpdateService, type UpdateAdapter } from './updateService'

class FakeUpdater extends EventEmitter implements UpdateAdapter {
  autoDownload = true
  autoInstallOnAppQuit = false
  checkForUpdates = vi.fn(async () => undefined)
  downloadUpdate = vi.fn(async () => undefined)
  quitAndInstall = vi.fn()
}

function updateInfo(version = '1.1.0'): UpdateInfo {
  return {
    version,
    files: [],
    path: 'bloom-canvas.zip',
    sha512: 'sha512',
    releaseDate: '2026-08-20T00:00:00.000Z',
    releaseName: `绽画 ${version}`,
    releaseNotes: '更新说明'
  }
}

function createService(isPackaged = true): {
  updater: FakeUpdater
  service: UpdateService
  broadcast: ReturnType<typeof vi.fn<(status: AppUpdateStatus) => void>>
} {
  const updater = new FakeUpdater()
  const broadcast = vi.fn<(status: AppUpdateStatus) => void>()
  const service = new UpdateService({
    updater,
    currentVersion: '1.0.0',
    isPackaged,
    broadcast
  })
  service.initialize()
  return { updater, service, broadcast }
}

describe('UpdateService', () => {
  it('disables automatic downloads and reports unsupported development builds', async () => {
    const { updater, service } = createService(false)

    expect(updater.autoDownload).toBe(false)
    expect(updater.autoInstallOnAppQuit).toBe(true)
    expect((await service.checkForUpdates()).phase).toBe('unsupported')
    expect(updater.checkForUpdates).not.toHaveBeenCalled()
  })

  it('broadcasts availability, download progress, and completion', async () => {
    const { updater, service, broadcast } = createService()

    updater.checkForUpdates.mockImplementationOnce(async () => {
      updater.emit('checking-for-update')
      updater.emit('update-available', updateInfo())
    })
    await service.checkForUpdates()

    expect(service.getStatus()).toMatchObject({
      phase: 'available',
      currentVersion: '1.0.0',
      availableVersion: '1.1.0',
      releaseNotes: '更新说明'
    })

    updater.downloadUpdate.mockImplementationOnce(async () => {
      updater.emit('download-progress', {
        percent: 42,
        bytesPerSecond: 1024,
        transferred: 42,
        total: 100,
        delta: 42
      } satisfies ProgressInfo)
      updater.emit('update-downloaded', { ...updateInfo(), downloadedFile: '/tmp/update.zip' })
    })
    await service.downloadUpdate()

    expect(service.getStatus()).toMatchObject({ phase: 'downloaded', percent: 100 })
    expect(broadcast).toHaveBeenCalledWith(expect.objectContaining({ phase: 'downloading' }))
    expect(broadcast).toHaveBeenCalledWith(expect.objectContaining({ phase: 'downloaded' }))
  })

  it('only installs a downloaded update', () => {
    const { updater, service } = createService()

    expect(() => service.installUpdate()).toThrow('更新尚未下载完成')
    updater.emit('update-downloaded', { ...updateInfo(), downloadedFile: '/tmp/update.zip' })
    service.installUpdate()

    expect(updater.quitAndInstall).toHaveBeenCalledWith(false, true)
  })

  it('turns updater failures into an error status', async () => {
    const { updater, service } = createService()
    updater.checkForUpdates.mockRejectedValueOnce(new Error('network unavailable'))

    await service.checkForUpdates()

    expect(service.getStatus()).toMatchObject({
      phase: 'error',
      message: 'network unavailable'
    })
  })
})
