// 声明本文件为客户端组件，因为 Zustand store 需要在浏览器环境中运行
'use client'

// 从 zustand 中导入 create 方法，用于创建状态管理 store
import { create } from 'zustand'
// 从本地的 config-store 中导入配置 store 以及卡片样式类型
// 注意：请确保 './config-store' 文件存在且正确导出了 useConfigStore 与 CardStyles，否则部署时会编译失败
import { useConfigStore, type CardStyles } from './config-store'

// 定义 CardKey 类型，它是 CardStyles 对象的所有键名的联合类型
// 用于限制偏移量和尺寸设置只能作用于合法的卡片样式字段
type CardKey = keyof CardStyles

// 布局编辑状态的接口定义
interface LayoutEditState {
	// 是否正在编辑布局
	editing: boolean
	// 用于保存编辑前卡片样式的快照，方便取消时恢复
	snapshot: CardStyles | null
	// 开始编辑：保存当前卡片样式快照，并进入编辑模式
	startEditing: () => void
	// 取消编辑：从快照恢复样式，并退出编辑模式
	cancelEditing: () => void
	// 保存编辑：直接退出编辑模式（修改已在实时更新到 config store）
	saveEditing: () => void
	// 设置指定卡片样式的偏移量，x 和 y 可为 null 表示未设置
	setOffset: (key: CardKey, offsetX: number | null, offsetY: number | null) => void
	// 设置指定卡片样式的尺寸，宽高可为 undefined 表示不修改
	setSize: (key: CardKey, width: number | undefined, height: number | undefined) => void
}

// 创建并导出布局编辑 store
export const useLayoutEditStore = create<LayoutEditState>((set, get) => ({
	// 初始状态：非编辑模式，快照为空
	editing: false,
	snapshot: null,

	// 开始编辑方法
	startEditing: () => {
		// 从 config store 中获取当前的卡片样式
		const { cardStyles } = useConfigStore.getState()
		// 设置 editing 为 true，并把当前样式深拷贝一份作为快照
		set({
			editing: true,
			snapshot: { ...cardStyles }
		})
	},

	// 取消编辑方法
	cancelEditing: () => {
		// 获取当前 store 中的快照
		const { snapshot } = get()
		// 如果没有快照，直接重置编辑状态并返回（防御性处理）
		if (!snapshot) {
			set({ editing: false, snapshot: null })
			return
		}

		// 从 config store 中获取 setCardStyles 方法，用于恢复样式
		const { setCardStyles } = useConfigStore.getState()
		// 将快照数据设置回 config store，实现撤销
		setCardStyles(snapshot)

		// 重置本 store 的状态，退出编辑模式
		set({
			editing: false,
			snapshot: null
		})
	},

	// 保存编辑方法
	saveEditing: () => {
		// 由于偏移量和尺寸的修改已经实时通过 setCardStyles 更新到 config store，
		// 这里只需要清除编辑状态和快照即可
		set({
			editing: false,
			snapshot: null
		})
	},

	// 设置卡片偏移量的方法
	setOffset: (key, offsetX, offsetY) => {
		// 从 config store 获取当前完整样式和更新样式的方法
		const { cardStyles, setCardStyles } = useConfigStore.getState()

		// 构造更新后的样式对象：保留其他字段不变，仅修改目标 key 的 offsetX 和 offsetY
		const next: CardStyles = {
			...cardStyles,
			[key]: {
				...cardStyles[key],
				offsetX,
				offsetY
			}
		}

		// 将新样式设置回 config store
		setCardStyles(next)
	},

	// 设置卡片尺寸的方法
	setSize: (key, width, height) => {
		const { cardStyles, setCardStyles } = useConfigStore.getState()

		// 类似 setOffset，保留其他属性，仅更新目标 key 的 width 和 height
		const next: CardStyles = {
			...cardStyles,
			[key]: {
				...cardStyles[key],
				width,
				height
			}
		}

		setCardStyles(next)
	}
}))
