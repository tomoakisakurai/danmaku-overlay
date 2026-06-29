import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import { WebSocket as NodeWebSocket } from 'ws'
import { DANMAKU_BROADCAST_EVENT, type ConnectionState, type DanmakuComment } from '../shared/types'

// createClient のオプションから transport の型だけ取り出す（名前付きエクスポートに依存しない）。
type RealtimeTransport = NonNullable<
  NonNullable<Parameters<typeof createClient>[2]>['realtime']
>['transport']

// sake-mania と同じ Supabase プロジェクトの値を再利用する（テーブルには触れず Broadcast のみ）。
const supabaseUrl = import.meta.env.MAIN_VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.MAIN_VITE_SUPABASE_ANON_KEY

interface RealtimeListeners {
  /** 他クライアントから届いたコメント。 */
  onRemoteComment: (comment: DanmakuComment) => void
  /** 接続状態の変化。 */
  onStateChange: (state: ConnectionState) => void
}

let supabaseClient: SupabaseClient | null = null
let activeChannel: RealtimeChannel | null = null
let currentRoom = ''
let listeners: RealtimeListeners | null = null

function getClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      // Electron 33 の main プロセスは Node 20 でネイティブ WebSocket が無いため、
      // ws を transport として渡す（これが無いと Realtime 初期化で落ちる）。
      // ws のコンストラクタ型は supabase の WebSocketLikeConstructor と厳密一致しない
      // が実行時は有効。この相互運用境界だけ型をキャストする。
      realtime: { transport: NodeWebSocket as unknown as RealtimeTransport },
    })
  }
  return supabaseClient
}

export function initRealtime(realtimeListeners: RealtimeListeners): void {
  listeners = realtimeListeners
}

/** 現在のチャンネルを離脱し、指定ルームのチャンネルへ接続し直す。空文字なら離脱のみ。 */
export function joinRoom(room: string): void {
  const trimmedRoom = room.trim()

  if (activeChannel && supabaseClient) {
    void supabaseClient.removeChannel(activeChannel)
    activeChannel = null
  }

  if (!trimmedRoom) {
    currentRoom = ''
    listeners?.onStateChange({ status: 'idle', room: '' })
    return
  }

  const client = getClient()
  if (!client) {
    // 認証情報未設定。ローカル表示は動くが共有はされない。
    currentRoom = ''
    listeners?.onStateChange({ status: 'error', room: trimmedRoom })
    return
  }

  currentRoom = trimmedRoom
  listeners?.onStateChange({ status: 'connecting', room: trimmedRoom })

  const channel = client.channel(`danmaku:${trimmedRoom}`, {
    // self:false で自分の broadcast は受け取らない（自分のコメントはローカルで即表示する）。
    config: { broadcast: { self: false } },
  })
  channel.on('broadcast', { event: DANMAKU_BROADCAST_EVENT }, (message) => {
    listeners?.onRemoteComment(message.payload as DanmakuComment)
  })
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      listeners?.onStateChange({ status: 'connected', room: trimmedRoom })
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      listeners?.onStateChange({ status: 'error', room: trimmedRoom })
    }
  })
  activeChannel = channel
}

/** 現在のルームへコメントを配信する。未接続なら何もしない。 */
export function broadcastComment(comment: DanmakuComment): void {
  if (!activeChannel || !currentRoom) return
  void activeChannel.send({
    type: 'broadcast',
    event: DANMAKU_BROADCAST_EVENT,
    payload: comment,
  })
}
