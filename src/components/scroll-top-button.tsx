// 该文件是一个客户端组件，只能在浏览器环境中运行
'use client'

import { useEffect, useState, useCallback } from 'react'
// 引入 motion 库，用于创建带有动画的组件
import { motion } from 'motion/react'
// 引入名为 TopSVG 的图标组件（通常是返回顶部的箭头图标）
import TopSVG from '@/svgs/top.svg'
// 引入一个工具函数 cn，通常用于合并 class 名称（类似 classnames 库）
import { cn } from '@/lib/utils'

// 定义组件 Props 的类型
type ScrollTopButtonProps = {
	className?: string // 允许外部传入自定义样式类名
	delay?: number     // 按钮延迟显示的时间（毫秒）
}

// 导出“返回顶部”按钮组件
export function ScrollTopButton({ className, delay }: ScrollTopButtonProps) {
	// show 状态：控制按钮是否已经“允许显示”（经过延迟后变为 true）
	const [show, setShow] = useState(false)
	// active 状态：根据页面滚动位置控制按钮是否活跃（滚动超过 200px 时变为 true）
	const [active, setActive] = useState(false)

	// 副作用：在组件挂载后，延迟一段时间再将 show 设为 true
	// 如果没有传入 delay，则默认延迟 1000 毫秒
	useEffect(() => {
		setTimeout(() => setShow(true), delay || 1000)
	}, [delay])

	// 副作用：监听页面滚动事件，更新 active 状态
	useEffect(() => {
		const handleScroll = () => {
			// 当垂直滚动距离大于 200px 时，将 active 设为 true
			setActive(window.scrollY > 200)
		}
		// 初始调用一次，确保状态根据当前滚动位置正确设置
		handleScroll()
		// 添加滚动监听，设置 passive: true 提升滚动性能
		window.addEventListener('scroll', handleScroll, { passive: true })
		// 清理函数：组件卸载时移除监听
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	// 如果按钮尚未到显示时间（show 为 false）或不需要显示（active 为 false），不渲染任何内容
	if (!show || !active) return null

	// 点击按钮的回调函数：滚动到页面顶部
	const handleClick = useCallback(() => {
		// 平滑滚动到顶部
		window.scrollTo({ top: 0, behavior: 'smooth' })
		// 滚动后延迟一秒再将 active 设为 false，让按钮在动画期间保持可见然后淡出
		setTimeout(() => setActive(false), 1000)
	}, [])

	return (
		// 使用 motion.button 创建一个带动画的按钮
		<motion.button
			// 初始动画状态：完全透明，缩放 0.4 倍
			initial={{ opacity: 0, scale: 0.4 }}
			// 进入时的动画状态：完全不透明，缩放为原始大小
			animate={{ opacity: 1, scale: 1 }}
			// 鼠标悬停时轻微放大
			whileHover={{ scale: 1.05 }}
			// 点击时轻微缩小，提供按压反馈
			whileTap={{ scale: 0.95 }}
			// 绑定点击事件，调用 handleScrollClick
			onClick={handleClick}
			// 提供无障碍标签，说明这是一个“滚动到顶部”的按钮
			aria-label='Scroll to top'
			// 合并默认样式、外部传入的 className
			className={cn('card text-secondary static gap-2 rounded-full p-3 text-sm', className)}>
			{/* 渲染返回顶部的 SVG 图标，宽度为 w-7 */}
			<TopSVG className='w-7' />
		</motion.button>
	)
}