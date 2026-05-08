// 导入 zustand 的 create 函数
import { create } from 'zustand'

// 定义预览状态存储的类型
type PreviewStore = {
  isPreview: boolean // 是否处于预览模式
  openPreview: () => void // 进入预览模式
  closePreview: () => void // 退出预览模式
  togglePreview: () => void // 切换预览模式
}

// 创建并导出预览状态存储 hook
export const usePreviewStore = create<PreviewStore>((set) => ({
  isPreview: false, // 初始状态：非预览模式
  openPreview: () => set({ isPreview: true }), // 将 isPreview 设置为 true
  closePreview: () => set({ isPreview: false }), // 将 isPreview 设置为 false
  togglePreview: () => set((state) => ({ isPreview: !state.isPreview })), // 基于当前状态切换
}))