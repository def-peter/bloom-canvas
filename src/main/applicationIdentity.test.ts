import { describe, expect, it } from 'vitest'
import {
  APP_DISPLAY_NAME,
  configureApplicationName,
  configureDockIcon,
  getMainWindowIdentityOptions
} from './applicationIdentity'

describe('application identity', () => {
  it('uses the BloomCanvas product name without moving existing user data', () => {
    const events: string[] = []
    const app = {
      getPath: (name: 'userData') => {
        events.push(`getPath:${name}`)
        return '/existing/user-data'
      },
      setName: (name: string) => events.push(`setName:${name}`),
      setPath: (name: 'userData', path: string) => events.push(`setPath:${name}:${path}`)
    }

    configureApplicationName(app)

    expect(APP_DISPLAY_NAME).toBe('BloomCanvas')
    expect(events).toEqual([
      'getPath:userData',
      'setName:BloomCanvas',
      'setPath:userData:/existing/user-data'
    ])
  })

  it('sets the flower icon on the macOS Dock', () => {
    const iconPaths: string[] = []
    const app = {
      dock: {
        setIcon: (iconPath: string) => iconPaths.push(iconPath)
      }
    }

    configureDockIcon(app, 'darwin', '/resources/icon.png')

    expect(iconPaths).toEqual(['/resources/icon.png'])
  })

  it('does not use the macOS Dock API on other platforms', () => {
    const iconPaths: string[] = []
    const app = {
      dock: {
        setIcon: (iconPath: string) => iconPaths.push(iconPath)
      }
    }

    configureDockIcon(app, 'win32', '/resources/icon.png')

    expect(iconPaths).toEqual([])
  })

  it('provides the product title on every platform and keeps the Linux window icon', () => {
    expect(getMainWindowIdentityOptions('darwin', '/resources/icon.png')).toEqual({
      title: 'BloomCanvas'
    })
    expect(getMainWindowIdentityOptions('linux', '/resources/icon.png')).toEqual({
      title: 'BloomCanvas',
      icon: '/resources/icon.png'
    })
  })
})
