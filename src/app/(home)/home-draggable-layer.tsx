'use client'

import { useRef, useCallback } from 'react'
import { useCenterStore } from '@/hooks/use-center'
import { useLayoutEditStore } from './stores/layout-edit-store'
import type { CardStyles } from './stores/config-store'
import DraggerSVG from '@/svgs/dragger.svg'

// 卡片的键名类型，取自 CardStyles 的所有属性名
type CardKey = keyof CardStyles

// 组件接收的属性
interface HomeDraggableLayerProps {
	cardKey: CardKey        // 当前卡片的标识键
	x: number               // 卡片在页面上的 x 坐标（像素）
	y: number               // 卡片在页面上的 y 坐标（像素）
	width?: number          // 卡片宽度（像素），若未传入则不可调整大小
	height?: number         // 卡片高度（像素），若未传入则不可调整大小
	children: React.ReactNode // 卡片内部渲染的内容
}

// 拖拽状态数据
interface DragState {
	dragging: boolean       // 是否正在拖拽
	startX: number          // 拖拽开始时鼠标/触摸点的 x 坐标
	startY: number          // 拖拽开始时鼠标/触摸点的 y 坐标
	initialOffsetX: number  // 拖拽开始前卡片相对于中心的 x 偏移
	initialOffsetY: number  // 拖拽开始前卡片相对于中心的 y 偏移
}

// 调整大小状态数据
interface ResizeState {
	resizing: boolean       // 是否正在调整大小
	startX: number          // 调整开始时鼠标/触摸点的 x 坐标
	startY: number          // 调整开始时鼠标/触摸点的 y 坐标
	initialWidth: number    // 调整开始前卡片的宽度
	initialHeight: number   // 调整开始前卡片的高度
}

/**
 * 可拖拽和可调整大小的卡片层组件。
 * 在编辑模式下显示一个虚线边框的拖拽/缩放区域，允许用户移动卡片位置和改变卡片尺寸。
 * 所有位置计算均以中心点（centerStore 提供）为基准进行偏移计算。
 */
