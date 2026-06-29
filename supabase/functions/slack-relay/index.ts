import emojiData from 'https://esm.sh/@emoji-mart/data@1'

// :name: → Unicode のマップを emoji-mart のデータから構築する
const emojiMap: Record<string, string> = {}
const data = emojiData as { emojis: Record<string, { skins: { native: string }[] }> }
for (const [id, emoji] of Object.entries(data.emojis)) {
  const native = emoji.skins?.[0]?.native
  if (native) emojiMap[id] = native
}

// 弾幕アプリの同梱スタンプキー（ファイル名から拡張子を除いたもの）。
// アプリに stickers/ 以下に画像を追加したらここにも追記する。
const STICKER_KEYS = new Set(['yo', 'yo2'])

const SLACK_COLOR = '#FFFFFF'
const SLACK_FONT_SIZE = 32
const SLACK_DURATION_MS = 8000

Deno.serve(async (req) => {
  // SLACK_TOKEN による簡易認証
  const url = new URL(req.url)
  const expectedToken = Deno.env.get('SLACK_TOKEN')
  if (expectedToken && url.searchParams.get('token') !== expectedToken) {
    return json({ error: 'unauthorized' })
  }

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'invalid json' })
  }

  // URL 検証チャレンジ
  if (payload.type === 'url_verification') {
    return json({ challenge: payload.challenge })
  }

  const event = payload.event as Record<string, unknown> | undefined
  if (!event || event.type !== 'message') return json({ ok: true })

  // bot 投稿・編集・削除・スレッド通知はスキップ
  if (event.bot_id || event.subtype) return json({ ok: true })

  const rawText = (event.text as string) || ''
  if (!rawText.trim()) return json({ ok: true })

  // チャンネル ID → ルーム名のマッピング（環境変数 CHANNEL_ROOM_MAP で設定）
  const channelId = (event.channel as string) || ''
  const room = resolveRoom(channelId, url)

  // メッセージ全体が単一のスタンプ絵文字なら imageKey コメントとして送る
  const stickerMatch = rawText.trim().match(/^:([a-z0-9_+-]+):$/)
  if (stickerMatch && STICKER_KEYS.has(stickerMatch[1])) {
    await broadcastComment({ imageKey: stickerMatch[1], text: stickerMatch[1] }, room)
    return json({ ok: true })
  }

  const text = formatSlackText(rawText)
  if (!text) return json({ ok: true })

  await broadcastComment({ text }, room)

  return json({ ok: true })
})

// チャンネル ID → ルーム名を解決する。
// 優先順位: CHANNEL_ROOM_MAP → URL パラメータ → SUPABASE_ROOM 環境変数 → 'general'
function resolveRoom(channelId: string, url: URL): string {
  const mapRaw = Deno.env.get('CHANNEL_ROOM_MAP') || ''
  if (channelId && mapRaw) {
    for (const entry of mapRaw.split(',')) {
      const [id, room] = entry.trim().split(':')
      if (id === channelId && room) return room
    }
  }
  return url.searchParams.get('room') || Deno.env.get('SUPABASE_ROOM') || 'general'
}

type CommentPayload = { text: string; imageKey?: string }

async function broadcastComment(comment: CommentPayload, room: string): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      messages: [
        {
          topic: `danmaku:${room}`,
          event: 'comment',
          payload: {
            id: crypto.randomUUID(),
            color: SLACK_COLOR,
            fontSizePx: SLACK_FONT_SIZE,
            durationMs: SLACK_DURATION_MS,
            ...comment,
          },
        },
      ],
    }),
  })
}

function formatSlackText(text: string): string {
  // :emoji_name: → Unicode（スタンプキーは除外済みなのでここでは標準絵文字のみ変換される）
  text = text.replace(/:([a-z0-9_+-]+):/g, (match, name: string) => emojiMap[name] ?? match)
  // <@U...> メンション → 除去
  text = text.replace(/<@[A-Z0-9]+>/g, '')
  // <!channel> / <!here> 等 → 除去
  text = text.replace(/<![\w|]+>/g, '')
  // <#C...|name> → #name
  text = text.replace(/<#[A-Z0-9]+\|([^>]+)>/g, '#$1')
  // <URL|text> → テキスト
  text = text.replace(/<https?:\/\/[^|>]*\|([^>]+)>/g, '$1')
  // <URL> → 除去
  text = text.replace(/<https?:\/\/[^>]*>/g, '')
  // HTML エンティティ復元
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  return text.replace(/\s+/g, ' ').trim()
}

function json(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  })
}
