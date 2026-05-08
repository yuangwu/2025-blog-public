'use client'

// 导入 cn 工具函数，通常用于合并 Tailwind CSS 类名
// 注意：部署前请确保 @/lib/utils 文件存在并正确导出了 cn 函数
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// 从 motion/react 导入动画组件，确保项目已安装 motion 包
import { AnimatePresence, motion } from 'motion/react'

// 下拉选项的类型定义
interface SelectOption {
	value: string // 选项的值
	label: ReactNode // 选项的显示内容，可以是字符串或 JSX
}

// Select 组件的 Props 类型
interface SelectProps {
	value: string // 当前选中的值
	onChange: (value: string) => void // 值变化时的回调
	options: SelectOption[] // 下拉选项列表
	className?: string // 外部传入的额外样式类名
	disabled?: boolean // 是否禁用下拉组件
}

export function Select({ value, onChange, options, className, disabled }: SelectProps) {
	const [open, setOpen] = useState(false) // 下拉框是否打开
	const [mounted, setMounted] = useState(false) // 是否已完成客户端挂载，用于安全使用 Portal
	const triggerRef = useRef<HTMLButtonElement>(null) // 触发按钮的引用，用于定位
	const dropdownRef = useRef<HTMLDivElement>(null) // 下拉框容器的引用，用于点击外部检测
	// 下拉框的定位坐标和宽度
	const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })

	// 根据当前 value 找到对应的选项对象，找不到则取第一个作为默认显示
	const selectedOption = options.find(opt => opt.value === value) || options[0]

	// 组件挂载后，将 mounted 设为 true，确保 Portal 只在客户端渲染，避免服务端渲染错误
	useEffect(() => {
		setMounted(true)
	}, [])

	// 当下拉框打开时，根据触发按钮的位置计算下拉框的坐标
	useEffect(() => {
		if (open && triggerRef.current) {
			const rect = triggerRef.current.getBoundingClientRect()
			setPosition({
				top: rect.bottom + 8, // 距离按钮底部 8px
				left: rect.left, // 左边缘对齐
				width: rect.width // 宽度与按钮一致
			})
		}
	}, [open])

	// 下拉框打开时，注册全局事件监听（点击外部关闭、ESC关闭、滚动/窗口大小变化时更新位置）
	useEffect(() => {
		if (!open) return

		// 更新下拉框位置，绑定到滚动和窗口大小变化时调用
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

		// 点击下拉框和触发按钮之外的地方时，关闭下拉框
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

		// 按下 Escape 键关闭下拉框
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setOpen(false)
			}
		}

		const handleScroll = () => {
			updatePosition()
		}

		const handleResize = () => {
			updatePosition()
		}

		// 注册事件监听，使用 mousedown 以便更及时地响应
		document.addEventListener('mousedown', handleClickOutside)
		document.addEventListener('keydown', handleEscape)
		// 使用捕获阶段监听滚动，确保能捕获到所有内部滚动事件
		window.addEventListener('scroll', handleScroll, true)
		window.addEventListener('resize', handleResize)

		// 清理函数，组件卸载或 open 变化时移除事件监听
		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
			document.removeEventListener('keydown', handleEscape)
			window.removeEventListener('scroll', handleScroll, true)
			window.removeEventListener('resize', handleResize)
		}
	}, [open])

	// 点击选项时的处理，更新值并关闭下拉框
	const handleSelect = (optionValue: string) => {
		onChange(optionValue)
		setOpen(false)
	}

	return (
		<>
			{/* 触发按钮，点击展开/收起下拉框 */}
			<button
				ref={triggerRef}
				type='button'
				onClick={() => !disabled && setOpen(!open)}
				disabled={disabled}
				className={cn(
					// 基础样式：卡片背景、相对定位、弹性布局、圆角边框、小字号
					'bg-card relative flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition-all',
					// 点击时轻微缩小，提供触觉反馈
					'active:scale-[0.98]',
					// 获得焦点时的品牌色环
					'focus:ring-brand/20 focus:ring-2 focus:outline-none',
					// 禁用状态样式
					disabled && 'cursor-not-allowed opacity-50',
					// 非禁用时悬停效果
					!disabled && 'hover:bg-card/80',
					// 允许从外部传入自定义类名
					className
				)}>
				{/* 显示当前选中项的 label，占据剩余空间并左对齐 */}
				<span className='flex-1 text-left'>{selectedOption?.label}</span>
				{/* 下拉箭头图标，打开时旋转180度 */}
				<svg
					className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')}
					fill='none'
					viewBox='0 0 24 24'
					stroke='currentColor'
					strokeWidth={2}>
					<path strokeLinecap='round' strokeLinejoin='round' d='M19 9l-7 7-7-7' />
				</svg>
			</button>

			{/* 使用 Portal 将下拉框渲染到 body 中，避免被父容器的 overflow 裁剪 */}
			{mounted &&
				createPortal(
					<AnimatePresence>
						{open && (
							<motion.div
								ref={dropdownRef}
								// 入场/出场动画：淡入、向上滑入、缩放
								initial={{ opacity: 0, y: -8, scale: 0.95 }}
								animate={{ opacity: 1, y: 0, scale: 1 }}
								exit={{ opacity: 0, y: -8, scale: 0.95 }}
								transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
								className='bg-card/95 fixed z-50 rounded-xl border backdrop-blur-xl'
								style={{
									// 使用计算出的位置和宽度进行绝对定位
									top: `${position.top}px`,
									left: `${position.left}px`,
									width: `${position.width}px`,
									// 自定义阴影增强立体感
									boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
								}}>
								{/* 选项列表滚动容器，隐藏滚动条（需配合 scrollbar-none 类） */}
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
													// 选中项高亮样式
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
					document.body // 渲染到 body 最外层，保证层级与定位正确
				)}
		</>
	)
}
