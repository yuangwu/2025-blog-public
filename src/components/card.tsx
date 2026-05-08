'use client'

// 导入动画延迟常量，用于控制卡片的逐一出场时间
import { ANIMATION_DELAY } from '@/consts'
// motion 组件来自 motion/react 库 (原 framer-motion 的继任者)
import { motion } from 'motion/react'
// cn 是一个用于合并类名的工具函数 (类似 classnames)
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
// 自定义 Hook，用于监听屏幕尺寸变化，返回 maxSM (是否为小屏) 和 init (是否已初始化)
import { useSize } from '@/hooks/use-size'

interface Props {
	className?: string
	order: number          // 卡片的动画出场顺序
	width: number          // 卡片宽度 (像素值)
	height?: number        // 卡片高度 (像素值，可选)
	x: number              // 卡片 x 坐标 (用于动画初始位置)
	y: number              // 卡片 y 坐标 (用于动画初始位置)
	children: React.ReactNode
}

export default function Card({ children, order, width, height, x, y, className }: Props) {
	// 获取屏幕尺寸状态：maxSM 为真时表示当前为小屏幕，init 表示屏幕尺寸监听已初始化
	const { maxSM, init } = useSize()
	// 控制卡片是否进入显示状态
	let [show, setShow] = useState(false)

	// 修复：避免直接修改组件属性 order
	// 在小屏幕且已经完成初始化时，我们希望所有卡片同时出现（顺序为 0）
	// 因此使用 effectiveOrder 替代直接修改 props
	const effectiveOrder = (maxSM && init) ? 0 : order

	useEffect(() => {
		// 如果已经显示，则不需要再设置定时器
		if (show) return
		// 如果卡片目标位置为 (0, 0)，不执行动画（按设计这种卡片无需延迟显示）
		if (x === 0 && y === 0) return

		// 根据顺序延迟显示卡片，实现依次入场效果
		const timer = setTimeout(
			() => {
				setShow(true)
			},
			effectiveOrder * ANIMATION_DELAY * 1000 // 延迟时间（毫秒）
		)

		// 清理函数：组件卸载或依赖变化时清除定时器，防止内存泄漏和状态更新错误
		return () => clearTimeout(timer)
	}, [x, y, show, effectiveOrder]) // 将 effectiveOrder 加入依赖，保证响应顺序变化

	// 当 show 为 true 时渲染带动画的卡片，否则返回 null（不渲染任何内容）
	if (show)
		return (
			<motion.div
				className={cn('card squircle', className)}
				// 初始状态：透明、缩小、位于指定坐标
				initial={{ opacity: 0, scale: 0.6, left: x, top: y, width, height }}
				// 动画目标状态：完全显示、正常大小、位置与尺寸不变
				animate={{ opacity: 1, scale: 1, left: x, top: y, width, height }}
				// 鼠标悬停时微微放大
				whileHover={{ scale: 1.05 }}
				// 点击时缩小，提供反馈
				whileTap={{ scale: 0.95 }}>
				{children}
			</motion.div>
		)

	// 未到显示时机时返回 null，组件不占据 DOM 空间
	return null
}
