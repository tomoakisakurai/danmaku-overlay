import type { CSSProperties } from 'react'
import type { ActiveComment } from './useDanmaku'
import { STICKER_URL_BY_KEY } from '../stickers'

interface FlowingCommentProps {
  comment: ActiveComment
  onEnd: (id: string) => void
}

/** 1 件のコメント。CSS アニメーションで右から左へ流れ、流れ切ったら自分で消える。 */
export function FlowingComment({ comment, onEnd }: FlowingCommentProps) {
  const style: CSSProperties = {
    top: `${comment.laneTopPx}px`,
    color: comment.color,
    fontSize: `${comment.fontSizePx}px`,
    animationDuration: `${comment.durationMs}ms`,
  }

  // imageKey があり、このクライアントに同梱画像があれば画像を流す。無ければテキスト（名前）でフォールバック。
  const stickerUrl = comment.imageKey ? STICKER_URL_BY_KEY[comment.imageKey] : undefined

  return (
    <li
      className="danmaku-comment absolute left-0 whitespace-nowrap font-bold leading-none will-change-transform"
      style={style}
      onAnimationEnd={() => onEnd(comment.id)}
    >
      {stickerUrl ? (
        <img
          src={stickerUrl}
          alt={comment.text}
          className="block w-auto"
          style={{ height: `${comment.fontSizePx}px`, filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.8))' }}
        />
      ) : (
        comment.text
      )}
    </li>
  )
}
