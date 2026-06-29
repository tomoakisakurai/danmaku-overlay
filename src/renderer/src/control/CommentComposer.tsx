import { useState, type FormEvent } from 'react'

interface CommentComposerProps {
  /** 空でないコメント本文を送信する。 */
  onSend: (text: string) => void
  /** 絵文字ピッカー（ポップアップ）を開く。 */
  onOpenEmojiPicker: () => void
}

/** コメント本文の入力欄と送信ボタン。左の 😀 で絵文字ピッカーを開く。Enter で送信。 */
export function CommentComposer({ onSend, onOpenEmojiPicker }: CommentComposerProps) {
  const [text, setText] = useState('')
  const trimmed = text.trim()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!trimmed) return
    onSend(trimmed)
    setText('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <button
        type="button"
        onClick={onOpenEmojiPicker}
        aria-label="絵文字を送信"
        title="絵文字を送信"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 text-lg leading-none transition-colors hover:bg-zinc-700"
      >
        😀
      </button>
      <input
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="コメントを入力して Enter"
        autoFocus
        className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-sky-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={!trimmed}
        className="shrink-0 rounded-md bg-sky-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        送信
      </button>
    </form>
  )
}
