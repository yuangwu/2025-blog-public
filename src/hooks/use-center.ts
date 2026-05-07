// 该指令告诉 Next.js 这个文件是一个客户端组件，所有代码都将在浏览器中执行
'use client'

import { useEffect } from 'react' // React 的副作用钩子，用于在组件挂载/卸载时执行逻辑
import { create } from 'zustand'   // zustand 状态管理库，用于创建轻量级的全局 store

/**
 * 定义中心位置状态的类型
 */
type CenterState = {
  x: number        // 当前显示用的水平中心坐标（可能带有偏移）
  y: number        // 当前显示用的垂直中心坐标（已减去 24px 偏移）
  centerX: number  // 视口的几何水平中心
  centerY: number  // 视口的几何垂直中心
  width: number    // 视口宽度
  height: number   // 视口高度
  setCenter: (x: number, y: number) => void // 手动设置显示用的中心坐标
  recalc: () => void                        // 重新根据窗口尺寸计算所有中心相关数据
}

/**
 * 计算窗口中心相关数据（纯函数）
 * - 如果在服务端（无 window 对象），返回全 0
 * - 如果在浏览器中，根据 window.innerWidth/Height 计算
 *   其中 y 坐标减去 24px，通常是为了避开移动端浏览器顶部地址栏/工具栏
 */
const computeCenter = () => {
  // 服务端渲染时的降级处理，避免访问 window 抛出错误
  if (typeof window === 'undefined') {
    return { x: 0, y: 0, width: 0, height: 0 }
  }
  const width = window.innerWidth
  const height = window.innerHeight
  return {
    x: Math.floor(width / 2),          // 实际使用的中心 x（页面中间）
    y: Math.floor(height / 2) - 24,    // 实际使用的中心 y，减去 24px 偏移，给顶部 UI 留出空间
    centerX: Math.floor(width / 2),    // 纯粹的几何水平中心
    centerY: Math.floor(height / 2),   // 纯粹的几何垂直中心
    width,
    height
  }
}

/**
 * 全局 Zustand Store
 * 存储并管理视口中心坐标、宽高等信息
 */
export const useCenterStore = create<CenterState>(set => ({
  x: 0,
  y: 0,
  centerX: 0,
  centerY: 0,
  width: 0,
  height: 0,

  // 手动更新显示用的中心坐标
  setCenter: (x, y) => set({ x, y }),

  // 重新计算窗口中心并一次性更新所有状态
  recalc: () => {
    const c = computeCenter()
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
 * 用于在根组件或布局中调用的初始化 Hook
 * - 首次挂载时立即计算一次视口中心
 * - 监听浏览器 resize 事件，窗口大小变化时自动重新计算
 */
export function useCenterInit() {
  useEffect(() => {
    // 通过 getState() 直接调用 store 中的 recalc 方法
    const update = () => useCenterStore.getState().recalc()
    update() // 首次计算当前窗口中心

    window.addEventListener('resize', update) // 窗口变化时重新计算

    // 清理副作用：组件卸载时移除 resize 监听
    return () => window.removeEventListener('resize', update)
  }, []) // 空依赖表示只在组件挂载/卸载时执行
}