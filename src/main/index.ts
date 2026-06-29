import { join } from 'path'
import { app, BrowserWindow, ipcMain, screen, type Display } from 'electron'
import { DANMAKU_CHANNELS, type DanmakuComment, type DisplayInfo } from '../shared/types'
import { broadcastComment, initRealtime, joinRoom } from './realtime'

/** dev ビルドかどうか。electron-vite が dev のときだけこの環境変数をセットする。 */
const isDev = Boolean(process.env['ELECTRON_RENDERER_URL'])

/** ディスプレイ id → そのディスプレイを覆うオーバーレイウィンドウ。各画面に1枚ずつ持つ。 */
const overlayWindows = new Map<number, BrowserWindow>()
/** コメント入力や設定を行う、通常の操作ウィンドウ。 */
let controlWindow: BrowserWindow | null = null

/** コメントを流す対象に選ばれたディスプレイ id。 */
let selectedDisplayIds = new Set<number>()
/** 全体の表示/非表示トグル（「表示中」ボタン）。 */
let isOverlayVisible = true

// コントロールウィンドウのサイズ。
const CONTROL_WIDTH = 440
// 起動時の初期高さ兼、リサイズ時の下限（実高さはレンダラが中身に合わせて指定する）。
const CONTROL_COLLAPSED_HEIGHT = 180

