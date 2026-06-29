import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import type { DanmakuComment } from '@shared/types'
import { RoomBar } from './RoomBar'
import { StealthNotice } from './StealthNotice'
import { QuickEmojiBar } from './QuickEmojiBar'
import { EmojiPickerModal } from './EmojiPickerModal'
import { CommentComposer } from './CommentComposer'
import { AppearanceControls } from './AppearanceControls'
import { DisplaySelector } from './DisplaySelector'
import { STICKERS } from '../stickers'

const DEFAULT_COLOR = '#FFFFFF'
const DEFAULT_DURATION_MS = 8000
const DEFAULT_FONT_SIZE_PX = 32

// ランダムモードで使う範囲（プリセットの最小〜最大に合わせる）。
const DURATION_RANGE_MS = { min: 5000, max: 12000 }
const FONT_SIZE_RANGE_PX = { min: 24, max: 44 }

// 絵文字ピッカー表示時のウィンドウサイズ（通常時の幅はユーザー調整に任せ、高さは中身に自動フィット）。
const CONTROL_PICKER_WIDTH = 480
const CONTROL_PICKER_HEIGHT = 680

const RECENT_STORAGE_KEY = 'danmaku-recent-emojis'
// 直前に使った絵文字の保持上限（固定バー分より多めに持ち、表示時に固定分を除外する）。
const RECENT_EMOJI_LIMIT = 12

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function randomInRange(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min))
}

/** ランダムモード用に、明るく読みやすい色をランダム生成する。 */
function randomCommentColor(): string {
  const hue = Math.floor(Math.random() * 360)
  return `hsl(${hue}, 85%, 65%)`
}

