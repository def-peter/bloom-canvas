export const APP_DISPLAY_NAME = 'BloomCanvas'

interface ApplicationNameHost {
  getPath(name: 'userData'): string
  setName(name: string): void
  setPath(name: 'userData', path: string): void
}

interface DockHost {
  dock?: {
    setIcon(iconPath: string): void
  }
}

export function configureApplicationName(app: ApplicationNameHost): void {
  const currentUserDataPath = app.getPath('userData')

  app.setName(APP_DISPLAY_NAME)
  app.setPath('userData', currentUserDataPath)
}

export function configureDockIcon(
  app: DockHost,
  platform: NodeJS.Platform,
  iconPath: string
): void {
  if (platform === 'darwin' && app.dock) {
    app.dock.setIcon(iconPath)
  }
}

export function getMainWindowIdentityOptions(
  platform: NodeJS.Platform,
  iconPath: string
): { title: string; icon?: string } {
  return {
    title: APP_DISPLAY_NAME,
    ...(platform === 'linux' ? { icon: iconPath } : {})
  }
}
