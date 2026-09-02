import type { ProgressInfo, UpdateDownloadedEvent, UpdateInfo } from 'electron-updater'
import { convert } from 'html-to-text'
import type { AppUpdateStatus } from '../../shared/ipc'

export interface UpdateAdapter {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  on(event: 'checking-for-update', listener: () => void): unknown
  on(
    event: 'update-available' | 'update-not-available',
    listener: (info: UpdateInfo) => void
  ): unknown
  on(event: 'download-progress', listener: (progress: ProgressInfo) => void): unknown
  on(event: 'update-downloaded', listener: (info: UpdateDownloadedEvent) => void): unknown
  on(event: 'error', listener: (error: Error) => void): unknown
  checkForUpdates(): Promise<unknown>
  downloadUpdate(): Promise<unknown>
  quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void
}

interface UpdateServiceOptions {
  updater: UpdateAdapter
  currentVersion: string
  isPackaged: boolean
  broadcast: (status: AppUpdateStatus) => void
}

function releaseNotesText(releaseNotes: UpdateInfo['releaseNotes']): string | undefined {
  const notes =
    typeof releaseNotes === 'string' ? [releaseNotes] : releaseNotes?.map((note) => note.note)
  const text = notes
    ?.filter((note): note is string => Boolean(note))
    .map((note) =>
      convert(note, {
        wordwrap: false,
        selectors: [{ selector: 'a', options: { ignoreHref: true } }]
      }).trim()
    )
    .filter(Boolean)
    .join('\n\n')
  return text || undefined
}

export class UpdateService {
  private status: AppUpdateStatus
  private initialized = false

  constructor(private readonly options: UpdateServiceOptions) {
    this.status = {
      phase: options.isPackaged ? 'idle' : 'unsupported',
      currentVersion: options.currentVersion,
      message: options.isPackaged ? undefined : '开发环境不支持检查更新'
    }
  }

  initialize(): void {
    if (this.initialized) return
    this.initialized = true
    const { updater } = this.options
    updater.autoDownload = false
    updater.autoInstallOnAppQuit = true

    updater.on('checking-for-update', () => this.update({ phase: 'checking', message: undefined }))
    updater.on('update-available', (info: UpdateInfo) => {
      this.updateFromInfo('available', info)
    })
    updater.on('update-not-available', (info: UpdateInfo) => {
      this.updateFromInfo('not-available', info)
    })
    updater.on('download-progress', (progress: ProgressInfo) => {
      this.update({
        phase: 'downloading',
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total,
        message: undefined
      })
    })
    updater.on('update-downloaded', (info: UpdateDownloadedEvent) => {
      this.updateFromInfo('downloaded', info)
    })
    updater.on('error', (error: Error) => {
      this.update({ phase: 'error', message: error.message })
    })
  }

  getStatus(): AppUpdateStatus {
    return { ...this.status }
  }

  async checkForUpdates(): Promise<AppUpdateStatus> {
    if (!this.options.isPackaged) return this.getStatus()
    this.initialize()
    try {
      await this.options.updater.checkForUpdates()
    } catch (error) {
      this.update({ phase: 'error', message: this.errorMessage(error) })
    }
    return this.getStatus()
  }

  async downloadUpdate(): Promise<AppUpdateStatus> {
    if (this.status.phase !== 'available') {
      throw new Error('当前没有可下载的新版本')
    }
    this.update({ phase: 'downloading', percent: 0, message: undefined })
    try {
      await this.options.updater.downloadUpdate()
    } catch (error) {
      this.update({ phase: 'error', message: this.errorMessage(error) })
    }
    return this.getStatus()
  }

  installUpdate(): void {
    if (this.status.phase !== 'downloaded') {
      throw new Error('更新尚未下载完成')
    }
    this.options.updater.quitAndInstall(false, true)
  }

  private updateFromInfo(phase: AppUpdateStatus['phase'], info: UpdateInfo): void {
    this.update({
      phase,
      availableVersion: info.version,
      releaseName: info.releaseName ?? undefined,
      releaseNotes: releaseNotesText(info.releaseNotes),
      checkedAt: new Date().toISOString(),
      message: undefined,
      percent: phase === 'downloaded' ? 100 : undefined
    })
  }

  private update(patch: Partial<AppUpdateStatus>): void {
    this.status = { ...this.status, ...patch }
    this.options.broadcast(this.getStatus())
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : '检查更新失败'
  }
}
