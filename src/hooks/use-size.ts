// 标记此文件为客户端组件（Next.js App Router 中需要在客户端运行的组件）
'use client'

import { useEffect } from 'react'
import { create } from 'zustand'

// 定义 store 的状态类型
type SizeState = {
	init: boolean
	// 是否已完成初始化（客户端首次计算尺寸）
	maxXL: boolean
	// 宽度 < 1280px
	maxLG: boolean
	// 宽度 < 1024px
	maxMD: boolean
	// 宽度 < 768px
	maxSM: boolean
	// 宽度 < 640px
	maxXS: boolean
	// 宽度 < 360px
	recalc: () => void
	// 手动触发重新计算尺寸的方法
}

// 初始默认状态（服务端或未计算时使用）
const initState = {
	init: false,
	maxXL: false,
	maxLG: false,
	maxMD: false,
	maxSM: false,
	maxXS: false
}

/**
 * 根据当前窗口宽度计算各个断点的布尔值
 * 如果不在浏览器环境（如 SSR），返回初始状态
 */
const computeSize = (): Omit<SizeState, 'recalc'> => {
	if (typeof window !== 'undefined') {
		const width = window.innerWidth

		return {
			init: true,
			maxXL: width < 1280,
			maxLG: width < 1024,
			maxMD: width < 768,
			maxSM: width < 640,
			maxXS: width < 360
		}
	}

	// 服务端或非浏览器环境返回未初始化状态
	return initState
}

/**
 * 使用 zustand 创建的全局尺寸 store
 * 存储当前窗口宽度对应的断点状态
 * 提供 recalc 方法手动刷新状态
 */
export const useSizeStore = create<SizeState>(set => ({
	...initState,
	recalc: () => {
		// 调用 computeSize 并合并到 store 中
		set(computeSize())
	}
}))

/**
 * 用于在应用根组件调用的初始化 hook
 * 会在组件挂载时首次计算尺寸，并监听窗口 resize 事件实时更新
 */
export function useSizeInit() {
	useEffect(() => {
		// 获取 recalc 方法并立即执行一次初始化
		const update = () => useSizeStore.getState().recalc()
		update()
		// 监听窗口大小变化，自动更新 store
		window.addEventListener('resize', update)
		// 清理：组件卸载时移除事件监听
		return () => window.removeEventListener('resize', update)
	}, [])
}

// 直接导出 store hook，方便其他组件直接读取尺寸状态
export const useSize = useSizeStore
