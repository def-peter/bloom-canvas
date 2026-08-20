import { createHash } from 'node:crypto'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { listPackage } from '@electron/asar'

const MAX_INSTALLER_SIZE_BYTES = 180 * 1024 * 1024

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await collectFiles(entryPath)))
    else if (entry.isFile()) files.push(entryPath)
  }

  return files
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function normalizePath(filePath) {
  return filePath.split(sep).join('/')
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function hashFile(filePath) {
  return createHash('sha256')
    .update(await readFile(filePath))
    .digest('hex')
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function verifyPackagedApp(outputDirectory) {
  const root = resolve(outputDirectory)
  const files = await collectFiles(root)
  const relativeFiles = files.map((file) => normalizePath(relative(root, file)))
  const errors = []

  const nestedElectronFiles = relativeFiles.filter((file) =>
    file.toLowerCase().includes('/resources/app.asar.unpacked/node_modules/electron/')
  )
  if (nestedElectronFiles.length > 0) {
    errors.push(`packaged a second Electron runtime (${nestedElectronFiles[0]})`)
  }

  const archives = files.filter((file) =>
    normalizePath(file).toLowerCase().endsWith('/resources/app.asar')
  )
  if (archives.length === 0) errors.push('no packaged app.asar was found')

  for (const archive of archives) {
    const includesElectron = listPackage(archive).some((file) =>
      file.startsWith('/node_modules/electron/')
    )
    if (includesElectron) {
      errors.push(
        `app.asar contains the Electron development dependency (${relative(root, archive)})`
      )
    }
  }

  const expectedMacIcon = resolve('build/icon.icns')
  const macIcons = files.filter((file) =>
    normalizePath(file).toLowerCase().endsWith('.app/contents/resources/icon.icns')
  )
  const expectedMacIconHash = await hashFile(expectedMacIcon)
  for (const icon of macIcons) {
    if ((await hashFile(icon)) !== expectedMacIconHash) {
      errors.push(`packaged macOS icon does not match build/icon.icns (${relative(root, icon)})`)
    }
  }

  const installers = files.filter((file) => /(?:\.dmg|\.zip|-setup\.exe)$/i.test(file))
  for (const installer of installers) {
    const { size } = await stat(installer)
    if (size > MAX_INSTALLER_SIZE_BYTES) {
      errors.push(
        `installer exceeds 180 MiB (${relative(root, installer)}: ${(size / 1024 / 1024).toFixed(1)} MiB)`
      )
    }
  }

  if (errors.length > 0) throw new Error(errors.join('\n'))

  return {
    archives: archives.length,
    installers: installers.length,
    macIcons: macIcons.length
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const outputDirectory = process.argv[2] ?? 'dist'
  const result = await verifyPackagedApp(outputDirectory)
  console.log(
    `Verified ${result.archives} packaged application(s) and ${result.installers} installer(s).`
  )
}
