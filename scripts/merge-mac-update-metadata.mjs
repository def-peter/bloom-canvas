import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { parse, stringify } from 'yaml'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function mergeMacUpdateMetadataDocuments(metadata) {
  const files = metadata.flatMap((document) => document.files ?? [])
  const zipFiles = files.filter((file) => file.url?.endsWith('.zip'))
  const x64Zip = zipFiles.find((file) => !file.url.includes('arm64'))
  const arm64Zip = zipFiles.find((file) => file.url.includes('arm64'))

  if (!x64Zip || !arm64Zip) {
    throw new Error('Both x64 and arm64 macOS ZIP entries are required')
  }

  return {
    ...metadata[0],
    files: [x64Zip, arm64Zip],
    path: x64Zip.url,
    sha512: x64Zip.sha512,
    releaseDate: metadata
      .map((document) => document.releaseDate)
      .filter(Boolean)
      .sort()
      .at(-1)
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function main() {
  const [outputPath, ...inputPaths] = process.argv.slice(2)

  if (!outputPath || inputPaths.length !== 2) {
    throw new Error(
      'Usage: node scripts/merge-mac-update-metadata.mjs <output> <x64-yml> <arm64-yml>'
    )
  }

  const metadata = await Promise.all(
    inputPaths.map(async (inputPath) => parse(await readFile(inputPath, 'utf8')))
  )
  const merged = mergeMacUpdateMetadataDocuments(metadata)

  await writeFile(outputPath, stringify(merged), 'utf8')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
