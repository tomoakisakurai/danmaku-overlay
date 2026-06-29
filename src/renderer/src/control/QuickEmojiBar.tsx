import type { Sticker } from '../stickers'

interface QuickEmojiBarProps {
  /** 同梱画像（スタンプ）。行の左端に表示する。 */
  stickers: Sticker[]
  /** 直前に使った絵文字（新しい順）。固定バーにあるものは除外して右側に表示する。 */
  recentEmojis: string[]
  /** 押した絵文字を即コメントとして送信する。 */
  onSend: (text: string) => void
  /** 同梱画像を即送信する（キーと表示名）。 */
  onSendSticker: (key: string, name: string) => void
}

// よく使う絵文字（ワンタップで即送信）。その他は入力欄左の 😀 ピッカーから送る。
const QUICK_EMOJIS = ['🎉', '👍', '😂', '❤️', '🔥', '👏']

// 履歴として右側に表示する直前の絵文字の数。
const RECENT_DISPLAY_COUNT = 2

/** スタンプ（左）→ よく使う絵文字 → 直前に使った絵文字（右）を1行に並べる常設バー。 */
export function QuickEmojiBar({ stickers, recentEmojis, onSend, onSendSticker }: QuickEmojiBarProps) {
  const recent = recentEmojis
    .filter((emoji) => !QUICK_EMOJIS.includes(emoji))
    .slice(0, RECENT_DISPLAY_COUNT)

  return (
    <section aria-label="よく使う絵文字" className="flex flex-wrap items-center gap-1.5">
      {stickers.map((sticker) => (
        <button
          key={`sticker-${sticker.key}`}
          type="button"
          aria-label={`${sticker.name} を送信`}
          title={sticker.name}
          onClick={() => onSendSticker(sticker.key, sticker.name)}
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-zinc-800 transition-colors hover:bg-zinc-700 active:bg-sky-600"
        >
          <img src={sticker.url} alt={sticker.name} className="max-h-7 max-w-7 object-contain" />
        </button>
      ))}

      {stickers.length > 0 && <span className="mx-0.5 h-6 w-px bg-zinc-700" aria-hidden="true" />}

      {QUICK_EMOJIS.map((emoji, index) => (
        <button
          key={`fixed-${emoji}-${index}`}
          type="button"
          aria-label={`${emoji} を送信`}
          onClick={() => onSend(emoji)}
          className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-800 text-lg leading-none transition-colors hover:bg-zinc-700 active:bg-sky-600"
        >
          {emoji}
        </button>
      ))}

      {recent.length > 0 && (
        <>
          <span className="mx-0.5 h-6 w-px bg-zinc-700" aria-hidden="true" />
          {recent.map((emoji, index) => (
            <button
              key={`recent-${emoji}-${index}`}
              type="button"
              aria-label={`${emoji} を送信（最近使った）`}
              title="最近使った絵文字"
              onClick={() => onSend(emoji)}
              className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-800/60 text-lg leading-none ring-1 ring-zinc-700 transition-colors hover:bg-zinc-700 active:bg-sky-600"
            >
              {emoji}
            </button>
          ))}
        </>
      )}
    </section>
  )
}
