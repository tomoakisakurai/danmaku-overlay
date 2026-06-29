import clsx from 'clsx'

interface AppearanceControlsProps {
  color: string
  isRandomColor: boolean
  durationMs: number
  isRandomSpeed: boolean
  fontSizePx: number
  isRandomSize: boolean
  onColorChange: (color: string) => void
  onRandomColorChange: (isRandomColor: boolean) => void
  onDurationChange: (durationMs: number) => void
  onRandomSpeedChange: (isRandomSpeed: boolean) => void
  onFontSizeChange: (fontSizePx: number) => void
  onRandomSizeChange: (isRandomSize: boolean) => void
}

const RANDOM_SWATCH_GRADIENT = 'linear-gradient(135deg, #FF5C5C, #FFE34D, #7CF08A, #5CC8FF, #FF8AD8)'

const COLOR_OPTIONS = [
  { label: '白', value: '#FFFFFF' },
  { label: '黄', value: '#FFE34D' },
  { label: '赤', value: '#FF5C5C' },
  { label: '青', value: '#5CC8FF' },
  { label: '緑', value: '#7CF08A' },
  { label: '桃', value: '#FF8AD8' },
  { label: '黒', value: '#1A1A1A' },
] as const

const SPEED_OPTIONS = [
  { label: 'ゆっくり', value: 12000 },
  { label: 'ふつう', value: 8000 },
  { label: 'はやい', value: 5000 },
] as const

const SIZE_OPTIONS = [
  { label: '小', value: 24 },
  { label: '中', value: 32 },
  { label: '大', value: 44 },
] as const

interface SegmentedControlProps<T extends number> {
  label: string
  options: ReadonlyArray<{ label: string; value: T }>
  value: T
  isRandom: boolean
  onChange: (value: T) => void
  onRandomChange: (isRandom: boolean) => void
}

/** プリセットから1つ選ぶか「ランダム」を選べるセグメント。ランダム時は送信ごとに値が変わる。 */
function SegmentedControl<T extends number>({
  label,
  options,
  value,
  isRandom,
  onChange,
  onRandomChange,
}: SegmentedControlProps<T>) {
  return (
    <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
      <legend className="p-0 text-[11px] font-medium text-zinc-400">{label}</legend>
      <span className="flex overflow-hidden rounded-md border border-zinc-700">
        {options.map((option) => {
          const selected = !isRandom && value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                onRandomChange(false)
              }}
              className={clsx(
                'flex-1 px-2 py-1 text-xs font-medium transition-colors',
                selected ? 'bg-sky-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700',
              )}
            >
              {option.label}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => onRandomChange(true)}
          className={clsx(
            'flex-1 px-2 py-1 text-xs font-medium transition-colors',
            isRandom ? 'bg-sky-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700',
          )}
        >
          ランダム
        </button>
      </span>
    </fieldset>
  )
}

/** 文字色・速さ・サイズを選ぶ設定群。選んだ値（またはランダム）は送信する各コメントに反映される。 */
export function AppearanceControls({
  color,
  isRandomColor,
  durationMs,
  isRandomSpeed,
  fontSizePx,
  isRandomSize,
  onColorChange,
  onRandomColorChange,
  onDurationChange,
  onRandomSpeedChange,
  onFontSizeChange,
  onRandomSizeChange,
}: AppearanceControlsProps) {
  return (
    <section className="flex flex-col gap-2.5">
      <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
        <legend className="p-0 text-[11px] font-medium text-zinc-400">文字色</legend>
        <span className="flex items-center gap-2">
          {COLOR_OPTIONS.map((option) => {
            const selected = !isRandomColor && color === option.value
            return (
              <button
                key={option.value}
                type="button"
                aria-label={option.label}
                aria-pressed={selected}
                onClick={() => {
                  onColorChange(option.value)
                  onRandomColorChange(false)
                }}
                style={{ backgroundColor: option.value }}
                className={clsx(
                  'h-6 w-6 rounded-full border-2 transition-transform',
                  selected ? 'scale-110 border-sky-400' : 'border-zinc-600 hover:scale-105',
                )}
              />
            )
          })}
          <button
            type="button"
            aria-label="ランダム"
            aria-pressed={isRandomColor}
            title="ランダム（送信ごとに色が変わる）"
            onClick={() => onRandomColorChange(true)}
            style={{ backgroundImage: RANDOM_SWATCH_GRADIENT }}
            className={clsx(
              'h-6 w-6 rounded-full border-2 transition-transform',
              isRandomColor ? 'scale-110 border-sky-400' : 'border-zinc-600 hover:scale-105',
            )}
          />
        </span>
      </fieldset>

      <SegmentedControl
        label="速さ"
        options={SPEED_OPTIONS}
        value={durationMs}
        isRandom={isRandomSpeed}
        onChange={onDurationChange}
        onRandomChange={onRandomSpeedChange}
      />
      <SegmentedControl
        label="サイズ"
        options={SIZE_OPTIONS}
        value={fontSizePx}
        isRandom={isRandomSize}
        onChange={onFontSizeChange}
        onRandomChange={onRandomSizeChange}
      />
    </section>
  )
}
