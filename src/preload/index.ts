import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { IPC_CHANNELS, type BloomCanvasApi } from '../shared/ipc'

const bloomCanvasApi: BloomCanvasApi = {
  providers: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.providerList),
    save: (input) => ipcRenderer.invoke(IPC_CHANNELS.providerSave, input),
    getActive: () => ipcRenderer.invoke(IPC_CHANNELS.providerGetActive)
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.settingsGet),
    save: (input) => ipcRenderer.invoke(IPC_CHANNELS.settingsSave, input)
  },
  assets: {
    getPathForFile: (file) => webUtils.getPathForFile(file as File),
    import: (input) => ipcRenderer.invoke(IPC_CHANNELS.assetImport, input),
    export: (input) => ipcRenderer.invoke(IPC_CHANNELS.assetExport, input),
    getMany: (assetIds) => ipcRenderer.invoke(IPC_CHANNELS.assetGetMany, assetIds)
  },
  generations: {
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.generationCreate, input),
    list: () => ipcRenderer.invoke(IPC_CHANNELS.generationList),
    favorite: (generationId, favorite) =>
      ipcRenderer.invoke(IPC_CHANNELS.generationFavorite, generationId, favorite),
    remove: (generationId) => ipcRenderer.invoke(IPC_CHANNELS.generationRemove, generationId),
    removeVariants: (variantIds) =>
      ipcRenderer.invoke(IPC_CHANNELS.generationRemoveVariants, variantIds),
    retry: (generationId) => ipcRenderer.invoke(IPC_CHANNELS.generationRetry, generationId)
  },
  prompt: {
    optimize: (input) => ipcRenderer.invoke(IPC_CHANNELS.promptOptimize, input)
  },
  logoProjects: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.logoProjectList),
    save: (input) => ipcRenderer.invoke(IPC_CHANNELS.logoProjectSave, input),
    get: (id) => ipcRenderer.invoke(IPC_CHANNELS.logoProjectGet, id),
    remove: (id) => ipcRenderer.invoke(IPC_CHANNELS.logoProjectRemove, id)
  },
  logoStrategy: {
    generate: (input) => ipcRenderer.invoke(IPC_CHANNELS.logoStrategyGenerate, input)
  },
  logoPreview: {
    get: (assetId) => ipcRenderer.invoke(IPC_CHANNELS.logoPreviewGet, assetId)
  },
  logoReview: {
    run: (input) => ipcRenderer.invoke(IPC_CHANNELS.logoReviewRun, input)
  },
  logoPrompt: {
    build: (input) => ipcRenderer.invoke(IPC_CHANNELS.logoPromptBuild, input),
    buildStrategy: (input) => ipcRenderer.invoke(IPC_CHANNELS.logoPromptBuildStrategy, input)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('bloomCanvas', bloomCanvasApi)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.bloomCanvas = bloomCanvasApi
}
