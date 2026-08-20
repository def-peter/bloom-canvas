import { access } from 'node:fs/promises'
import { app, shell, BrowserWindow, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import icon from '../../resources/icon.png?asset'
import { IPC_CHANNELS } from '../shared/ipc'
import {
  APP_ID,
  configureApplicationName,
  configureDockIcon,
  getMainWindowIdentityOptions
} from './applicationIdentity'
import { migrateLegacyMacApplication } from './legacyApplicationMigration'
import { registerIpcHandlers } from './ipc/registerIpcHandlers'
import { registerUpdateIpcHandlers } from './ipc/registerUpdateIpcHandlers'
import { registerAssetProtocolHandler, registerAssetProtocolScheme } from './protocol/assetProtocol'
import { getAppPaths } from './services/appPaths'
import { StorageService } from './services/storageService'
import { UpdateService } from './services/updateService'

registerAssetProtocolScheme()
configureApplicationName(app)

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...getMainWindowIdentityOptions(process.platform, icon),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  try {
    await migrateLegacyMacApplication({
      platform: process.platform,
      isPackaged: app.isPackaged,
      currentExecutablePath: process.execPath,
      homeDirectory: app.getPath('home'),
      pathExists: async (path) => {
        try {
          await access(path)
          return true
        } catch {
          return false
        }
      },
      confirmRemoval: async () => {
        const { response } = await dialog.showMessageBox({
          type: 'info',
          title: '发现旧版 bloom-canvas',
          message: '是否将旧版 bloom-canvas 移到废纸篓？',
          detail: '旧版使用旧名称和图标。作品、设置和 API 配置保存在单独目录，不会被删除。',
          buttons: ['移到废纸篓', '暂时保留'],
          defaultId: 0,
          cancelId: 1
        })
        return response === 0
      },
      trashItem: (path) => shell.trashItem(path)
    })
  } catch (error) {
    console.warn('Failed to migrate the legacy macOS application.', error)
  }

  configureDockIcon(app, process.platform, icon)

  // Set app user model id for windows
  electronApp.setAppUserModelId(APP_ID)

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const updateService = new UpdateService({
    updater: autoUpdater,
    currentVersion: app.getVersion(),
    isPackaged: app.isPackaged,
    broadcast: (status) => {
      for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send(IPC_CHANNELS.updateStatusChanged, status)
      }
    }
  })

  registerIpcHandlers()
  registerUpdateIpcHandlers(updateService)
  registerAssetProtocolHandler(new StorageService(getAppPaths()))

  createWindow()
  updateService.initialize()
  if (app.isPackaged) void updateService.checkForUpdates()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
