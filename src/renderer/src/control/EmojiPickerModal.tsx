import { useEffect } from 'react'
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'

interface EmojiPickerModalProps {
  /** 選んだ絵文字を即送信する。 */
  onSelect: (emoji: string) => void
  onClose: () => void
}

interface EmojiMartSelection {
  native?: string
}

/** Slack 風の絵文字ピッカー（検索・カテゴリ付き）。選ぶと即送信し、連続で選べるよう開いたまま。 */
export function EmojiPickerModal({ onSelect, onClose }: EmojiPickerModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSelect = (selection: EmojiMartSelection) => {
    if (selection.native) onSelect(selection.native)
  }

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="絵文字を送信"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-full w-full flex-col gap-2 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-2xl"
      >
        <header className="flex items-center justify-between">
          <h2 className="m-0 text-sm font-bold text-zinc-200">
            絵文字を送信
            <span className="ml-2 text-[11px] font-normal text-zinc-400">選ぶと流れます</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            ✕
          </button>
        </header>

        <span className="flex w-full justify-center">
          <Picker
            data={data}
            onEmojiSelect={handleSelect}
            theme="dark"
            locale="ja"
            previewPosition="none"
            perLine={10}
            emojiButtonSize={36}
          />
        </span>
      </section>
    </div>
  )
}
