import { FlowingComment } from './FlowingComment'
import type { ActiveComment } from './useDanmaku'

interface CommentLayerProps {
  comments: ActiveComment[]
  onCommentEnd: (id: string) => void
}

export function CommentLayer({ comments, onCommentEnd }: CommentLayerProps) {
  return (
    <ul className="m-0 list-none p-0">
      {comments.map((comment) => (
        <FlowingComment key={comment.id} comment={comment} onEnd={onCommentEnd} />
      ))}
    </ul>
  )
}
