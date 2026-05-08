// 导入 zustand 库的 create 方法，用于创建轻量级状态管理 store
import { create } from 'zustand'

// 定义预览状态 store 的类型
type PreviewStore = {
	// 当前是否为预览模式
	isPreview: boolean
	// 开启预览模式的方法
	openPreview: () => void
	// 关闭预览模式的方法
	closePreview: () => void
	// 切换预览模式状态的方法
	togglePreview: () => void
}

// 创建并导出 usePreviewStore hook，使用 zustand 管理预览模式的状态
export const usePreviewStore = create<PreviewStore>(set => ({
	// 初始状态：预览模式默认为关闭
	isPreview: false,
	// 将 isPreview 设置为 true，进入预览模式
	openPreview: () => set({ isPreview: true }),
	// 将 isPreview 设置为 false，退出预览模式
	closePreview: () => set({ isPreview: false }),
	// 根据当前状态取反，实现预览模式的切换
	togglePreview: () => set(state => ({ isPreview: !state.isPreview }))
}))