export function HomeDraggableLayer({ cardKey, x, y, width, height, children }: HomeDraggableLayerProps) {
	// 获取当前是否处于编辑模式
	const editing = useLayoutEditStore(state => state.editing)
	// 更新卡片相对于中心点偏移量的方法
	const setOffset = useLayoutEditStore(state => state.setOffset)
	// 更新卡片尺寸的方法
	const setSize = useLayoutEditStore(state => state.setSize)
	// 获取中心点坐标（窗口内的参照点）
	const center = useCenterStore()

	// 拖拽状态的引用，使用 ref 避免重复渲染
	const dragStateRef = useRef<DragState>({
		dragging: false,
		startX: 0,
		startY: 0,
		initialOffsetX: 0,
		initialOffsetY: 0
	})

	// 调整大小状态的引用，使用 ref 避免重复渲染
	const resizeStateRef = useRef<ResizeState>({
		resizing: false,
		startX: 0,
		startY: 0,
		initialWidth: 0,
		initialHeight: 0
	})

	/**
	 * 鼠标移动时的处理函数，用于更新拖拽偏移量。
	 * 通过计算鼠标当前位置与拖拽起始点的差值，得到新的偏移量并设置。
	 */
	const handleMouseMove = useCallback(
		(event: MouseEvent) => {
			const state = dragStateRef.current
			if (!state.dragging) return

			// 鼠标移动的距离
			const dx = event.clientX - state.startX
			const dy = event.clientY - state.startY

			// 新的相对中心偏移量（四舍五入到整数像素）
			const nextOffsetX = Math.round(state.initialOffsetX + dx)
			const nextOffsetY = Math.round(state.initialOffsetY + dy)

			setOffset(cardKey, nextOffsetX, nextOffsetY)
		},
		[cardKey, setOffset]
	)

	/**
	 * 触摸移动时的处理函数，逻辑与鼠标移动一致，但采用第一个触摸点。
	 */
	const handleTouchMove = useCallback(
		(event: TouchEvent) => {
			const touch = event.touches[0]
			if (!touch) return

			const state = dragStateRef.current
			if (!state.dragging) return

			const dx = touch.clientX - state.startX
			const dy = touch.clientY - state.startY

			const nextOffsetX = Math.round(state.initialOffsetX + dx)
			const nextOffsetY = Math.round(state.initialOffsetY + dy)

			setOffset(cardKey, nextOffsetX, nextOffsetY)
		},
		[cardKey, setOffset]
	)

	/**
	 * 拖拽结束的处理函数（鼠标或触摸结束/取消时调用）。
	 * 清理全局事件监听，并重置拖拽状态。
	 */
	const handleEnd = useCallback(() => {
		dragStateRef.current.dragging = false
		window.removeEventListener('mousemove', handleMouseMove)
		window.removeEventListener('mouseup', handleEnd)
		window.removeEventListener('touchmove', handleTouchMove)
		window.removeEventListener('touchend', handleEnd)
		window.removeEventListener('touchcancel', handleEnd)
	}, [handleMouseMove, handleTouchMove])

	/**
	 * 调整大小过程中的鼠标移动处理函数。
	 * 根据鼠标移动距离计算新的宽度和高度，并限制最小值为 50px。
	 */
	const handleResizeMouseMove = useCallback(
		(event: MouseEvent) => {
			const state = resizeStateRef.current
			if (!state.resizing) return

			const dx = event.clientX - state.startX
			const dy = event.clientY - state.startY

			// 新尺寸至少为 50 像素，防止卡片过小
			const nextWidth = Math.max(50, Math.round(state.initialWidth + dx))
			const nextHeight = Math.max(50, Math.round(state.initialHeight + dy))

			setSize(cardKey, nextWidth, nextHeight)
		},
		[cardKey, setSize]
	)

	/**
	 * 调整大小过程中的触摸移动处理函数，逻辑与鼠标版本相同。
	 */
	const handleResizeTouchMove = useCallback(
		(event: TouchEvent) => {
			const touch = event.touches[0]
			if (!touch) return

			const state = resizeStateRef.current
			if (!state.resizing) return

			const dx = touch.clientX - state.startX
			const dy = touch.clientY - state.startY

			const nextWidth = Math.max(50, Math.round(state.initialWidth + dx))
			const nextHeight = Math.max(50, Math.round(state.initialHeight + dy))

			setSize(cardKey, nextWidth, nextHeight)
		},
		[cardKey, setSize]
	)

	/**
	 * 调整大小结束的处理函数（鼠标或触摸结束/取消时调用）。
	 * 清理全局事件监听，并重置调整大小状态。
	 */
	const handleResizeEnd = useCallback(() => {
		resizeStateRef.current.resizing = false
		window.removeEventListener('mousemove', handleResizeMouseMove)
		window.removeEventListener('mouseup', handleResizeEnd)
		window.removeEventListener('touchmove', handleResizeTouchMove)
		window.removeEventListener('touchend', handleResizeEnd)
		window.removeEventListener('touchcancel', handleResizeEnd)
	}, [handleResizeMouseMove, handleResizeTouchMove])

	/**
	 * 开始调整卡片大小。
	 * 保存当前尺寸和起始点坐标，并注册全局事件监听。
	 * @param clientX 起始鼠标/触摸点的 x 坐标
	 * @param clientY 起始鼠标/触摸点的 y 坐标
	 */
	const startResize = useCallback(
		(clientX: number, clientY: number) => {
			// 非编辑模式或未定义尺寸时不允许调整大小
			if (!editing || width === undefined || height === undefined) return

			resizeStateRef.current = {
				resizing: true,
				startX: clientX,
				startY: clientY,
				initialWidth: width,
				initialHeight: height
			}

			// 绑定全局事件以跟踪鼠标/触摸移动和结束
			window.addEventListener('mousemove', handleResizeMouseMove)
			window.addEventListener('mouseup', handleResizeEnd)
			window.addEventListener('touchmove', handleResizeTouchMove)
			window.addEventListener('touchend', handleResizeEnd)
			window.addEventListener('touchcancel', handleResizeEnd)
		},
		[editing, width, height, handleResizeMouseMove, handleResizeEnd, handleResizeTouchMove]
	)

	/**
	 * 鼠标按下调整大小手柄的事件处理。
	 * 阻止事件冒泡和默认行为，以防触发拖拽或其他交互。
	 */
	const handleResizeMouseDown: React.MouseEventHandler<HTMLDivElement> = event => {
		event.preventDefault()
		event.stopPropagation()
		startResize(event.clientX, event.clientY)
	}

	/**
	 * 触摸开始调整大小手柄的事件处理。
	 */
	const handleResizeTouchStart: React.TouchEventHandler<HTMLDivElement> = event => {
		const touch = event.touches[0]
		if (!touch) return
		event.preventDefault()
		event.stopPropagation()
		startResize(touch.clientX, touch.clientY)
	}

	/**
	 * 开始拖拽卡片。
	 * 记录起始偏移量（卡片坐标相对于中心点的差值）和当前坐标，并注册全局事件监听。
	 * @param clientX 起始鼠标/触摸点的 x 坐标
	 * @param clientY 起始鼠标/触摸点的 y 坐标
	 */
	const startDrag = useCallback(
		(clientX: number, clientY: number) => {
			if (!editing) return

			// 计算卡片相对于中心点的初始偏移量
			const initialOffsetX = x - center.x
			const initialOffsetY = y - center.y

			dragStateRef.current = {
				dragging: true,
				startX: clientX,
				startY: clientY,
				initialOffsetX,
				initialOffsetY
			}

			// 绑定全局事件以持续跟踪移动和结束
			window.addEventListener('mousemove', handleMouseMove)
			window.addEventListener('mouseup', handleEnd)
			window.addEventListener('touchmove', handleTouchMove)
			window.addEventListener('touchend', handleEnd)
			window.addEventListener('touchcancel', handleEnd)
		},
		[editing, x, y, center.x, center.y, handleMouseMove, handleEnd, handleTouchMove]
	)

	/**
	 * 鼠标按下拖拽区域的事件处理。
	 * 阻止默认行为（如图片拖拽等），并开始拖拽。
	 */
	const handleMouseDown: React.MouseEventHandler<HTMLDivElement> = event => {
		event.preventDefault()
		startDrag(event.clientX, event.clientY)
	}

	/**
	 * 触摸开始拖拽区域的事件处理。
	 */
	const handleTouchStart: React.TouchEventHandler<HTMLDivElement> = event => {
		const touch = event.touches[0]
		if (!touch) return
		startDrag(touch.clientX, touch.clientY)
	}

	// 是否可以调整大小：编辑模式开启且宽度和高度均已定义
	const canResize = editing && width !== undefined && height !== undefined

	return (
		<>
			{/* 编辑模式下显示可交互的拖拽/缩放图层 */}
			{editing && (
				<div
					// 虚线边框，半透明背景，绝对定位，指针事件自动，可移动光标
					className='border-brand/70 bg-brand/5 pointer-events-auto absolute z-40 cursor-move rounded-[40px] border border-dashed'
					style={{ left: x, top: y, width, height }}
					onMouseDown={handleMouseDown}
					onTouchStart={handleTouchStart}>
					{/* 内部占位区域，阻止点击穿透到子元素 */}
					<div className='pointer-events-none h-full w-full' />
					{/* 调整大小的拖动手柄，仅在可以调整大小时渲染 */}
					{canResize && (
						<div
							// 定位在右下角，偏移使图标更直观，hover 时放大
							className='absolute right-0 bottom-0 z-50 translate-x-1 translate-y-1 cursor-nwse-resize hover:scale-110'
							onMouseDown={handleResizeMouseDown}
							onTouchStart={handleResizeTouchStart}>
							{/* 拖拽图标 SVG */}
							<DraggerSVG className='text-brand size-5' />
						</div>
					)}
				</div>
			)}
			{/* 卡片内容，始终渲染 */}
			{children}
		</>
	)
}