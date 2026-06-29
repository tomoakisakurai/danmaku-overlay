import { useDanmaku } from './useDanmaku'
import { CommentLayer } from './CommentLayer'

/** 画面全体に重なる弾幕レイヤー。ウィンドウ自体が透明・クリック貫通なので、
 *  ここでは見た目（流れるコメント）だけを担当する。 */
export function Overlay() {
  const { comments, removeComment } = useDanmaku()

  return (
    <main className="pointer-events-none fixed inset-0 overflow-hidden">
      <CommentLayer comments={comments} onCommentEnd={removeComment} />
    </main>
  )
}
