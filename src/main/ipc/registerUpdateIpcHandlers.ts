import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc'
import type { AppResult } from '../../shared/types'
import type { UpdateService } from '../services/updateService'

function failed(error: unknown): AppResult<never> {
  return {
    ok: false,
    error: {
      code: 'update_error',
      message: error instanceof Error ? error.message : '更新操作失败'
    }
  }
}

export function registerUpdateIpcHandlers(updateService: UpdateService): void {
  ipcMain.handle(IPC_CHANNELS.updateGetStatus, () => ({
    ok: true,
    data: updateService.getStatus()
  }))

  ipcMain.handle(IPC_CHANNELS.updateCheck, async () => {
    try {
      return { ok: true, data: await updateService.checkForUpdates() }
    } catch (error) {
      return failed(error)
    }
  })

  ipcMain.handle(IPC_CHANNELS.updateDownload, async () => {
    try {
      return { ok: true, data: await updateService.downloadUpdate() }
    } catch (error) {
      return failed(error)
    }
  })

  ipcMain.handle(IPC_CHANNELS.updateInstall, () => {
    try {
      updateService.installUpdate()
      return { ok: true, data: undefined }
    } catch (error) {
      return failed(error)
    }
  })
}
