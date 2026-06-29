import { useCallback, useEffect, useRef, useState } from 'react'
import type { DanmakuComment } from '@shared/types'

/** 表示中のコメント。割り当てられたレーンの上端 Y 座標を持つ。 */
export interface ActiveComment extends DanmakuComment {
  laneTopPx: number
}

/** 1 レーン（行）の高さ。フォント最大サイズ + 余白を見込んだ固定値。 */
const LANE_HEIGHT_PX = 52
/** レーン内の上余白。文字を行の中央寄りに見せる。 */
const LANE_TOP_PADDING_PX = 12
/** 同じレーンに次を流すまでの最低間隔(ms)。詰まりすぎを防ぐ。 */
const MINIMUM_LANE_GAP_MS = 120

/** 文字幅の計測用に使い回す canvas コンテキスト。 */
let sharedCanvasContext: CanvasRenderingContext2D | null = null

function measureCommentWidth(text: string, fontSizePx: number): number {
  if (!sharedCanvasContext) {
    sharedCanvasContext = document.createElement('canvas').getContext('2d')
  }
  if (!sharedCanvasContext) {
    // canvas が使えない環境向けのざっくり見積もり（全角想定）。
    return text.length * fontSizePx
  }
  sharedCanvasContext.font = `700 ${fontSizePx}px sans-serif`
  return sharedCanvasContext.measureText(text).width
}

/** コメントの受信・レーン割り当て・破棄をまとめて扱うフック。 */
export function useDanmaku() {
  const [comments, setComments] = useState<ActiveComment[]>([])
  // レーンごとに「次に空く時刻」を保持し、重なりを避けて割り当てる。
  const laneAvailableAtRef = useRef<number[]>([])

  const pickLaneTopPx = useCallback((comment: DanmakuComment): number => {
    const laneCount = Math.max(1, Math.floor(window.innerHeight / LANE_HEIGHT_PX))
    if (laneAvailableAtRef.current.length !== laneCount) {
      laneAvailableAtRef.current = new Array(laneCount).fill(0)
    }

    const now = Date.now()
    // 画像は正方形と仮定して概算（レーンの重なり回避用）。
    const commentWidth = comment.imageKey
      ? comment.fontSizePx
      : measureCommentWidth(comment.text, comment.fontSizePx)
    const travelDistance = window.innerWidth + commentWidth
    // コメントの末尾が画面右端を抜け切るまでの時間。これだけ空ければ次が重ならない。
    const tailClearMs = comment.durationMs * (commentWidth / travelDistance) + MINIMUM_LANE_GAP_MS

    // 空いているレーンを集め、その中からランダムに選ぶ（上下にバラけさせる）。
    // 全部埋まっていたら、最も早く空くレーンにフォールバックして重なりを最小化する。
    const freeLanes: number[] = []
    let soonestLane = 0
    let soonestAvailableAt = Number.POSITIVE_INFINITY
    for (let lane = 0; lane < laneCount; lane += 1) {
      const availableAt = laneAvailableAtRef.current[lane]
      if (availableAt <= now) {
        freeLanes.push(lane)
      }
      if (availableAt < soonestAvailableAt) {
        soonestAvailableAt = availableAt
        soonestLane = lane
      }
    }

    const chosenLane =
      freeLanes.length > 0 ? freeLanes[Math.floor(Math.random() * freeLanes.length)] : soonestLane

    laneAvailableAtRef.current[chosenLane] = now + tailClearMs
    return chosenLane * LANE_HEIGHT_PX + LANE_TOP_PADDING_PX
  }, [])

  useEffect(() => {
    const unsubscribeComment = window.danmaku.onComment((comment) => {
      const laneTopPx = pickLaneTopPx(comment)
      setComments((previous) => [...previous, { ...comment, laneTopPx }])
    })
    const unsubscribeClear = window.danmaku.onClear(() => {
      setComments([])
      laneAvailableAtRef.current = []
    })
    return () => {
      unsubscribeComment()
      unsubscribeClear()
    }
  }, [pickLaneTopPx])

  const removeComment = useCallback((id: string) => {
    setComments((previous) => previous.filter((comment) => comment.id !== id))
  }, [])

  return { comments, removeComment }
}
