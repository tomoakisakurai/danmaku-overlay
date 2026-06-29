// assets/stickers/ に置いた画像を同梱スタンプとして読み込む。
// ファイル名（拡張子なし）が「キー」になり、コメントはこのキーを持って配信される。
// 各クライアントが自分の同梱画像を解決するので、リアルタイム共有でも全員に表示される。

const stickerModules = import.meta.glob('./assets/stickers/*.{png,gif,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

export interface Sticker {
  /** ファイル名（拡張子なし）。コメントの imageKey に対応。 */
  key: string
  name: string
  /** このクライアントでの画像URL。 */
  url: string
}

export const STICKERS: Sticker[] = Object.entries(stickerModules)
  .map(([path, url]) => {
    const fileName = path.split('/').pop() ?? path
    const name = fileName.replace(/\.[^.]+$/, '')
    return { key: name, name, url }
  })
  .sort((first, second) => first.name.localeCompare(second.name))

/** キー → 画像URL の対応表。受信側で imageKey から画像を解決するのに使う。 */
export const STICKER_URL_BY_KEY: Record<string, string> = Object.fromEntries(
  STICKERS.map((sticker) => [sticker.key, sticker.url]),
)
