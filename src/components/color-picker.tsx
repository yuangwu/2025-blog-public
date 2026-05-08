'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { ColorPickerPanel } from './color-picker-panel'

// ColorPicker 组件的属性接口定义
interface ColorPickerProps {
	value?: string          // 当前颜色值，默认 '#000000'
	onChange?: (color: string) => void  // 颜色改变时的回调函数
	className?: string      // 自定义类名，用于外部样式定制
}

/**
 * 颜色选择器触发器组件
 * 点击后会在触发器附近弹出颜色选择面板（使用 Portal 渲染到 body）
 */
export function ColorPicker({ value = '#000000', onChange, className }: ColorPickerProps) {
	// 控制面板是否打开
	const [open, setOpen] = useState(false)
	// 标记组件是否已经挂载（确保只在客户端渲染 Portal）
	const [mounted, setMounted] = useState(false)
	// 触发器按钮的引用
	const triggerRef = useRef<HTMLButtonElement>(null)
	// 面板容器（Portal 内部包裹层）的引用，用于外部点击判断
	const panelRef = useRef<HTMLDivElement>(null)
	// 面板的定位坐标
	const [position, setPosition] = useState({ top: 0, left: 0 })

	// 组件挂载后设置 mounted 状态，表示可以安全使用 Portal
	useEffect(() => {
		setMounted(true)
	}, [])

	// 当面板打开时，计算面板的位置
	useEffect(() => {
		if (open && triggerRef.current) {
			const rect = triggerRef.current.getBoundingClientRect()
			const panelHeight = 240 // 预估面板高度，可根据实际调整
			// 默认将面板放置在触发器上方
			let top = rect.top - panelHeight
			// 如果上方空间不足，则放置在触发器下方
			if (top < 0) {
				top = rect.bottom
			}
			setPosition({
				top,
				left: rect.left
			})
		}
	}, [open])

	// 处理面板外部点击关闭
	useEffect(() => {
		if (!open) return

		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Node
			// 如果点击的是触发按钮本身，不做任何处理
			if (triggerRef.current && triggerRef.current.contains(target)) {
				return
			}
			// 如果点击的是面板内部，也不关闭
			if (panelRef.current && panelRef.current.contains(target)) {
				return
			}
			// 其他情况关闭面板
			setOpen(false)
		}

		// 使用 mousedown 事件来更早地捕获外部点击
		document.addEventListener('mousedown', handleClickOutside)
		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [open])

	return (
		<>
			{/* 颜色触发器按钮 */}
			<button
				ref={triggerRef}
				type='button'
				onClick={() => setOpen(!open)}
				className={cn(
					'h-10 w-10 rounded-lg border-2 border-white/20 shadow-sm transition-all hover:scale-105',
					className
				)}
				style={{ backgroundColor: value }}
			>
				{/* 屏幕阅读器专用文字 */}
				<span className='sr-only'>Select color</span>
			</button>

			{/* 使用 Portal 渲染颜色选择面板到 body，确保层级和位置正确 */}
			{mounted &&
				open &&
				createPortal(
					// 外层包裹 div 用于位置计算和外部点击检测
					<div ref={panelRef}>
						<ColorPickerPanel
							value={value}
							onChange={onChange}
							style={{
								position: 'fixed',
								top: `${position.top}px`,
								left: `${position.left}px`,
								zIndex: 1000
							}}
						/>
					</div>,
					document.body
				)}
		</>
	)
}
