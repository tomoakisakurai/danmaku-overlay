# Slack → 弾幕 中継スクリプト（GAS）

Slack の特定チャンネルへの投稿を、弾幕アプリに流す仕組みです。

```
Slack チャンネル
  ↓ Events API（push）
GAS Web App（slack-relay.gs）
  ↓ Supabase Realtime Broadcast REST API
弾幕アプリ（既存の Supabase 購読でそのまま受信）
```

---

## 1. GAS プロジェクトを作る

1. [script.google.com](https://script.google.com) → **新しいプロジェクト**
2. `コード.gs` の中身を `slack-relay.gs` の内容で **丸ごと置き換え**
3. プロジェクト名を `danmaku-slack-relay` などに変更（任意）

---

## 2. スクリプトプロパティを設定する

[プロジェクトの設定] → [スクリプト プロパティ] に以下を追加：

| プロパティ名 | 値 |
|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co`（弾幕アプリの `.env` と同じ） |
| `SUPABASE_ANON_KEY` | `eyJ...`（弾幕アプリの `.env` と同じ） |
| `SUPABASE_ROOM` | `asoview`（弾幕アプリで接続するルーム名） |
| `SLACK_TOKEN` | 任意の文字列（例: `mysecret123`）なりすまし防止用 |

---

## 3. ウェブアプリとしてデプロイする

1. 右上 [**デプロイ**] → [**新しいデプロイ**]
2. 種類: **ウェブアプリ**
3. 次のユーザーとして実行: **自分**
4. アクセスできるユーザー: **全員**
5. [デプロイ] をクリック → **ウェブアプリの URL** をコピー

> URL 例: `https://script.google.com/macros/s/AAAA.../exec`

---

## 4. Slack アプリを作る

### 4-1. アプリ作成

1. [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. App Name: `弾幕Bot`（任意）、ワークスペースを選択 → **Create App**

### 4-2. スコープを追加

[OAuth & Permissions] → [Scopes] → **Bot Token Scopes** に追加:

- `channels:history` — パブリックチャンネルの投稿を受け取る

### 4-3. Event Subscriptions を有効化

1. [Event Subscriptions] → **Enable Events: ON**
2. **Request URL** に以下を入力して **Verified** になるのを確認：

   ```
   https://script.google.com/macros/s/AAAA.../exec?token=mysecret123
   ```
   
   （GAS の URL + `?token=` + 手順2で設定した `SLACK_TOKEN`）

3. [Subscribe to bot events] → **Add Bot User Event** → `message.channels` を追加
4. [Save Changes]

### 4-4. アプリをインストール

[OAuth & Permissions] → **Install to Workspace** → **許可する**

### 4-5. Bot をチャンネルに招待

対象チャンネルで:
```
/invite @弾幕Bot
```

---

## 5. 動作確認

1. 弾幕アプリを起動し、`asoview` ルームに接続
2. Slack チャンネルに投稿
3. 水色のコメントが画面に流れれば成功 🎉

---

## カスタマイズ

`slack-relay.gs` 冒頭の定数で外観を変えられます：

```js
var SLACK_COLOR = '#9EE7FF'  // 水色（CSS カラー）
var SLACK_FONT_SIZE = 32     // px
var SLACK_DURATION_MS = 8000 // 流れる速さ（ms）
```

---

## トラブルシューティング

| 症状 | 確認ポイント |
|---|---|
| Request URL が Verified にならない | GAS が「全員」アクセスでデプロイされているか確認。`?token=` を付けているか確認 |
| コメントが流れない | スクリプトプロパティの `SUPABASE_ROOM` が弾幕アプリのルーム名と一致しているか |
| 弾幕アプリ自身のコメントも水色になる | ならない（GAS 経由は別ソースなので `self:false` の影響を受けない） |
| ユーザー名を表示したい | `slack-relay.gs` の `resolveUsername` のコメントアウトを外し、`SLACK_BOT_TOKEN` プロパティを追加 |