function readRecentEmojis(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

/** コメント入力・見た目設定・表示制御をまとめた操作パネル。 */
export function Control() {
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [isRandomColor, setIsRandomColor] = useState(false)
  const [durationMs, setDurationMs] = useState(DEFAULT_DURATION_MS)
  const [isRandomSpeed, setIsRandomSpeed] = useState(true)
  const [fontSizePx, setFontSizePx] = useState(DEFAULT_FONT_SIZE_PX)
  const [isRandomSize, setIsRandomSize] = useState(true)
  const [isOverlayVisible, setIsOverlayVisible] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [recentEmojis, setRecentEmojis] = useState<string[]>(readRecentEmojis)
  const mainRef = useRef<HTMLElement>(null)
  // ピッカーを開く前の幅を覚えておき、閉じたときに戻す。
  const widthBeforePickerRef = useRef<number | null>(null)
  // タイトルバー等の外枠分の高さ。初回に1度だけ測ってキャッシュ（リサイズ中の不安定な読み取りを避ける）。
  const chromeHeightRef = useRef<number | null>(null)

  const handleSend = (text: string) => {
    const comment: DanmakuComment = {
      id: createId(),
      text,
      color: isRandomColor ? randomCommentColor() : color,
      fontSizePx: isRandomSize ? randomInRange(FONT_SIZE_RANGE_PX.min, FONT_SIZE_RANGE_PX.max) : fontSizePx,
      durationMs: isRandomSpeed ? randomInRange(DURATION_RANGE_MS.min, DURATION_RANGE_MS.max) : durationMs,
    }
    window.danmaku.sendComment(comment)
  }

  // 絵文字の送信（クイックバー・ピッカー共通）。直前に使った絵文字として記録する。
  const handleSendEmoji = (emoji: string) => {
    handleSend(emoji)
    setRecentEmojis((previous) =>
      [emoji, ...previous.filter((current) => current !== emoji)].slice(0, RECENT_EMOJI_LIMIT),
    )
  }

  // 同梱画像（スタンプ）の送信。imageKey を載せて配信し、各クライアントが自分の同梱画像で表示する。
  const handleSendSticker = (key: string, name: string) => {
    const comment: DanmakuComment = {
      id: createId(),
      text: name,
      imageKey: key,
      color,
      fontSizePx: isRandomSize ? randomInRange(FONT_SIZE_RANGE_PX.min, FONT_SIZE_RANGE_PX.max) : fontSizePx,
      durationMs: isRandomSpeed ? randomInRange(DURATION_RANGE_MS.min, DURATION_RANGE_MS.max) : durationMs,
    }
    window.danmaku.sendComment(comment)
  }

  const handleToggleVisibility = () => {
    const next = !isOverlayVisible
    setIsOverlayVisible(next)
    window.danmaku.setOverlayVisible(next)
  }

  const handleToggleSettings = () => {
    setIsSettingsOpen((previous) => !previous)
  }

  // ウィンドウサイズを調整する。高さは中身に自動フィット、幅はユーザーの手動調整を尊重（据え置き）。
  // ピッカー表示中だけ一時的に広げ、閉じたら元の幅に戻す。
  useEffect(() => {
    if (isEmojiPickerOpen) {
      widthBeforePickerRef.current = window.outerWidth
      window.danmaku.setControlSize({ width: CONTROL_PICKER_WIDTH, height: CONTROL_PICKER_HEIGHT })
      return
    }
    const element = mainRef.current
    if (!element) return
    // 最初の1回だけ「戻すべき幅」を適用し、以降は幅を据え置く（手動リサイズを邪魔しない）。
    let widthToApply: number | undefined = widthBeforePickerRef.current ?? undefined
    widthBeforePickerRef.current = null
    const applySize = () => {
      // 外枠（タイトルバー）分は初回だけ測ってキャッシュ。中身の高さに外枠を足してぴったり収める。
      if (chromeHeightRef.current === null) {
        chromeHeightRef.current = Math.max(window.outerHeight - window.innerHeight, 0)
      }
      const height = Math.ceil(element.offsetHeight) + chromeHeightRef.current
      window.danmaku.setControlSize({ width: widthToApply, height })
      widthToApply = undefined
    }
    applySize()
    const observer = new ResizeObserver(applySize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [isEmojiPickerOpen])

  // 直前に使った絵文字を保存する。
  useEffect(() => {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recentEmojis))
  }, [recentEmojis])

  return (
    <main ref={mainRef} className="flex flex-col gap-3 bg-zinc-900 p-4 text-zinc-100">
      <header className="flex items-center justify-between">
        <h1 className="m-0 text-sm font-bold tracking-wide text-zinc-300">コメント弾幕</h1>
        <nav className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleSettings}
            aria-pressed={isSettingsOpen}
            className={clsx(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              isSettingsOpen
                ? 'bg-sky-500 text-white hover:bg-sky-400'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700',
            )}
          >
            設定
          </button>
          <button
            type="button"
            onClick={handleToggleVisibility}
            aria-pressed={isOverlayVisible}
            title={
              isOverlayVisible
                ? '自分の画面に表示中（クリックで自分には出さない／ルーム接続中は相手に流れます）'
                : '自分の画面には非表示（ルーム接続中は相手に流れています）'
            }
            className={clsx(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              isOverlayVisible
                ? 'bg-zinc-700 text-zinc-100 hover:bg-zinc-600'
                : 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30',
            )}
          >
            {isOverlayVisible ? '表示中' : '非表示'}
          </button>
          <button
            type="button"
            onClick={() => window.danmaku.clearComments()}
            className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
          >
            クリア
          </button>
        </nav>
      </header>

      <RoomBar />

      <StealthNotice isOverlayVisible={isOverlayVisible} />

      {isSettingsOpen && (
        <>
          <AppearanceControls
            color={color}
            isRandomColor={isRandomColor}
            durationMs={durationMs}
            isRandomSpeed={isRandomSpeed}
            fontSizePx={fontSizePx}
            isRandomSize={isRandomSize}
            onColorChange={setColor}
            onRandomColorChange={setIsRandomColor}
            onDurationChange={setDurationMs}
            onRandomSpeedChange={setIsRandomSpeed}
            onFontSizeChange={setFontSizePx}
            onRandomSizeChange={setIsRandomSize}
          />
          <DisplaySelector />
        </>
      )}

      <QuickEmojiBar
        stickers={STICKERS}
        recentEmojis={recentEmojis}
        onSend={handleSendEmoji}
        onSendSticker={handleSendSticker}
      />

      <CommentComposer onSend={handleSend} onOpenEmojiPicker={() => setIsEmojiPickerOpen(true)} />

      {isEmojiPickerOpen && (
        <EmojiPickerModal onSelect={handleSendEmoji} onClose={() => setIsEmojiPickerOpen(false)} />
      )}
    </main>
  )
}
