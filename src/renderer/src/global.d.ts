import type { DanmakuApi } from '@shared/types'

declare global {
  interface Window {
    danmaku: DanmakuApi
  }
}

export {}
