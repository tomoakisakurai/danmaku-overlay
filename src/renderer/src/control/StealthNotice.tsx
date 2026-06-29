import { useEffect, useState } from 'react'
import type { ConnectionStatus } from '@shared/types'

interface StealthNoticeProps {
  /** ヘッダーの「表示中/非表示」トグルの状態。非表示でも相手には配信される。 */
  isOverlayVisible: boolean
}

/** 自分の画面には出ないがルームの相手にだけコメントが流れる「裏方モード」を見落とさないための注記。
 *  「流す画面」を全部オフ、または「非表示」にしていて、かつルーム接続中のときに表示する。 */
export function StealthNotice({ isOverlayVisible }: StealthNoticeProps) {
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [selectedCount, setSelectedCount] = useState<number | null>(null)

  useEffect(() => {
    let active = true

    void window.danmaku.getDisplays().then((displays) => {
      if (!active) return
      setSelectedCount(displays.filter((display) => display.selected).length)
    })

    const unsubscribeDisplays = window.danmaku.onDisplaysChanged((displays) => {
      setSelectedCount(displays.filter((display) => display.selected).length)
    })
    const unsubscribeStatus = window.danmaku.onConnectionStatus((state) => setStatus(state.status))

    return () => {
      active = false
      unsubscribeDisplays()
      unsubscribeStatus()
    }
  }, [])

  // 接続中で、かつ「非表示」か「流す画面ゼロ」のときが裏方モード。
  const isStealth = status === 'connected' && (!isOverlayVisible || selectedCount === 0)
  if (!isStealth) return null

  return (
    <p className="m-0 flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
      <span aria-hidden="true">🟡</span>
      自分の画面には出ません（ルームの相手にだけ配信中）
    </p>
  )
}
