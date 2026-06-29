/** メインプロセス・preload・レンダラの 3 プロセスで共有する型と定数。 */

/** 画面を流れる 1 コメント分のデータ。コントロール側で組み立て、オーバーレイ側で表示する。 */
export interface DanmakuComment {
  id: string
  text: string
  /** 同梱画像（スタンプ）のキー＝ファイル名（拡張子なし）。指定時はテキストの代わりに画像を流す。 */
  imageKey?: string
  /** 文字色（CSS カラー）。 */
  color: string
  /** フォントサイズ(px)。 */
  fontSizePx: number
  /** 画面端から端まで流れ切る時間(ms)。小さいほど速い。 */
  durationMs: number
}

/** コメントを流す対象として選べるディスプレイ1台分の情報。 */
export interface DisplayInfo {
  /** Electron のディスプレイ id。 */
  id: number
  /** 表示用ラベル（例: 画面1）。 */
  label: string
  /** 論理解像度。 */
  width: number
  height: number
  /** macOS の主ディスプレイか。 */
  isPrimary: boolean
  /** このディスプレイにコメントを流す対象として選ばれているか。 */
  selected: boolean
}

/** リアルタイム共有（Supabase Realtime）の接続状態。 */
export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

/** 接続状態と、対象のルーム名。 */
export interface ConnectionState {
  status: ConnectionStatus
  room: string
}

/** preload が `window.danmaku` として公開する API。 */
export interface DanmakuApi {
  /** コメントを送信する（自分の画面に表示しつつ、同じルームの全員へ配信）。 */
  sendComment: (comment: DanmakuComment) => void
  /** 表示中のコメントを全消去する（自分の画面のみ）。 */
  clearComments: () => void
  /** オーバーレイの表示/非表示を切り替える。 */
  setOverlayVisible: (visible: boolean) => void
  /** コントロールウィンドウのサイズを変更する（右下を固定して伸縮）。width 省略時は現在の幅を維持。 */
  setControlSize: (size: { width?: number; height: number }) => void
  /** 接続中のディスプレイ一覧を取得する（選択状態つき）。 */
  getDisplays: () => Promise<DisplayInfo[]>
  /** コメントを流す対象のディスプレイを設定する（選ばれた id のみに流す）。 */
  setOverlayDisplays: (displayIds: number[]) => void
  /** ディスプレイ構成の変化（抜き差し等）を購読する。返り値の関数で解除する。 */
  onDisplaysChanged: (callback: (displays: DisplayInfo[]) => void) => () => void
  /** 指定ルームへ接続する（空文字なら切断＝ローカルのみ）。 */
  joinRoom: (room: string) => void
  /** コメント受信を購読する。返り値の関数で解除する。 */
  onComment: (callback: (comment: DanmakuComment) => void) => () => void
  /** 全消去イベントを購読する。返り値の関数で解除する。 */
  onClear: (callback: () => void) => () => void
  /** 接続状態の変化を購読する。返り値の関数で解除する。 */
  onConnectionStatus: (callback: (state: ConnectionState) => void) => () => void
}

/** IPC チャンネル名。送受信で同じ定数を使い、文字列の打ち間違いを防ぐ。 */
export const DANMAKU_CHANNELS = {
  comment: 'danmaku:comment',
  clear: 'danmaku:clear',
  setOverlayVisible: 'danmaku:set-overlay-visible',
  setControlSize: 'danmaku:set-control-size',
  getDisplays: 'danmaku:get-displays',
  setOverlayDisplays: 'danmaku:set-overlay-displays',
  displaysChanged: 'danmaku:displays-changed',
  joinRoom: 'danmaku:join-room',
  connectionStatus: 'danmaku:connection-status',
} as const

/** Supabase Realtime の broadcast イベント名。 */
export const DANMAKU_BROADCAST_EVENT = 'comment'
