'use client'

import { useEffect } from 'react'
import { create } from 'zustand'

// 定义用于存储窗口尺寸状态和方法的类型
type SizeState = {
	init: boolean      // 是否已完成初始化（首次计算尺寸）
	maxXL: boolean     // 宽度是否小于1280px
	maxLG: boolean     // 宽度是否小于1024px
	maxMD: boolean     // 宽度是否小于768px
	maxSM: boolean     // 宽度是否小于640px
	maxXS: boolean     // 宽度是否小于360px
	recalc: () => void // 重新计算当前窗口尺寸的方法
}

// 初始状态的默认值，init为false表示尚未计算
const initState = {
	init: false,
	maxXL: false,
	maxLG: false,
	maxMD: false,
	maxSM: false,
	maxXS: false
}

/**
 * 根据当前窗口宽度计算尺寸断点状态
 * 如果处于服务端渲染环境（无window对象），返回默认初始状态
 */
const computeSize = (): Omit<SizeState, 'recalc'> => {
	// 仅在浏览器环境中才能访问window对象
	if (typeof window !== 'undefined') {
		const width = window.innerWidth

		return {
			init: true,          // 标记已完成初始化
			maxXL: width < 1280,
			maxLG: width < 1024,
			maxMD: width < 768,
			maxSM: width < 640,
			maxXS: width < 360
		}
	}

	// 服务端渲染时返回未初始化的默认值
	return initState
}

/**
 * 使用zustand创建的全局尺寸状态store
 * 可在任何客户端组件中引入，获取当前窗口断点信息
 */
export const useSizeStore = create<SizeState>(set => ({
	...initState,
	// recalc方法触发状态更新，调用computeSize获取最新尺寸
	recalc: () => {
		set(computeSize())
	}
}))

/**
 * 用于在应用顶层初始化的Hook
 * 监听窗口resize事件，自动更新尺寸状态
 * 仅在客户端执行一次（useEffect依赖为空数组）
 */
export function useSizeInit() {
	useEffect(() => {
		// 获取立即执行一次计算
		const update = () => useSizeStore.getState().recalc()
		update()
		// 添加resize事件监听
		window.addEventListener('resize', update)
		// 清理函数：组件卸载时移除监听
		return () => window.removeEventListener('resize', update)
	}, [])
}

/**
 * 便捷导出，直接使用useSizeStore hook
 * 在其他组件中可以直接 import { useSize } 来获取尺寸状态
 */
export const useSize = useSizeStore
