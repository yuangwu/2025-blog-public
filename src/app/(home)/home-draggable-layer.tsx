'use client' // 标记该组件为客户端组件，在 Next.js App Router 中使用

import { useRef, useCallback } from 'react'
import { useCenterStore } from '@/hooks/use-center'
import { useLayoutEditStore } from './stores/layout-edit-store'
import type { CardStyles } from './stores/config-store'
import DraggerSVG from '@/svgs/dragger.svg' // 导入拖拽手柄的 SVG 图标

type CardKey = keyof CardStyles // 卡片键类型，取自 CardStyles 的字段名

/**
 * HomeDraggableLayer 组件属性
 * @param cardKey - 当前卡片对应的样式键名
 * @param x - 卡片在页面上的 X 坐标
 * @param y - 卡片在页面上的 Y 坐标
 * @param width - 可选，卡片宽度（编辑模式下用于缩放）
 * @param height - 可选，卡片高度（编辑模式下用于缩放）
 * @param children - 要包裹的子内容（实际卡片内容）
 */
interface HomeDraggableLayerProps {
	cardKey: CardKey
	x: number
	y: number
	width?: number
	height?: number
	children: React.ReactNode
}

/**
 * 拖拽状态
 * @param dragging - 是否正在拖拽中
 * @param startX - 拖拽开始时的鼠标/触摸点 X
 * @param startY - 拖拽开始时的鼠标/触摸点 Y
 * @param initialOffsetX - 拖拽前卡片相对于中心点的 X 偏移
 * @param initialOffsetY - 拖拽前卡片相对于中心点的 Y 偏移
 */
interface DragState {
	dragging: boolean
	startX: number
	startY: number
	initialOffsetX: number
	initialOffsetY: number
}

/**
 * 缩放状态
 * @param resizing - 是否正在缩放中
 * @param startX - 缩放开始时的鼠标/触摸点 X
 * @param startY - 缩放开始时的鼠标/触摸点 Y
 * @param initialWidth - 缩放开始时的初始宽度
 * @param initialHeight - 缩放开始时的初始高度
 */
interface ResizeState {
	resizing: boolean
	startX: number
	startY: number
	initialWidth: number
	initialHeight: number
}

/**
 * 可拖拽 / 可缩放的编辑层组件
 * 在编辑模式下显示一个可拖拽移动、右下角可缩放大小的虚线边框容器
 * 非编辑模式下仅渲染子内容
 */
