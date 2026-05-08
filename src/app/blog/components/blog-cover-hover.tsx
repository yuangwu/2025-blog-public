// 标记为 Next.js 客户端组件（需使用浏览器 API，如鼠标事件、requestAnimationFrame）
'use client'

// 从 motion/react 导入动画组件：AnimatePresence（控制组件存在/消失动画）、motion（动画容器）
import { AnimatePresence, motion } from 'motion/react'
// 导入 React 核心 Hooks
import { useCallback, useEffect, useRef, useState } from 'react'

// ---------------- 常量定义 ----------------
// 鼠标悬停后，延迟多久显示预览（1500ms = 1.5s）
const COVER_HOVER_DELAY_MS = 1500
// 预览框距离鼠标指针的偏移量（避免预览框遮挡鼠标）
const PREVIEW_OFFSET_PX = 16

// ---------------- 类型定义 ----------------
// 预览状态的类型：要么是包含图片 src 的对象，要么是 null（无预览）
export type BlogCoverPreviewState = { src: string } | null

// ---------------- 自定义 Hook：核心逻辑 ----------------
// 参数 editMode：是否处于“编辑模式”（编辑模式下禁用预览）
export function useBlogCoverHover(editMode: boolean) {
	// 状态1：当前预览的封面信息（null 表示不显示预览）
	const [hoverCoverPreview, setHoverCoverPreview] = useState<BlogCoverPreviewState>(null)
	// 状态2：鼠标当前坐标（用于定位预览框）
	const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)
	// Ref：存储定时器 ID（用 Ref 而非 state，避免闭包陷阱，方便随时清除）
	const coverHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	// 工具函数1：清除悬停定时器（避免重复触发预览）
	const clearCoverHoverSchedule = useCallback(() => {
		if (coverHoverTimerRef.current !== null) {
			clearTimeout(coverHoverTimerRef.current)
			coverHoverTimerRef.current = null
		}
	}, [])

	// 工具函数2：完全取消预览（清除定时器 + 重置预览状态）
	const cancelCoverPreview = useCallback(() => {
		clearCoverHoverSchedule()
		setHoverCoverPreview(null)
	}, [clearCoverHoverSchedule])

	// Effect1：组件卸载时清除定时器（防止内存泄漏）
	useEffect(() => {
		return () => clearCoverHoverSchedule()
	}, [clearCoverHoverSchedule])

	// Effect2：当 editMode 变为 true 时，立即取消预览（编辑模式不需要预览）
	useEffect(() => {
		if (editMode) cancelCoverPreview()
	}, [editMode, cancelCoverPreview])

	// Effect3：监听全局鼠标移动，更新鼠标坐标（用 requestAnimationFrame 优化性能）
	useEffect(() => {
		let rafId = 0
		// requestAnimationFrame 的 ID，用于取消
		const latest = { x: 0, y: 0 }
		// 存储最新的鼠标坐标（避免频繁触发 state 更新）

		// 批量更新函数：通过 requestAnimationFrame 延迟执行，减少重渲染
		const flush = () => {
			rafId = 0
			setMousePosition({ x: latest.x, y: latest.y })
		}

		// 鼠标移动事件处理：只更新 latest 坐标，不直接更新 state
		const handleMouseMove = (e: MouseEvent) => {
			latest.x = e.clientX
			latest.y = e.clientY
			if (rafId === 0) rafId = requestAnimationFrame(flush)
		}

		// 绑定全局鼠标移动事件（passive: true 提升滚动性能）
		window.addEventListener('mousemove', handleMouseMove, { passive: true })

		// 组件卸载时：移除事件监听 + 取消未执行的 requestAnimationFrame
		return () => {
			window.removeEventListener('mousemove', handleMouseMove)
			if (rafId !== 0) cancelAnimationFrame(rafId)
		}
	}, [])

	// 核心函数：当鼠标“进入”封面链接时触发
	const onCoverLinkMouseEnter = useCallback(
		(cover?: string) => {
			// 边界情况：编辑模式 或 无封面图片 → 直接返回，不显示预览
			if (editMode || !cover) return

			// 先清除之前的定时器（避免鼠标快速滑过时触发多个预览）
			clearCoverHoverSchedule()

			// 设置新定时器：延迟 COVER_HOVER_DELAY_MS 后显示预览
			coverHoverTimerRef.current = setTimeout(() => {
				coverHoverTimerRef.current = null
				setHoverCoverPreview({ src: cover }) // 更新预览状态，触发 UI 显示
			}, COVER_HOVER_DELAY_MS)
		},
		[editMode, clearCoverHoverSchedule]
	)

	// 暴露给组件使用的状态和方法
	return {
		cancelCoverPreview,
		// 取消预览（可用于鼠标“离开”链接时调用）
		onCoverLinkMouseEnter,
		// 鼠标进入链接时调用（传入封面 src）
		hoverCoverPreview,
		// 当前预览状态（传给视图组件）
		mousePosition
		// 当前鼠标位置（传给视图组件用于定位）
	}
}

