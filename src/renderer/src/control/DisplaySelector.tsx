import { useEffect, useState } from 'react'
import clsx from 'clsx'
import type { DisplayInfo } from '@shared/types'

const STORAGE_KEY = 'danmaku-overlay-displays'

function readSavedDisplayIds(): number[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as number[]) : null
  } catch {
    return null
  }
}

/** コメントを流すディスプレイをチェックで選ぶ。複数選択でき、選んだ全画面に同時に流れる。
 *  ディスプレイが1台のときは選択不要なので何も表示しない。 */
export function DisplaySelector() {
  const [displays, setDisplays] = useState<DisplayInfo[]>([])

  useEffect(() => {
    let active = true

    void window.danmaku.getDisplays().then((current) => {
      if (!active) return
      // 保存済みの選択があれば、今つながっている画面に絞って復元する。
      // 無ければ main のデフォルト（主ディスプレイ選択）をそのまま使う。
      const saved = readSavedDisplayIds()
      const restored = saved
        ? current.filter((display) => saved.includes(display.id)).map((display) => display.id)
        : current.filter((display) => display.selected).map((display) => display.id)

      // ディスプレイ id は再起動や抜き差しで変わることがある。復元結果が空＝どの画面も
      // 選ばれない状態になったら、事故防止で主ディスプレイにフォールバックして保存も直す。
      let selectedIds = restored
      if (selectedIds.length === 0) {
        const primary = current.find((display) => display.isPrimary) ?? current[0]
        selectedIds = primary ? [primary.id] : []
      }

      window.danmaku.setOverlayDisplays(selectedIds)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds))
      setDisplays(current.map((display) => ({ ...display, selected: selectedIds.includes(display.id) })))
    })

    // 抜き差し等での構成変化に追従する。
    const unsubscribe = window.danmaku.onDisplaysChanged(setDisplays)
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  if (displays.length <= 1) return null

  const toggle = (id: number) => {
    const next = displays.map((display) =>
      display.id === id ? { ...display, selected: !display.selected } : display,
    )
    setDisplays(next)
    const selectedIds = next.filter((display) => display.selected).map((display) => display.id)
    window.danmaku.setOverlayDisplays(selectedIds)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds))
  }

  return (
    <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
      <legend className="p-0 text-[11px] font-medium text-zinc-400">流す画面（複数選択可）</legend>
      <ul className="m-0 flex flex-wrap gap-1.5 p-0">
        {displays.map((display) => (
          <li key={display.id} className="list-none">
            <button
              type="button"
              aria-pressed={display.selected}
              onClick={() => toggle(display.id)}
              className={clsx(
                'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors',
                display.selected
                  ? 'border-sky-400 bg-sky-500/20 text-zinc-100'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700',
              )}
            >
              <span
                className={clsx(
                  'flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border text-[9px] leading-none',
                  display.selected ? 'border-sky-400 bg-sky-500 text-white' : 'border-zinc-600',
                )}
                aria-hidden="true"
              >
                {display.selected ? '✓' : ''}
              </span>
              <span className="font-medium">{display.label}</span>
              {display.isPrimary && <span className="text-[10px] text-zinc-400">メイン</span>}
              <span className="text-[10px] text-zinc-500">
                {display.width}×{display.height}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </fieldset>
  )
}