export function HomeDraggableLayer({
	cardKey,
	x,
	y,
	width,
	height,
	children
}: HomeDraggableLayerProps) {
	// 获取当前是否为编辑模式
	const editing = useLayoutEditStore(state => state.editing)
	// 获取设置偏移量的方法
	const setOffset = useLayoutEditStore(state => state.setOffset)
	// 获取设置尺寸的方法
	const setSize = useLayoutEditStore(state => state.setSize)
	// 获取当前视图中心坐标，用于计算卡片相对偏移
	const center = useCenterStore()

	// 拖拽状态的引用，避免频繁重渲染
	const dragStateRef = useRef<DragState>({
		dragging: false,
		startX: 0,
		startY: 0,
		initialOffsetX: 0,
		initialOffsetY: 0
	})

	// 缩放状态的引用
	const resizeStateRef = useRef<ResizeState>({
		resizing: false,
		startX: 0,
		startY: 0,
		initialWidth: 0,
		initialHeight: 0
	})

	/**
	 * 鼠标移动处理器（拖拽中）
	 * 根据鼠标当前位置与起始位置的差值，计算新的偏移量并更新 store
	 */
	const handleMouseMove = useCallback(
		(event: MouseEvent) => {
			const state = dragStateRef.current
			if (!state.dragging) return

			const dx = event.clientX - state.startX
			const dy = event.clientY - state.startY

			const nextOffsetX = Math.round(state.initialOffsetX + dx)
			const nextOffsetY = Math.round(state.initialOffsetY + dy)

			setOffset(cardKey, nextOffsetX, nextOffsetY)
		},
		[cardKey, setOffset]
	)

	/**
	 * 触摸移动处理器（拖拽中）
	 * 逻辑与鼠标移动相同，但使用触摸事件的位置
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
	 * 拖拽结束处理器（鼠标松开、触摸结束、触摸取消）
	 * 停止拖拽并清理所有全局事件监听
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
	 * 缩放时的鼠标移动处理器
	 * 根据鼠标移动距离计算新宽度和高度（最小 50px）
	 */
	const handleResizeMouseMove = useCallback(
		(event: MouseEvent) => {
			const state = resizeStateRef.current
			if (!state.resizing) return

			const dx = event.clientX - state.startX
			const dy = event.clientY - state.startY

			const nextWidth = Math.max(50, Math.round(state.initialWidth + dx))
			const nextHeight = Math.max(50, Math.round(state.initialHeight + dy))

			setSize(cardKey, nextWidth, nextHeight)
		},
		[cardKey, setSize]
	)

	/**
	 * 缩放时的触摸移动处理器
	 * 逻辑与鼠标缩放相同
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
	 * 缩放结束处理器
	 * 重置缩放状态并移除全局监听
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
	 * 开始缩放
	 * 只在编辑模式且尺寸存在时执行，记录初始状态并绑定全局事件
	 */
	const startResize = useCallback(
		(clientX: number, clientY: number) => {
			if (!editing || width === undefined || height === undefined) return

			resizeStateRef.current = {
				resizing: true,
				startX: clientX,
				startY: clientY,
				initialWidth: width,
				initialHeight: height
			}

			window.addEventListener('mousemove', handleResizeMouseMove)
			window.addEventListener('mouseup', handleResizeEnd)
			window.addEventListener('touchmove', handleResizeTouchMove)
			window.addEventListener('touchend', handleResizeEnd)
			window.addEventListener('touchcancel', handleResizeEnd)
		},
		[editing, width, height, handleResizeMouseMove, handleResizeEnd, handleResizeTouchMove]
	)

	/**
	 * 鼠标按下缩放手柄时触发
	 * 阻止默认行为和事件冒泡，调用 startResize
	 */
	const handleResizeMouseDown: React.MouseEventHandler<HTMLDivElement> = event => {
		event.preventDefault()
		event.stopPropagation()
		startResize(event.clientX, event.clientY)
	}

	/**
	 * 触摸开始缩放手柄时触发
	 * 同样阻止默认行为和冒泡，使用第一个触摸点坐标
	 */
	const handleResizeTouchStart: React.TouchEventHandler<HTMLDivElement> = event => {
		const touch = event.touches[0]
		if (!touch) return
		event.preventDefault()
		event.stopPropagation()
		startResize(touch.clientX, touch.clientY)
	}

	/**
	 * 开始拖拽
	 * 仅在编辑模式下有效，记录当前偏移量作为初始值，绑定全局移动与结束事件
	 */
	const startDrag = useCallback(
		(clientX: number, clientY: number) => {
			if (!editing) return

			const initialOffsetX = x - center.x
			const initialOffsetY = y - center.y

			dragStateRef.current = {
				dragging: true,
				startX: clientX,
				startY: clientY,
				initialOffsetX,
				initialOffsetY
			}

			window.addEventListener('mousemove', handleMouseMove)
			window.addEventListener('mouseup', handleEnd)
			window.addEventListener('touchmove', handleTouchMove)
			window.addEventListener('touchend', handleEnd)
			window.addEventListener('touchcancel', handleEnd)
		},
		[editing, x, y, center.x, center.y, handleMouseMove, handleEnd, handleTouchMove]
	)

	/**
	 * 鼠标按下拖拽区域时触发
	 * 阻止默认行为后调用 startDrag
	 */
	const handleMouseDown: React.MouseEventHandler<HTMLDivElement> = event => {
		event.preventDefault()
		startDrag(event.clientX, event.clientY)
	}

	/**
	 * 触摸开始拖拽区域时触发
	 * 获取第一个触摸点坐标并开始拖拽
	 */
	const handleTouchStart: React.TouchEventHandler<HTMLDivElement> = event => {
		const touch = event.touches[0]
		if (!touch) return
		startDrag(touch.clientX, touch.clientY)
	}

	// 是否允许缩放：编辑模式且宽度和高度均存在
	const canResize = editing && width !== undefined && height !== undefined

	return (
		<>
			{/* 编辑模式下渲染可拖拽/缩放的虚线边框层 */}
			{editing && (
				<div
					className='border-brand/70 bg-brand/5 pointer-events-auto absolute z-40 cursor-move rounded-[40px] border border-dashed'
					style={{ left: x, top: y, width, height }}
					onMouseDown={handleMouseDown}
					onTouchStart={handleTouchStart}>
					{/* 透明占位层，避免子内容干扰拖拽事件 */}
					<div className='pointer-events-none h-full w-full' />
					{/* 右下角缩放手柄，仅在可缩放时显示 */}
					{canResize && (
						<div
							className='absolute right-0 bottom-0 z-50 translate-x-1 translate-y-1 cursor-nwse-resize hover:scale-110'
							onMouseDown={handleResizeMouseDown}
							onTouchStart={handleResizeTouchStart}>
							<DraggerSVG className='text-brand size-5' />
						</div>
					)}
				</div>
			)}
			{/* 实际卡片内容，始终渲染 */}
			{children}
		</>
	)
}
