import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import {
  DANMAKU_CHANNELS,
  type ConnectionState,
  type DanmakuApi,
  type DanmakuComment,
  type DisplayInfo,
} from '../shared/types'

const api: DanmakuApi = {
  sendComment(comment: DanmakuComment) {
    ipcRenderer.send(DANMAKU_CHANNELS.comment, comment)
  },
  clearComments() {
    ipcRenderer.send(DANMAKU_CHANNELS.clear)
  },
  setOverlayVisible(visible: boolean) {
    ipcRenderer.send(DANMAKU_CHANNELS.setOverlayVisible, visible)
  },
  setControlSize(size: { width?: number; height: number }) {
    ipcRenderer.send(DANMAKU_CHANNELS.setControlSize, size)
  },
  getDisplays() {
    return ipcRenderer.invoke(DANMAKU_CHANNELS.getDisplays) as Promise<DisplayInfo[]>
  },
  setOverlayDisplays(displayIds: number[]) {
    ipcRenderer.send(DANMAKU_CHANNELS.setOverlayDisplays, displayIds)
  },
  onDisplaysChanged(callback) {
    const handler = (_event: IpcRendererEvent, displays: DisplayInfo[]) => callback(displays)
    ipcRenderer.on(DANMAKU_CHANNELS.displaysChanged, handler)
    return () => {
      ipcRenderer.removeListener(DANMAKU_CHANNELS.displaysChanged, handler)
    }
  },
  joinRoom(room: string) {
    ipcRenderer.send(DANMAKU_CHANNELS.joinRoom, room)
  },
  onComment(callback) {
    const handler = (_event: IpcRendererEvent, comment: DanmakuComment) => callback(comment)
    ipcRenderer.on(DANMAKU_CHANNELS.comment, handler)
    return () => {
      ipcRenderer.removeListener(DANMAKU_CHANNELS.comment, handler)
    }
  },
  onClear(callback) {
    const handler = () => callback()
    ipcRenderer.on(DANMAKU_CHANNELS.clear, handler)
    return () => {
      ipcRenderer.removeListener(DANMAKU_CHANNELS.clear, handler)
    }
  },
  onConnectionStatus(callback) {
    const handler = (_event: IpcRendererEvent, state: ConnectionState) => callback(state)
    ipcRenderer.on(DANMAKU_CHANNELS.connectionStatus, handler)
    return () => {
      ipcRenderer.removeListener(DANMAKU_CHANNELS.connectionStatus, handler)
    }
  },
}

contextBridge.exposeInMainWorld('danmaku', api)
