import type { BloomCanvasApi } from '../shared/ipc'

declare global {
  interface Window {
    bloomCanvas: BloomCanvasApi
  }
}
