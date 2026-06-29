# コメント弾幕オーバーレイ (danmaku-overlay)

ニコニコ動画風に、**画面全体の上をコメントが右から左へ流れる**透明オーバーレイのデスクトップアプリ。
Google Meet・Zoom・YouTube など、下に何が映っていてもその上にコメントを重ねられる「コメントスクリーン」型のツール。

## 仕組み

2 つのウィンドウで動く（Electron）。

- **オーバーレイウィンドウ** … 画面全体を覆う。透明・最前面・**クリック貫通**なので、コメントは見えるがクリックは下の Meet 等にそのまま通る。表示専用。
- **コントロールウィンドウ** … 小さな操作パネル。ルーム接続、コメント入力、文字色・速さ・サイズの選択、表示/非表示・クリアを行う。

送信したコメントは「自分のオーバーレイに即表示」しつつ、「同じルームの全員にも配信」される。

## リアルタイム共有（ルーム）

**Supabase Realtime（Broadcast）** で、同じ**ルーム**に接続している全員の画面にコメントが流れる。コメントは DB に保存せず、流れて消える（ニコニコ同様）。

- コントロール上部の「ルーム」に名前（例: 会議名）を入れて **接続**。同じルーム名の人どうしで共有される。会議が複数同時でも、ルームが違えば混ざらない。
- ルーム名は次回起動時に復元される（`localStorage`）。
- 横のドットが接続状態（灰=未接続 / 黄=接続中 / 緑=接続済み / 赤=エラー）。
- 自分のコメントはローカルで即表示、他人のコメントは Broadcast 経由で届く（`self:false`）。

### セットアップ（認証情報）

`.env`（`.env.example` 参照）に Supabase の URL と anon キーを設定する。sake-mania と同じプロジェクトの値で OK（テーブルには触れない）。

```
MAIN_VITE_SUPABASE_URL=https://<ref>.supabase.co
MAIN_VITE_SUPABASE_ANON_KEY=<anon public key>
```

未設定でもローカル表示は動くが、共有はされない（接続状態が「エラー」になる）。
※ 接続できない場合は Supabase の Realtime が有効か確認する（公開チャンネルの Broadcast を anon キーで使用）。

## 開発

パッケージマネージャは **Yarn 4 + node-modules リンカ**（sake-mania と同じ）。
`.yarnrc.yml` で `nodeLinker: node-modules` を指定している。**Yarn のデフォルト PnP は Electron が解決できず起動に失敗するため、必須**。

```bash
yarn install
yarn dev           # 2 ウィンドウが起動する
```

`yarn dev` を実行すると、画面右下にコントロールパネルが出る。コメントを入力して Enter すると、画面全体を横切ってコメントが流れる。

### macOS の権限について

オーバーレイは「描画して最前面に出す」だけなので、画面収録やアクセシビリティの権限は不要。
他アプリ（Meet など）の上に正しく重なるよう、`screen-saver` レベルの最前面 + 全 Space 表示を設定している。

## その他のコマンド

```bash
yarn build      # 本番ビルド（out/ に出力。ウィンドウは起動しない）
yarn start      # ビルド成果物をプレビュー起動
yarn typecheck  # 型チェック（main / preload / renderer）
```

## 配布（パッケージ化）

非エンジニアにもそのまま渡せる `.app` を作る。macOS（Apple Silicon / arm64）向け。

```bash
yarn build:mac     # out/ をビルド → release/ に配布用 zip を生成
```

→ `release/danmaku-overlay-<version>-arm64.zip` ができる。これを Slack などで配る。

- 認証情報（Supabase URL / anon キー）は **ビルド時にアプリへ焼き込まれる**ので、受け取った人は `.env` 不要。そのまま起動できる。
- **未署名アプリ**（Apple Developer 証明書なし＝社内配布前提）。受け取った人は初回だけ Gatekeeper の解除が必要（下記）。ad-hoc 署名済みなので、解除後は普通に起動する。
- Apple Silicon (arm64) 向け。Intel Mac にも配るなら `yarn build:mac --x64`、両対応なら `yarn build:mac --universal`。
- DMG が欲しい場合は `electron-builder.yml` の `mac.target` に `- dmg` を足す（実機ターミナルで生成可能。サンドボックス等だと `/Volumes` 書き込み制限で失敗することがある）。
- アイコンは未設定（Electron 既定）。変えるなら `build/icon.png`（1024×1024）を置く。

### 受け取った人の開き方（初回のみ）

1. zip を解凍し、`コメント弾幕.app` を「アプリケーション」へドラッグ。
2. ダブルクリックすると「開発元を確認できないため開けません」と出る → どちらかで解除：
   - **Finder で右クリック → 開く → 開く**、または システム設定 →「プライバシーとセキュリティ」→「このまま開く」。
   - もしくはターミナルで隔離属性を外す：
     ```bash
     xattr -dr com.apple.quarantine "/Applications/コメント弾幕.app"
     ```

## ディレクトリ

```
src/
  main/index.ts           メインプロセス（2 ウィンドウ生成・IPC 中継・クリック貫通設定）
  main/realtime.ts        Supabase Realtime（ルーム接続・Broadcast 送受信）
  preload/index.ts        window.danmaku の安全な公開（contextBridge）
  shared/types.ts         3 プロセス共有の型・IPC チャンネル定数
  renderer/
    overlay.html          オーバーレイのエントリ
    control.html          コントロールのエントリ
    src/
      styles.css          Tailwind 読み込み + 弾幕アニメーション
      overlay/            流れるコメントの表示（レーン割り当て・CSS アニメ）
      control/            ルーム接続・入力フォーム・見た目設定
```

## 今後の拡張アイデア

- 上固定・下固定コメント（ニコニコの `ue` / `shita`）
- NG ワード・流量制限
- グローバルホットキーで入力欄を即フォーカス
- コードサイン + 公証（Apple Developer 登録すれば Gatekeeper 解除不要に）
