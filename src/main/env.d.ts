// electron-vite が main プロセスへ公開する環境変数（MAIN_VITE_ プレフィックス）の型。
// electron-vite/node の ImportMetaEnv にインターフェースマージで追記する。

interface ImportMetaEnv {
  readonly MAIN_VITE_SUPABASE_URL?: string
  readonly MAIN_VITE_SUPABASE_ANON_KEY?: string
}
