'use client'

import { useEffect, useState, useCallback } from 'react'
// 从 motion/react 引入 motion，用于创建带动画的按钮组件
import { motion } from 'motion/react'
// 引入返回顶部的 SVG 图标（假设项目使用 SVGR 处理 SVG 为 React 组件）
import TopSVG from '@/svgs/top.svg'
// 引入工具函数 cn，用于动态拼接 className
import { cn } from '@/lib/utils'

// 定义 ScrollTopButton 组件的属性类型
type ScrollTopButtonProps = {
	className?: string // 可选的自定义样式类
	delay?: number      // 可选的出现延迟时间（毫秒）
}

/**
 * ScrollTopButton 组件
 * 当页面滚动超过 200px 时显示一个返回顶部的按钮，点击后平滑滚动到顶部。
 * 使用 Framer Motion 实现动画效果。
 */
export function ScrollTopButton({ className, delay }: ScrollTopButtonProps) {
	// 控制按钮是否完成初次渲染（可用于实现延迟出现）
	const [show, setShow] = useState(false)
	// 控制按钮是否处于活跃状态（即滚动超过阈值时显示）
	const [active, setActive] = useState(false)

	// 初次挂载后，根据传入的 delay（默认 1000ms）延迟显示按钮
	useEffect(() => {
		const timer = setTimeout(() => setShow(true), delay || 1000)
		// 清理定时器，避免内存泄漏
		return () => clearTimeout(timer)
	}, [delay])

	// 监听页面滚动，当滚动超过 200px 时标记为活跃
	useEffect(() => {
		const handleScroll = () => {
			setActive(window.scrollY > 200)
		}
		// 初始检查一次滚动位置
		handleScroll()
		// 使用被动事件提升滚动性能
		window.addEventListener('scroll', handleScroll, { passive: true })
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	// 如果未显示或未达到活跃状态，不渲染任何内容
	if (!show || !active) return null

	// 点击返回顶部：平滑滚动到顶部，并在 1 秒后重置活跃状态（隐藏按钮）
	const handleClick = useCallback(() => {
		window.scrollTo({ top: 0, behavior: 'smooth' })
		setTimeout(() => setActive(false), 1000)
	}, [])

	return (
		<motion.button
			// 初始动画状态：透明度 0，缩放 0.4
			initial={{ opacity: 0, scale: 0.4 }}
			// 进入动画状态：完全显示并恢复正常大小
			animate={{ opacity: 1, scale: 1 }}
			// 悬停时轻微放大
			whileHover={{ scale: 1.05 }}
			// 点击时轻微缩小
			whileTap={{ scale: 0.95 }}
			onClick={handleClick}
			// 无障碍标签：向屏幕阅读器说明按钮用途
			aria-label='Scroll to top'
			// 使用 cn 合并基础样式与外部传入的 className
			className={cn('card text-secondary static gap-2 rounded-full p-3 text-sm', className)}
		>
			{/* 返回顶部的 SVG 图标，设置宽度为 7 */}
			<TopSVG className='w-7' />
		</motion.button>
	)
}
