'use client' // 标记该文件为客户端组件，仅在浏览器环境执行

import { useEffect } from 'react' // 导入 React 的副作用 Hook
import { create } from 'zustand'  // 导入 zustand 状态管理库的 create 方法

/**
 * 中央坐标状态类型定义
 * 用于存储和更新浏览器窗口的中心坐标及尺寸
 */
type CenterState = {
	x: number         // 当前中心横坐标（已向下偏移 24px 的 Y 值）
	y: number         // 当前中心纵坐标（屏幕正中 Y 值 - 24）
	centerX: number   // 屏幕正中央横坐标（像素值 floor(width/2)）
	centerY: number   // 屏幕正中央纵坐标（像素值 floor(height/2)）
	width: number     // 窗口可视宽度
	height: number    // 窗口可视高度
	setCenter: (x: number, y: number) => void // 手动设置坐标
	recalc: () => void // 重新计算并更新中心坐标及尺寸
}

/**
 * 计算窗口中心坐标及尺寸（纯函数，安全调用 window）
 * 如果不在浏览器环境（如服务端渲染），返回默认值 0
 */
const computeCenter = () => {
	// 检查 window 是否存在，避免在服务端执行时报错
	if (typeof window === 'undefined') {
		return { x: 0, y: 0, width: 0, height: 0 }
	}
	const width = window.innerWidth   // 窗口内部宽度
	const height = window.innerHeight // 窗口内部高度
	return {
		x: Math.floor(width / 2),          // 水平居中坐标
		y: Math.floor(height / 2) - 24,    // 垂直居中并向上偏移 24px
		centerX: Math.floor(width / 2),    // 真实水平中心
		centerY: Math.floor(height / 2),   // 真实垂直中心
		width,                             // 宽度
		height                             // 高度
	}
}

/**
 * 使用 zustand 创建全局中央坐标状态管理 Store
 * 初始值均为 0，随后通过客户端初始化 Hook 填充真实值
 */
export const useCenterStore = create<CenterState>(set => ({
	x: 0,
	y: 0,
	centerX: 0,
	centerY: 0,
	width: 0,
	height: 0,
	// 手动设置中心坐标（仅更新 x, y）
	setCenter: (x, y) => set({ x, y }),
	// 重新计算窗口中心并更新所有相关状态
	recalc: () => {
		const c = computeCenter() // 调用计算函数获取最新值
		set({
			x: c.x,
			y: c.y,
			width: c.width,
			height: c.height,
			centerX: c.centerX,
			centerY: c.centerY
		})
	}
}))

/**
 * 客户端初始化 Hook
 * 在组件挂载时执行一次中心坐标计算，并监听窗口大小变化，自动重新计算
 * 同时会清理 resize 事件监听，避免内存泄漏
 */
export function useCenterInit() {
	useEffect(() => {
		// 定义更新函数，每次执行都重新计算并更新 Store
		const update = () => useCenterStore.getState().recalc()
		update() // 首次挂载立即计算

		// 监听浏览器窗口大小变化，适时重新计算
		window.addEventListener('resize', update)

		// 清理函数：组件卸载时移除事件监听器
		return () => window.removeEventListener('resize', update)
	}, []) // 空依赖数组，确保只在挂载/卸载时执行
}
