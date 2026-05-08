// 从 zustand 库导入 create 方法，用于创建状态管理 store
import { create } from 'zustand'
// 导入站点内容配置文件，包含页面上展示的静态文本、链接等信息（请确保此 JSON 文件真实存在，否则构建会失败）
import siteContent from '@/config/site-content.json'
// 导入卡片样式配置文件，用于定义卡片的视觉风格（请确保此 JSON 文件真实存在，否则构建会失败）
import cardStyles from '@/config/card-styles.json'

// 根据导入的 JSON 文件推导出对应的 TypeScript 类型，方便后续使用
export type SiteContent = typeof siteContent
export type CardStyles = typeof cardStyles

// 定义 store 的数据结构和可用操作的类型接口
interface ConfigStore {
	siteContent: SiteContent
	cardStyles: CardStyles
	regenerateKey: number
	configDialogOpen: boolean
	setSiteContent: (content: SiteContent) => void
	setCardStyles: (styles: CardStyles) => void
	resetSiteContent: () => void
	resetCardStyles: () => void
	regenerateBubbles: () => void
	setConfigDialogOpen: (open: boolean) => void
}

// 创建并导出全局配置 store，管理站点内容和卡片样式的状态
export const useConfigStore = create<ConfigStore>((set, get) => ({
	// 初始化 siteContent 为从 JSON 文件导入的副本，避免直接修改原始引用
	siteContent: { ...siteContent },
	// 初始化 cardStyles 为从 JSON 文件导入的副本
	cardStyles: { ...cardStyles },
	// 用于强制重新生成气泡动画的计数器，递增即可触发重新渲染
	regenerateKey: 0,
	// 控制配置对话框的显示与隐藏
	configDialogOpen: false,

	// 更新站点内容，替换为传入的新内容
	setSiteContent: (content: SiteContent) => {
		set({ siteContent: content })
	},
	// 更新卡片样式，传入新的样式对象进行替换
	setCardStyles: (styles: CardStyles) => {
		set({ cardStyles: styles })
	},
	// 重置站点内容为初始 JSON 定义的默认值
	resetSiteContent: () => {
		set({ siteContent: { ...siteContent } })
	},
	// 重置卡片样式为初始默认值
	resetCardStyles: () => {
		set({ cardStyles: { ...cardStyles } })
	},
	// 每次调用会将 regenerateKey 加 1，用于触发界面上依赖该值的组件重绘
	regenerateBubbles: () => {
		set(state => ({ regenerateKey: state.regenerateKey + 1 }))
	},
	// 打开或关闭配置对话框
	setConfigDialogOpen: (open: boolean) => {
		set({ configDialogOpen: open })
	}
}))
