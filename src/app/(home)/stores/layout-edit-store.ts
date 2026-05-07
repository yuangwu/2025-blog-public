// 标记这是一个 Next.js 13+ 的客户端组件
// （因为使用了 React Hooks/Zustand 等客户端特性，必须在文件顶部声明）
'use client'

// 导入 Zustand 的 create 函数，用于创建状态管理 Store
import { create } from 'zustand'
// 导入另一个 Store（配置 Store）中的 hook 和类型，用于联动管理卡片样式
import { useConfigStore, type CardStyles } from './config-store'

// 定义 CardKey 类型：它是 CardStyles 类型的所有键名的联合类型
// （例如：如果 CardStyles 是 { header: {}, body: {} }，则 CardKey 是 'header' | 'body'）
type CardKey = keyof CardStyles

// 定义当前布局编辑 Store 的状态结构（State + Actions）
interface LayoutEditState {
	// 状态：是否处于“编辑模式”
	editing: boolean
	// 状态：编辑前的卡片样式快照（用于“取消编辑”时恢复原状）
	snapshot: CardStyles | null
	// 方法：开始编辑（触发编辑模式 + 保存当前样式快照）
	startEditing: () => void
	// 方法：取消编辑（恢复快照样式 + 退出编辑模式）
	cancelEditing: () => void
	// 方法：保存编辑（仅退出编辑模式，样式已实时更新无需额外保存）
	saveEditing: () => void
	// 方法：设置指定卡片的偏移量（offsetX/Y 为 null 时表示重置）
	setOffset: (key: CardKey, offsetX: number | null, offsetY: number | null) => void
	// 方法：设置指定卡片的尺寸（width/height 为 undefined 时表示保持原值）
	setSize: (key: CardKey, width: number | undefined, height: number | undefined) => void
}

// 创建并导出 Zustand Store，泛型约束为上面定义的 LayoutEditState
export const useLayoutEditStore = create<LayoutEditState>((set, get) => ({
	// ------------------------------
	// 1. 初始状态
	// ------------------------------
	editing: false,    // 默认不在编辑模式
	snapshot: null,     // 默认无样式快照

	// ------------------------------
	// 2. 方法：开始编辑
	// ------------------------------
	startEditing: () => {
		// 从 config-store 获取当前的卡片样式（getState() 用于直接读取 Store 状态）
		const { cardStyles } = useConfigStore.getState()
		// 更新当前 Store 状态：进入编辑模式 + 保存当前样式的深拷贝作为快照
		set({
			editing: true,
			snapshot: { ...cardStyles }  // 用展开运算符做浅拷贝（假设 CardStyles 是单层对象）
		})
	},

	// ------------------------------
	// 3. 方法：取消编辑
	// ------------------------------
	cancelEditing: () => {
		// 获取当前 Store 的 snapshot（get() 用于读取自身 Store 的状态）
		const { snapshot } = get()
		// 如果没有快照（异常情况），直接退出编辑模式并返回
		if (!snapshot) {
			set({ editing: false, snapshot: null })
			return
		}

		// 从 config-store 获取设置卡片样式的方法
		const { setCardStyles } = useConfigStore.getState()
		// 用快照恢复 config-store 中的卡片样式
		setCardStyles(snapshot)

		// 更新当前 Store 状态：退出编辑模式 + 清空快照
		set({
			editing: false,
			snapshot: null
		})
	},

	// ------------------------------
	// 4. 方法：保存编辑
	// ------------------------------
	saveEditing: () => {
		// 只需退出编辑模式并清空快照
		// （因为样式在 setOffset/setSize 中已实时更新到 config-store，无需额外保存）
		set({
			editing: false,
			snapshot: null
		})
	},

	// ------------------------------
	// 5. 方法：设置卡片偏移量
	// ------------------------------
	setOffset: (key, offsetX, offsetY) => {
		// 从 config-store 获取当前卡片样式和设置方法
		const { cardStyles, setCardStyles } = useConfigStore.getState()

		// 构造新的卡片样式对象（不可变更新：先拷贝整体，再拷贝目标卡片）
		const next: CardStyles = {
			...cardStyles,                // 拷贝所有卡片样式
			[key]: {                       // 覆盖目标卡片的样式
				...cardStyles[key],        // 先拷贝该卡片的原有样式
				offsetX,                    // 更新 offsetX（新值覆盖）
				offsetY                     // 更新 offsetY（新值覆盖）
			}
		}

		// 将新样式更新到 config-store
		setCardStyles(next)
	},

	// ------------------------------
	// 6. 方法：设置卡片尺寸
	// ------------------------------
	setSize: (key, width, height) => {
		// 逻辑与 setOffset 完全一致，仅更新的字段改为 width/height
		const { cardStyles, setCardStyles } = useConfigStore.getState()

		const next: CardStyles = {
			...cardStyles,
			[key]: {
				...cardStyles[key],
				width,    // 更新宽度
				height    // 更新高度
			}
		}

		setCardStyles(next)
	}
}))