function loadRenderer(window: BrowserWindow, page: 'overlay' | 'control'): void {
  if (isDev) {
    void window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/${page}.html`)
  } else {
    void window.loadFile(join(__dirname, `../renderer/${page}.html`))
  }
}

/** 1 つのディスプレイを覆う、透明・最前面・クリック貫通の表示専用ウィンドウを作る。 */
function createOverlayWindowForDisplay(display: Display): BrowserWindow {
  const { bounds } = display

  const overlay = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transparent: true,
    frame: false,
    // macOS の NSPanel として作ると、他アプリの全画面（ブラウザのプレゼン等）の上にも浮きやすい。
    type: 'panel',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    // フォーカスを奪わないことで、下の Google Meet などの操作を妨げない。
    focusable: false,
    hasShadow: false,
    skipTaskbar: true,
    fullscreenable: false,
    enableLargerThanScreen: true,
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  // クリックを下のアプリへ貫通させる（forward: true でホバー等のイベントは受け取る）。
  overlay.setIgnoreMouseEvents(true, { forward: true })
  // フルスクリーン動画や他アプリより前面に出す。
  overlay.setAlwaysOnTop(true, 'screen-saver')
  // すべての Space / フルスクリーンアプリ上でも表示する（macOS）。
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  loadRenderer(overlay, 'overlay')
  return overlay
}

/** 現在のディスプレイ構成に合わせて、オーバーレイの作成・破棄・配置・表示状態を揃える。 */
function syncOverlayWindows(): void {
  const displays = screen.getAllDisplays()
  const currentIds = new Set(displays.map((display) => display.id))

  // 取り外されたディスプレイのオーバーレイを破棄する。
  for (const [id, overlay] of overlayWindows) {
    if (!currentIds.has(id)) {
      overlay.destroy()
      overlayWindows.delete(id)
    }
  }

  for (const display of displays) {
    let overlay = overlayWindows.get(display.id)
    if (!overlay) {
      overlay = createOverlayWindowForDisplay(display)
      overlayWindows.set(display.id, overlay)
    } else {
      // 解像度変更や配置変更に追従する。
      overlay.setBounds(display.bounds)
    }

    const shouldShow = isOverlayVisible && selectedDisplayIds.has(display.id)
    if (shouldShow) overlay.showInactive()
    else overlay.hide()
  }
}

/** 現在コメントを流すべき（選択中かつ全体表示ON）オーバーレイに対して処理する。 */
function eachActiveOverlay(callback: (overlay: BrowserWindow) => void): void {
  if (!isOverlayVisible) return
  for (const [id, overlay] of overlayWindows) {
    if (selectedDisplayIds.has(id)) callback(overlay)
  }
}

/** レンダラに渡すディスプレイ一覧（選択状態つき）を組み立てる。 */
function getDisplayInfos(): DisplayInfo[] {
  const primaryId = screen.getPrimaryDisplay().id
  return screen.getAllDisplays().map((display, index) => ({
    id: display.id,
    label: display.label?.trim() ? display.label : `画面${index + 1}`,
    width: display.size.width,
    height: display.size.height,
    isPrimary: display.id === primaryId,
    selected: selectedDisplayIds.has(display.id),
  }))
}

function notifyDisplaysChanged(): void {
  controlWindow?.webContents.send(DANMAKU_CHANNELS.displaysChanged, getDisplayInfos())
}

function createControlWindow(): void {
  const { workArea } = screen.getPrimaryDisplay()
  const width = CONTROL_WIDTH
  const height = CONTROL_COLLAPSED_HEIGHT

  controlWindow = new BrowserWindow({
    width,
    height,
    x: workArea.x + workArea.width - width - 24,
    y: workArea.y + workArea.height - height - 24,
    title: 'コメント弾幕コントロール',
    resizable: true,
    minWidth: 360,
    minHeight: 140,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    backgroundColor: '#18181b',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  loadRenderer(controlWindow, 'control')

  // コントロールを閉じたらアプリ全体を終了する。
  controlWindow.on('closed', () => {
    controlWindow = null
    app.quit()
  })
}

function registerIpcHandlers(): void {
  ipcMain.on(DANMAKU_CHANNELS.comment, (_event, comment: DanmakuComment) => {
    // 選択中の画面に即表示し、同じルームの全員にも配信する。
    eachActiveOverlay((overlay) => overlay.webContents.send(DANMAKU_CHANNELS.comment, comment))
    broadcastComment(comment)
  })

  ipcMain.on(DANMAKU_CHANNELS.clear, () => {
    // クリアは全画面（非表示分も含む）に送って取りこぼしを防ぐ。
    for (const overlay of overlayWindows.values()) {
      overlay.webContents.send(DANMAKU_CHANNELS.clear)
    }
  })

  ipcMain.on(DANMAKU_CHANNELS.setOverlayVisible, (_event, visible: boolean) => {
    isOverlayVisible = visible
    syncOverlayWindows()
  })

  ipcMain.handle(DANMAKU_CHANNELS.getDisplays, () => getDisplayInfos())

  ipcMain.on(DANMAKU_CHANNELS.setOverlayDisplays, (_event, displayIds: number[]) => {
    const currentIds = new Set(screen.getAllDisplays().map((display) => display.id))
    selectedDisplayIds = new Set(displayIds.filter((id) => currentIds.has(id)))
    syncOverlayWindows()
    // 選択の変化を他のコンポーネント（裏方モードの注記など）にも知らせる。
    notifyDisplaysChanged()
  })

  ipcMain.on(DANMAKU_CHANNELS.joinRoom, (_event, room: string) => {
    joinRoom(room)
  })

  ipcMain.on(DANMAKU_CHANNELS.setControlSize, (_event, size: { width?: number; height: number }) => {
    if (!controlWindow) return
    const { workArea } = screen.getPrimaryDisplay()
    const bounds = controlWindow.getBounds()
    // width 省略時は現在の幅を維持（ユーザーの手動リサイズを尊重）。
    const targetWidth = size.width != null ? Math.min(size.width, workArea.width - 16) : bounds.width
    const targetHeight = Math.min(Math.max(size.height, CONTROL_COLLAPSED_HEIGHT), workArea.height - 16)
    // 右下を固定したまま伸縮させる（画面外にはみ出さない）。
    const x = Math.max(workArea.x + 8, bounds.x + bounds.width - targetWidth)
    const y = Math.max(workArea.y + 8, bounds.y + bounds.height - targetHeight)
    // アニメーションは無効（自動フィットの ResizeObserver と干渉して膨らむのを防ぐ）。
    controlWindow.setBounds({ x, y, width: targetWidth, height: targetHeight })
  })
}

function setupRealtime(): void {
  initRealtime({
    // 他の人のコメントは選択中の自分のオーバーレイに流す。
    onRemoteComment: (comment) => {
      eachActiveOverlay((overlay) => overlay.webContents.send(DANMAKU_CHANNELS.comment, comment))
    },
    // 接続状態はコントロールウィンドウへ通知して表示する。
    onStateChange: (state) => {
      controlWindow?.webContents.send(DANMAKU_CHANNELS.connectionStatus, state)
    },
  })
}

/** ディスプレイの抜き差し・解像度変更に追従する。 */
function watchDisplays(): void {
  const handleChange = () => {
    syncOverlayWindows()
    notifyDisplaysChanged()
  }
  screen.on('display-added', handleChange)
  screen.on('display-removed', handleChange)
  screen.on('display-metrics-changed', handleChange)
}

void app.whenReady().then(() => {
  // 既定では主ディスプレイにだけ流す（従来挙動）。
  selectedDisplayIds = new Set([screen.getPrimaryDisplay().id])

  registerIpcHandlers()
  setupRealtime()
  createControlWindow()
  syncOverlayWindows()
  watchDisplays()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createControlWindow()
      syncOverlayWindows()
    }
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
