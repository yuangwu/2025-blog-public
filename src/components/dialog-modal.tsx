'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'

// 定义对话框模态框的 Props 类型
interface DialogModalProps {
	open: boolean // 对话框是否打开
	onClose: () => void // 关闭对话框的回调
	children: ReactNode // 对话框内部内容
	className?: string // 对话框容器的额外样式类名
	overlayClassName?: string // 遮罩层的额外样式类名（当前未使用，可扩展）
	disableCloseOnOverlay?: boolean // 是否禁用点击遮罩关闭对话框，默认 false
	lockScroll?: boolean // 是否锁定背景滚动，默认 true
	closeOnEsc?: boolean // 是否允许 ESC 键关闭对话框，默认 true
}

export function DialogModal({
	open,
	onClose,
	children,
	className,
	disableCloseOnOverlay = false,
	lockScroll = true,
	closeOnEsc = true,
}: DialogModalProps) {
	// 标记组件是否已在客户端挂载，用于避免 SSR 与 Portal 的冲突
	const [mounted, setMounted] = useState(false)

	// 仅在客户端挂载后设置 mounted 为 true，确保 createPortal 只在下游客户端执行
	useEffect(() => {
		setMounted(true)
	}, [])

	// 当 lockScroll 且对话框打开时，锁定 body 的滚动，关闭时恢复之前的 overflow 值
	useEffect(() => {
		if (!lockScroll || !open) return
		const previous = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		return () => {
			document.body.style.overflow = previous
		}
	}, [lockScroll, open])

	// 当 closeOnEsc 开启且对话框打开时，监听键盘 Escape 键，触发 onClose
	useEffect(() => {
		if (!closeOnEsc || !open) return
		const handler = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose()
			}
		}
		window.addEventListener('keydown', handler)
		return () => {
			window.removeEventListener('keydown', handler)
		}
	}, [closeOnEsc, onClose, open])

	// 在客户端挂载完成前不渲染任何内容，避免水合错误
	if (!mounted) return null

	// 使用 Portal 将对话框渲染到 document.body，避免 CSS 层叠上下文干扰
	return createPortal(
		// AnimatePresence 用于在组件卸载时保持退出动画
		<AnimatePresence>
			{open && (
				// 遮罩层，点击遮罩默认关闭对话框（可通过 disableCloseOnOverlay 控制）
				<motion.div
					initial={{ opacity: 0 }} // 初始透明
					animate={{ opacity: 1 }} // 显现动画
					exit={{ opacity: 0 }} // 退出动画
					className={'fixed inset-0 z-50 flex items-center justify-center bg-card p-4 backdrop-blur-xl'}
					onClick={disableCloseOnOverlay ? undefined : onClose}
				>
					{/* 对话框主体内容容器，阻止点击事件冒泡到遮罩层 */}
					<motion.div
						initial={{ opacity: 0, scale: 0.8, y: 20 }} // 初始：透明、缩小、向下偏移
						animate={{ opacity: 1, scale: 1, y: 0 }} // 动画进入正常状态
						exit={{ opacity: 0, scale: 0.8, y: 20 }} // 退出时回到初始状态
						className={cn('static', className)} // 合并样式，允许外部传入自定义类名
						onClick={e => e.stopPropagation()}
					>
						{children}
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>,
		document.body // 挂载目标为 body 末尾
	)
}
