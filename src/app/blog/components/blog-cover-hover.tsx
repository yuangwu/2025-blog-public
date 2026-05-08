'use client'

// 引入 Framer Motion 的动画组件和 React 钩子
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'

// 鼠标悬停后展示封面的延迟时间（毫秒）
const COVER_HOVER_DELAY_MS = 1500
// 封面预览相对于鼠标位置的偏移量（像素）
const PREVIEW_OFFSET_PX = 16

// 封面预览状态的类型：包含图片地址的对象或 null
export type BlogCoverPreviewState = { src: string } | null

/**
 * 自定义钩子：处理博客文章封面鼠标悬停预览
 * @param editMode 当前是否处于编辑模式，编辑模式下禁用预览
 */
export function useBlogCoverHover(editMode: boolean) {
	// 封面预览数据（悬停触发的封面信息）
	const [hoverCoverPreview, setHoverCoverPreview] = useState<BlogCoverPreviewState>(null)
	// 当前鼠标位置（用于定位预览卡片）
	const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)
	// 存储悬停定时器的引用，用于取消延迟
	const coverHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	// 清除悬停定时器的回调，避免内存泄漏
	const clearCoverHoverSchedule = useCallback(() => {
		if (coverHoverTimerRef.current !== null) {
			clearTimeout(coverHoverTimerRef.current)
			coverHoverTimerRef.current = null
		}
	}, [])

	// 取消封面预览，同时清除定时器并将预览置空
	const cancelCoverPreview = useCallback(() => {
		clearCoverHoverSchedule()
		setHoverCoverPreview(null)
	}, [clearCoverHoverSchedule])

	// 组件卸载时确保清理定时器
	useEffect(() => {
		return () => clearCoverHoverSchedule()
	}, [clearCoverHoverSchedule])

	// 当进入编辑模式时，立即取消任何正在展示的封面预览
	useEffect(() => {
		if (editMode) cancelCoverPreview()
	}, [editMode, cancelCoverPreview])

	// 全局监听鼠标移动，利用 requestAnimationFrame 做节流，更新鼠标位置
	useEffect(() => {
		let rafId = 0
		// 最新坐标暂存，避免频繁 setState
		const latest = { x: 0, y: 0 }
		const flush = () => {
			rafId = 0
			setMousePosition({ x: latest.x, y: latest.y })
		}
		const handleMouseMove = (e: MouseEvent) => {
			latest.x = e.clientX
			latest.y = e.clientY
			// 如果没有待处理的动画帧，则请求下一帧执行 flush
			if (rafId === 0) rafId = requestAnimationFrame(flush)
		}
		// 使用 passive 模式提升滚动性能
		window.addEventListener('mousemove', handleMouseMove, { passive: true })
		return () => {
			window.removeEventListener('mousemove', handleMouseMove)
			// 清理未完成的动画帧
			if (rafId !== 0) cancelAnimationFrame(rafId)
		}
	}, [])

	/**
	 * 封面链接鼠标进入事件的处理函数
	 * @param cover 封面图片的 src 地址，可选
	 * 如果处于编辑模式或没有封面地址，则不触发预览；否则经过延迟后设置预览图片
	 */
	const onCoverLinkMouseEnter = useCallback(
		(cover?: string) => {
			if (editMode || !cover) return
			clearCoverHoverSchedule()
			coverHoverTimerRef.current = setTimeout(() => {
				coverHoverTimerRef.current = null
				setHoverCoverPreview({ src: cover })
			}, COVER_HOVER_DELAY_MS)
		},
		[editMode, clearCoverHoverSchedule]
	)

	// 返回给组件使用的接口
	return {
		cancelCoverPreview,    // 取消预览
		onCoverLinkMouseEnter, // 鼠标进入处理函数
		hoverCoverPreview,     // 当前预览数据
		mousePosition          // 当前鼠标位置
	}
}

// BlogCoverHoverPreview 组件的 props 类型
type BlogCoverHoverPreviewProps = {
	preview: BlogCoverPreviewState // 预览数据（含图片地址）
	position: { x: number; y: number } | null // 预览应放置的坐标
}

/**
 * 封面悬停预览的可视化组件
 * 在鼠标附近显示一个浮动卡片，展示封面缩略图，并带有进入/退出动画
 */
export function BlogCoverHoverPreview({ preview, position }: BlogCoverHoverPreviewProps) {
	return (
		// AnimatePresence 用于在条件渲染时处理退出动画
		<AnimatePresence>
			{preview && position && (
				<motion.div
					key={preview.src} // 根据图片地址切换动画
					initial={{ opacity: 0, scale: 0.6 }}   // 出现初始状态
					animate={{ opacity: 1, scale: 1 }}     // 正常展示状态
					exit={{ opacity: 0, scale: 0.6 }}      // 退出消失状态
					className='bg-card pointer-events-none fixed z-100 min-h-[80px] w-[160px] overflow-hidden rounded-3xl p-4 shadow-sm backdrop-blur-sm'
					style={{
						// 卡片位置基于鼠标坐标加偏移量
						left: position.x + PREVIEW_OFFSET_PX,
						top: position.y + PREVIEW_OFFSET_PX
					}}>
					{/* 预览图片，禁止拖拽 */}
					<img src={preview.src} alt='' className='w-full rounded-xl object-cover' draggable={false} />
				</motion.div>
			)}
		</AnimatePresence>
	)
}
