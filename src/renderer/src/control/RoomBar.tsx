import { useEffect, useRef, useState, type FormEvent } from 'react'
import clsx from 'clsx'
import type { ConnectionState, ConnectionStatus } from '@shared/types'

const ROOM_STORAGE_KEY = 'danmaku-room'
const ROOM_HISTORY_STORAGE_KEY = 'danmaku-room-history'
const DEFAULT_ROOM = 'general'
const ROOM_HISTORY_LIMIT = 5

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  idle: '未接続',
  connecting: '接続中…',
  connected: '接続済み',
  error: 'エラー',
}

const STATUS_DOT_CLASS: Record<ConnectionStatus, string> = {
  idle: 'bg-zinc-500',
  connecting: 'bg-amber-400',
  connected: 'bg-emerald-400',
  error: 'bg-red-500',
}

function readStoredRoom(): string {
  return localStorage.getItem(ROOM_STORAGE_KEY) ?? DEFAULT_ROOM
}

function readRoomHistory(): string[] {
  try {
    const raw = localStorage.getItem(ROOM_HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

function saveRoomHistory(room: string): void {
  const history = readRoomHistory()
  const updated = [room, ...history.filter((r) => r !== room)].slice(0, ROOM_HISTORY_LIMIT)
  localStorage.setItem(ROOM_HISTORY_STORAGE_KEY, JSON.stringify(updated))
}

function ClipboardIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

/** ルーム名の入力と接続状態の表示。同じルームの人どうしでコメントが共有される。 */
export function RoomBar() {
  const [room, setRoom] = useState(readStoredRoom)
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [joinedRoom, setJoinedRoom] = useState(readStoredRoom)
  const [isCopied, setIsCopied] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [history, setHistory] = useState<string[]>(readRoomHistory)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.danmaku.joinRoom(readStoredRoom())
    return window.danmaku.onConnectionStatus((state: ConnectionState) => {
      setStatus(state.status)
    })
  }, [])

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    if (!isDropdownOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isDropdownOpen])

  const trimmedRoom = room.trim()
  const canConnect = trimmedRoom !== '' && trimmedRoom !== joinedRoom
  const filteredHistory = history.filter((r) => r !== trimmedRoom)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canConnect) return
    localStorage.setItem(ROOM_STORAGE_KEY, trimmedRoom)
    saveRoomHistory(trimmedRoom)
    setHistory(readRoomHistory())
    window.danmaku.joinRoom(trimmedRoom)
    setJoinedRoom(trimmedRoom)
    setIsDropdownOpen(false)
  }

  const handleSelectHistory = (selectedRoom: string) => {
    setRoom(selectedRoom)
    setIsDropdownOpen(false)
    localStorage.setItem(ROOM_STORAGE_KEY, selectedRoom)
    window.danmaku.joinRoom(selectedRoom)
    setJoinedRoom(selectedRoom)
  }

  const handleCopy = () => {
    void navigator.clipboard.writeText(joinedRoom).then(() => {
      setIsCopied(true)
      window.setTimeout(() => setIsCopied(false), 1200)
    })
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-0">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <label className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5">
            <span className="shrink-0 text-[11px] font-medium text-zinc-400">ルーム</span>
            <input
              type="text"
              value={room}
              onChange={(event) => setRoom(event.target.value)}
              onFocus={() => filteredHistory.length > 0 && setIsDropdownOpen(true)}
              placeholder="会議名など"
              className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            />
          </label>

          {isDropdownOpen && filteredHistory.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-md border border-zinc-700 bg-zinc-800 shadow-lg">
              {filteredHistory.map((historyRoom) => (
                <li key={historyRoom}>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault()
                      handleSelectHistory(historyRoom)
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-700"
                  >
                    {historyRoom}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          aria-label="ルーム名をコピーして共有"
          title={isCopied ? 'コピーしました' : 'ルーム名をコピーして共有'}
          className={clsx(
            'flex shrink-0 items-center justify-center rounded-md bg-zinc-800 p-1.5 transition-colors hover:bg-zinc-700',
            isCopied ? 'text-emerald-400' : 'text-zinc-300',
          )}
        >
          {isCopied ? <CheckIcon /> : <ClipboardIcon />}
        </button>
        <button
          type="submit"
          disabled={!canConnect}
          className="shrink-0 rounded-md bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-zinc-700"
        >
          接続
        </button>
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-zinc-400" aria-live="polite">
          <span className={clsx('h-2.5 w-2.5 rounded-full', STATUS_DOT_CLASS[status])} aria-hidden="true" />
          {STATUS_LABEL[status]}
        </span>
      </form>
    </div>
  )
}