// ---------------- 视图组件：动画渲染 ----------------
// 组件 Props 类型定义
type BlogCoverHoverPreviewProps = {
	preview: BlogCoverPreviewState
	// 预览状态（来自 Hook）
	position: { x: number; y: number } | null
	// 鼠标位置（来自 Hook）
}

export function BlogCoverHoverPreview({ preview, position }: BlogCoverHoverPreviewProps) {
	return (
		// AnimatePresence：控制组件“存在/消失”时的动画（需包裹 motion 组件）
		<AnimatePresence>
			{/* 只有当 preview 和 position 都存在时，才渲染预览框 */}
			{preview && position && (
				// motion.div：带动画的 div 容器
				<motion.div
					// key：用图片 src 作为 key，确保切换不同封面时重新触发动画
					key={preview.src}
					// initial：组件“初始挂载”时的状态（透明 + 缩小）
					initial={{ opacity: 0, scale: 0.6 }}
					// animate：组件“挂载后”的动画目标（不透明 + 正常大小）
					animate={{ opacity: 1, scale: 1 }}
					// exit：组件“卸载前”的动画（透明 + 缩小）
					exit={{ opacity: 0, scale: 0.6 }}
					// className：Tailwind CSS 样式（固定定位、层级、背景、圆角、阴影等）
					className='bg-card pointer-events-none fixed z-100 min-h-[80px] w-[160px] overflow-hidden rounded-3xl p-4 shadow-sm backdrop-blur-sm'
					// style：动态定位（基于鼠标位置 + 偏移量，避免遮挡鼠标）
					style={{
						left: position.x + PREVIEW_OFFSET_PX,
						top: position.y + PREVIEW_OFFSET_PX
					}}>
					{/* 预览图片：占满容器、保持比例、禁止拖拽 */}
					<img src={preview.src} alt='' className='w-full rounded-xl object-cover' draggable={false} />
				</motion.div>
			)}
		</AnimatePresence>
	)
}

// ---------------- 使用示例 ----------------
// 假设这是你的博客列表组件
function BlogList() {
	// 模拟编辑模式状态（实际项目中可能来自 props 或 context）
	const [isEditMode, setIsEditMode] = useState(false)

	// 调用自定义 Hook，获取状态和方法
	const {
		hoverCoverPreview,
		mousePosition,
		onCoverLinkMouseEnter,
		cancelCoverPreview
	} = useBlogCoverHover(isEditMode)

	// 模拟博客数据
	const blogs = [
		{ id: 1, title: '深入理解 React Hooks', cover: 'https://picsum.photos/200/300?random=1' },
		{ id: 2, title: 'Next.js 14 新特性解析', cover: 'https://picsum.photos/200/300?random=2' },
		{ id: 3, title: 'TypeScript 高级类型技巧', cover: 'https://picsum.photos/200/300?random=3' }
	]

	return (
		<div className="max-w-2xl mx-auto p-8">
			{/* 编辑模式切换按钮 */}
			<button
				onClick={() => setIsEditMode(!isEditMode)}
				className="mb-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
			>
				{isEditMode ? '退出编辑模式' : '进入编辑模式'}
			</button>

			{/* 博客列表 */}
			<ul className="space-y-4">
				{blogs.map(blog => (
					<li key={blog.id}>
						{/* 博客链接：绑定鼠标进入/离开事件 */}
						<a
							href={`/blog/${blog.id}`}
							className="text-xl font-medium text-gray-800 hover:text-blue-600 transition-colors"
							// 鼠标进入时：传入封面地址，触发预览倒计时
							onMouseEnter={() => onCoverLinkMouseEnter(blog.cover)}
							// 鼠标离开时：取消预览（清除定时器 + 隐藏预览框）
							onMouseLeave={cancelCoverPreview}
						>
							{blog.title}
						</a>
					</li>
				))}
			</ul>

			{/* 渲染封面预览组件 */}
			<BlogCoverHoverPreview
				preview={hoverCoverPreview}
				position={mousePosition}
			/>
		</div>
	)
}

export default BlogList
