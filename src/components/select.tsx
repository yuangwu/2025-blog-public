// 「use client」 指令：标明此文件是客户端组件，用于 Next.js App Router
'use client'

// cn 是 Tailwind CSS 类名合并工具，通常来自 utils
import { cn } from '@/lib/utils'
// 导入 ReactNode 类型
import type { ReactNode } from 'react'
// 导入 React hooks
import { useEffect, useRef, useState } from 'react'
// 导入 createPortal 用于将 DOM 节点挂载到 body
import { createPortal } from 'react-dom'
// 导入动画组件：AnimatePresence 处理进出场，motion 是动画 DOM 元素
import { AnimatePresence, motion } from 'motion/react'

// 选项数据结构的定义
interface SelectOption {
	value: string      // 选项值
	label: ReactNode   // 选项展示内容（可以是文字或 JSX）
}

// Select 组件的 Props 定义
interface SelectProps {
	value: string
	onChange: (value: string) => void
	options: SelectOption[]
	className?: string
	disabled?: boolean
}

// Select 组件主体
export function Select({ value, onChange, options, className, disabled }: SelectProps) {
	// 控制下拉菜单是否打开
	const [open, setOpen] = useState(false)
	// 是否已客户端挂载（用于确保 Portal 只在客户端执行）
	const [mounted, setMounted] = useState(false)
	// 触发器按钮的引用
	const triggerRef = useRef<HTMLButtonElement>(null)
	// 下拉菜单容器的引用
	const dropdownRef = useRef<HTMLDivElement>(null)
	// 下拉菜单的绝对定位坐标（相对于 viewport 的 top/left 和宽度）
	const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })

	// 当前选中的选项对象，找不到时降级为第一个选项
	const selectedOption = options.find(opt => opt.value === value) || options[0]

	// 仅在客户端挂载后将 mounted 置为 true，防止服务端报错
	useEffect(() => {
		setMounted(true)
	}, [])

	// 当下拉菜单打开时，根据触发器位置计算下拉菜单的坐标
	useEffect(() => {
		if (open && triggerRef.current) {
			const rect = triggerRef.current.getBoundingClientRect()
			setPosition({
				top: rect.bottom + 8, // 距离触发器底部 8px 间隙
				left: rect.left,
				width: rect.width
			})
		}
	}, [open])

	// 监听全局事件：点击外部关闭、ESC 关闭、滚动/窗口大小变化时重新计算位置
	useEffect(() => {
		if (!open) return

		// 更新下拉菜单位置的辅助函数
		const updatePosition = () => {
			if (triggerRef.current) {
				const rect = triggerRef.current.getBoundingClientRect()
				setPosition({
					top: rect.bottom + 8,
					left: rect.left,
					width: rect.width
				})
			}
		}

		// 点击外部区域关闭下拉菜单
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Node
			if (
				triggerRef.current &&
				!triggerRef.current.contains(target) &&
				dropdownRef.current &&
				!dropdownRef.current.contains(target)
			) {
				setOpen(false)
			}
		}

		// 按下 Escape 键关闭下拉菜单
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setOpen(false)
			}
		}

		// 滚动时更新位置
		const handleScroll = () => {
			updatePosition()
		}

		// 窗口大小变化时更新位置
		const handleResize = () => {
			updatePosition()
		}

		// 绑定全局事件
		document.addEventListener('mousedown', handleClickOutside)
		document.addEventListener('keydown', handleEscape)
		// scroll 使用捕获阶段，确保能捕获到任意滚动
		window.addEventListener('scroll', handleScroll, true)
		window.addEventListener('resize', handleResize)

		// 清理函数：移除所有事件监听
		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
			document.removeEventListener('keydown', handleEscape)
			window.removeEventListener('scroll', handleScroll, true)
			window.removeEventListener('resize', handleResize)
		}
	}, [open])

	// 选项点击处理：通知父组件值变化并关闭菜单
	const handleSelect = (optionValue: string) => {
		onChange(optionValue)
		setOpen(false)
	}

	return (
		<>
			{/* 触发器按钮 */}
			<button
				ref={triggerRef}
				type='button'
				// 禁用时不触发点击
				onClick={() => !disabled && setOpen(!open)}
				disabled={disabled}
				className={cn(
					'bg-card relative flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition-all',
					'active:scale-[0.98]', // 按压缩放反馈
					'focus:ring-brand/20 focus:ring-2 focus:outline-none', // 聚焦环
					disabled && 'cursor-not-allowed opacity-50', // 禁用样式
					!disabled && 'hover:bg-card/80', // 可悬停样式
					className // 外部传入的自定义类名
				)}>
				{/* 展示当前选中项的 label */}
				<span className='flex-1 text-left'>{selectedOption?.label}</span>
				{/* 下拉箭头图标，打开时旋转 180° */}
				<svg
					className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')}
					fill='none'
					viewBox='0 0 24 24'
					stroke='currentColor'
					strokeWidth={2}>
					<path strokeLinecap='round' strokeLinejoin='round' d='M19 9l-7 7-7-7' />
				</svg>
			</button>

			{/* 仅在客户端挂载后通过 Portal 渲染下拉菜单，避免 SSR 问题 */}
			{mounted &&
				createPortal(
					// AnimatePresence 提供组件卸载时的退出动画
					<AnimatePresence>
						{open && (
							<motion.div
								ref={dropdownRef}
								// 入场动画：透明、向上偏移、缩小
								initial={{ opacity: 0, y: -8, scale: 0.95 }}
								animate={{ opacity: 1, y: 0, scale: 1 }}
								// 出场动画：透明、向上偏移、缩小
								exit={{ opacity: 0, y: -8, scale: 0.95 }}
								// 动画过渡参数：时间 0.2s，缓动曲线
								transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
								// 样式：固定定位、半透明背景、边框、毛玻璃效果、阴影
								className='bg-card/95 fixed z-50 rounded-xl border backdrop-blur-xl'
								style={{
									top: `${position.top}px`,
									left: `${position.left}px`,
									width: `${position.width}px`,
									boxShadow:
										'0 12px 40px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
								}}>
								{/* 选项滚动区域，隐藏滚动条 */}
								<div className='scrollbar-none max-h-64 overflow-y-auto p-1.5'>
									{options.map(option => {
										const isSelected = option.value === value
										return (
											<button
												key={option.value}
												type='button'
												onClick={() => handleSelect(option.value)}
												className={cn(
													'w-full rounded-lg px-3 py-2 text-left text-xs transition-all',
													'active:scale-[0.98]',
													// 选中项高亮样式，未选中项悬停背景
													isSelected
														? 'bg-brand/10 text-brand font-medium'
														: 'hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
												)}>
												{option.label}
											</button>
										)
									})}
								</div>
							</motion.div>
						)}
					</AnimatePresence>,
					document.body // 挂载到 body 下，避免定位受父元素影响
				)}
		</>
	)
}