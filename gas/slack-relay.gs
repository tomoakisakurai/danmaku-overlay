/**
 * Slack → Supabase Realtime 中継スクリプト
 *
 * Slack Events API（message.channels）のペイロードを受け取り、
 * Supabase Realtime Broadcast へそのまま転送する。
 * 弾幕アプリはすでに Supabase を購読しているので、追加実装不要。
 *
 * 【スクリプトプロパティに設定する値】
 *   SUPABASE_URL      : https://xxxx.supabase.co
 *   SUPABASE_ANON_KEY : eyJ...（anon キー）
 *   SUPABASE_ROOM     : asoview（弾幕アプリと同じルーム名）
 *   SLACK_TOKEN       : 任意の共有トークン（?token= で照合。Slack 署名検証の代替）
 */

var PROP_SUPABASE_URL = 'SUPABASE_URL'
var PROP_SUPABASE_ANON_KEY = 'SUPABASE_ANON_KEY'
var PROP_SUPABASE_ROOM = 'SUPABASE_ROOM'
var PROP_SLACK_TOKEN = 'SLACK_TOKEN'

// Slack 由来コメントの見た目（任意で変更可）
var SLACK_COLOR = '#FFFFFF' // 白
var SLACK_FONT_SIZE = 32 // px
var SLACK_DURATION_MS = 8000

function doPost(e) {
  var props = PropertiesService.getScriptProperties()

  // 簡易認証（共有トークン照合）
  var expectedToken = props.getProperty(PROP_SLACK_TOKEN)
  if (expectedToken) {
    var receivedToken = (e.parameter && e.parameter.token) || ''
    if (receivedToken !== expectedToken) {
      return jsonResponse({ error: 'unauthorized' })
    }
  }

  var payload
  try {
    payload = JSON.parse(e.postData.contents)
  } catch (_) {
    return jsonResponse({ error: 'invalid json' })
  }

  // URL 検証チャレンジに応答（初回の Request URL 登録時のみ）
  if (payload.type === 'url_verification') {
    return jsonResponse({ challenge: payload.challenge })
  }

  // 重複イベントをスキップ（Slack のリトライ対策）
  var eventId = payload.event_id
  if (eventId) {
    var cache = CacheService.getScriptCache()
    if (cache.get(eventId)) {
      return jsonResponse({ ok: true })
    }
    cache.put(eventId, '1', 60)
  }

  var event = payload.event
  if (!event || event.type !== 'message') {
    return jsonResponse({ ok: true })
  }

  // bot 投稿・編集・削除・スレッド通知はスキップ
  if (event.bot_id || event.subtype) {
    return jsonResponse({ ok: true })
  }

  var rawText = event.text || ''
  if (!rawText.trim()) {
    return jsonResponse({ ok: true })
  }

  var text = formatSlackText(rawText)

  var comment = {
    id: Utilities.getUuid(),
    text: text,
    color: SLACK_COLOR,
    fontSizePx: SLACK_FONT_SIZE,
    durationMs: SLACK_DURATION_MS
  }

  var supabaseUrl = props.getProperty(PROP_SUPABASE_URL)
  var supabaseKey = props.getProperty(PROP_SUPABASE_ANON_KEY)
  var room = props.getProperty(PROP_SUPABASE_ROOM) || 'asoview'

  broadcastToSupabase(supabaseUrl, supabaseKey, room, comment)

  return jsonResponse({ ok: true })
}

function broadcastToSupabase(supabaseUrl, supabaseKey, room, comment) {
  var url = supabaseUrl + '/realtime/v1/api/broadcast'
  var body = JSON.stringify({
    messages: [
      {
        topic: 'danmaku:' + room,
        event: 'comment',
        payload: comment
      }
    ]
  })

  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      apikey: supabaseKey,
      Authorization: 'Bearer ' + supabaseKey
    },
    payload: body,
    muteHttpExceptions: true
  })
}

function formatSlackText(text) {
  // <@U...> メンション → 除去
  text = text.replace(/<@[A-Z0-9]+>/g, '')
  // <!channel> / <!here> 等の特殊メンション → 除去
  text = text.replace(/<![\w|]+>/g, '')
  // <#C...|name> チャンネルリンク → #name
  text = text.replace(/<#[A-Z0-9]+\|([^>]+)>/g, '#$1')
  // <URL|text> リンク → テキスト部だけ残す
  text = text.replace(/<https?:\/\/[^|>]*\|([^>]+)>/g, '$1')
  // <URL> リンク（テキストなし）→ URL ごと除去
  text = text.replace(/<https?:\/\/[^>]*>/g, '')
  // Slack 独自 HTML エンティティを復元
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  // 連続スペース・改行を整理
  text = text.replace(/\s+/g, ' ').trim()
  return text
}

function jsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data))
  output.setMimeType(ContentService.MimeType.JSON)
  return output
}

function testBroadcast() {
  var props = PropertiesService.getScriptProperties()
  var supabaseUrl = props.getProperty(PROP_SUPABASE_URL)
  var supabaseKey = props.getProperty(PROP_SUPABASE_ANON_KEY)
  var room = props.getProperty(PROP_SUPABASE_ROOM) || 'asoview'

  var comment = {
    id: Utilities.getUuid(),
    text: 'GASからのテスト投稿 🎉',
    color: SLACK_COLOR,
    fontSizePx: SLACK_FONT_SIZE,
    durationMs: SLACK_DURATION_MS
  }

  broadcastToSupabase(supabaseUrl, supabaseKey, room, comment)
  Logger.log('送信完了')
}
