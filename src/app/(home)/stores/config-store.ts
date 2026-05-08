// 从 zustand 库中导入 create 函数，用于创建状态管理 store
import { create } from 'zustand'
// 导入网站内容配置 JSON 文件（默认会被 TS 推断为普通对象）
import siteContent from '@/config/site-content.json'
// 导入卡片样式配置 JSON 文件
import cardStyles from '@/config/card-styles.json'

// 定义 SiteContent 类型，其类型与 siteContent JSON 文件的结构完全一致
export type SiteContent = typeof siteContent
// 定义 CardStyles 类型，其类型与 cardStyles JSON 文件的结构完全一致
export type CardStyles = typeof cardStyles

// 定义 ConfigStore 接口，描述 store 的完整结构（状态 + 方法）
interface ConfigStore {
	// 状态：网站内容数据，类型为 SiteContent
	siteContent: SiteContent
	// 状态：卡片样式数据，类型为 CardStyles
	cardStyles: CardStyles
	// 状态：用于强制触发组件重新渲染的“再生键”（数值变化时会触发依赖它的组件更新）
	regenerateKey: number
	// 状态：控制配置对话框的显示/隐藏
	configDialogOpen: boolean
	// 方法：设置网站内容，接收新的 SiteContent 类型数据作为参数
	setSiteContent: (content: SiteContent) => void
	// 方法：设置卡片样式，接收新的 CardStyles 类型数据作为参数
	setCardStyles: (styles: CardStyles) => void
	// 方法：重置网站内容为初始值（从 JSON 文件重新加载）
	resetSiteContent: () => void
	// 方法：重置卡片样式为初始值（从 JSON 文件重新加载）
	resetCardStyles: () => void
	// 方法：触发“气泡”组件的重新生成（通过递增 regenerateKey 实现）
	regenerateBubbles: () => void
	// 方法：设置配置对话框的显示/隐藏状态
	setConfigDialogOpen: (open: boolean) => void
}

// 创建并导出名为 useConfigStore 的 Zustand store
// create 函数接收一个回调，回调参数 set（用于更新状态）和 get（用于获取当前状态）
export const useConfigStore = create<ConfigStore>((set, get) => ({
	// 初始状态：网站内容（使用展开运算符复制 JSON 对象，避免直接修改原 JSON）
	siteContent: { ...siteContent },
	// 初始状态：卡片样式（同样复制 JSON 对象）
	cardStyles: { ...cardStyles },
	// 初始状态：再生键初始化为 0
	regenerateKey: 0,
	// 初始状态：配置对话框默认关闭
	configDialogOpen: false,

	// 方法实现：设置网站内容
	setSiteContent: (content: SiteContent) => {
		// 调用 set 函数更新状态，将 siteContent 设为传入的新内容
		set({ siteContent: content })
	},

	// 方法实现：设置卡片样式
	setCardStyles: (styles: CardStyles) => {
		// 调用 set 函数更新状态，将 cardStyles 设为传入的新样式
		set({ cardStyles: styles })
	},

	// 方法实现：重置网站内容
	resetSiteContent: () => {
		// 调用 set 函数，将 siteContent 重置为初始 JSON 的副本
		set({ siteContent: { ...siteContent } })
	},

	// 方法实现：重置卡片样式
	resetCardStyles: () => {
		// 调用 set 函数，将 cardStyles 重置为初始 JSON 的副本
		set({ cardStyles: { ...cardStyles } })
	},

	// 方法实现：重新生成气泡
	regenerateBubbles: () => {
		// 函数式更新：获取当前 state，将 regenerateKey 加 1（强制触发组件重渲染）
		set(state => ({ regenerateKey: state.regenerateKey + 1 }))
	},

	// 方法实现：设置配置对话框状态
	setConfigDialogOpen: (open: boolean) => {
		// 调用 set 函数，更新 configDialogOpen 的值
		set({ configDialogOpen: open })
	}
}))