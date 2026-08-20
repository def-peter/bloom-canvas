import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'
import { APP_ID } from './applicationIdentity'

describe('electron-builder application identity', () => {
  it('excludes the Electron development runtime from packaged files', async () => {
    const config = parse(await readFile(resolve('electron-builder.yml'), 'utf8'))

    expect(config.files).toEqual([
      'out/**/*',
      'package.json',
      'resources/**/*',
      '!node_modules/electron{,/**/*}'
    ])
  })

  it('uses explicit platform icons and the stable application id', async () => {
    const config = parse(await readFile(resolve('electron-builder.yml'), 'utf8'))

    expect(config.appId).toBe(APP_ID)
    expect(config.mac.icon).toBe('build/icon.icns')
    expect(config.win.icon).toBe('build/icon.ico')
  })
})
