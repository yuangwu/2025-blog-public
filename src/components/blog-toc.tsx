'use client'

import clsx from 'clsx'
import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'

// 目录项的类型定义
type TocItem = {
	id: string      // 用于跳转的锚点 id
	text: string    // 显示的文本内容
	level: number   // 标题层级，1 表示 h1，2 表示 h2，以此类推
}

// BlogToc 组件的 props 类型
type BlogTocProps = {
	toc: TocItem[]       // 目录数据数组
	delay?: number       // 动画延迟，默认为 0
}

/**
 * 博客文章目录组件
 * 根据传入的 toc 数据，渲染可点击跳转的目录列表，
 * 并通过 IntersectionObserver 高亮当前视口内最靠前的标题。
 */
export function BlogToc({ toc, delay = 0 }: BlogTocProps) {
	// 当前处于视口内的标题 id 集合
	const [activeIds, setActiveIds] = useState<Set<string>>(new Set())

	// 从当前活跃的标题 id 中，找出在文章中出现顺序最靠前的一个
	// 用于唯一高亮（例如变色）当前正在阅读的章节
	const minActiveId = useMemo(() => {
		return Array.from(activeIds).sort(
			(a, b) =>
				toc.findIndex(item => item.id === a) - toc.findIndex(item => item.id === b)
		)[0] // 可能为 undefined，当没有活跃标题时不进行高亮
	}, [activeIds, toc])

	useEffect(() => {
		// 如果没有目录数据，无需创建观察器
		if (toc.length === 0) return

		// 存储每个标题对应的观察器实例，清理时统一断开
		const observers = new Map<string, IntersectionObserver>()

		// 为每个标题元素创建交叉观察器
		toc.forEach(item => {
			const element = document.getElementById(item.id)
			if (!element) return // 如果 DOM 中不存在该元素则跳过

			const observer = new IntersectionObserver(
				entries => {
					entries.forEach(entry => {
						setActiveIds(prev => {
							const newSet = new Set(prev)
							if (entry.isIntersecting) {
								newSet.add(entry.target.id) // 进入视口，加入活跃集合
							} else {
								newSet.delete(entry.target.id) // 离开视口，移出活跃集合
							}
							return newSet
						})
					})
				},
				{
					// 提前触发观察的区域调整，让高亮切换更自然
					rootMargin: '-100px 0px -100px 0px',
					threshold: 0
				}
			)

			observer.observe(element)
			observers.set(item.id, observer)
		})

		// 组件卸载或 toc 变化时，断开所有观察器，避免内存泄漏
		return () => {
			observers.forEach(observer => observer.disconnect())
		}
	}, [toc])

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ delay }} // 延迟动画，可用于和页面其它动画错开
			className='bg-card w-full rounded-xl border p-3 text-sm'
		>
			{/* 目录标题 */}
			<h2 className='text-secondary mb-2 font-medium'>目录</h2>

			<div className='relative max-h-[300px] space-y-2 overflow-auto'>
				{/* 当目录为空时显示提示信息 */}
				{toc.length === 0 && <div className='text-secondary'>暂无</div>}

				{/* 渲染目录列表 */}
				{toc.map(item => (
					<a
						key={item.id + item.level} // 使用 id + level 作为唯一 key，避免重复
						href={`#${item.id}`}       // 点击跳转到对应标题位置
						className={clsx(
							'hover:text-brand relative block pl-3 transition-colors',
							// 当前 section 活跃时高亮文字颜色
							item.id === minActiveId && 'text-brand'
						)}
						// 根据标题层级动态设置缩进，层级越深缩进越大
						style={{ paddingLeft: (item.level - 1) * 8 }}
					>
						{item.text}
					</a>
				))}
			</div>
		</motion.div>
	)
}
