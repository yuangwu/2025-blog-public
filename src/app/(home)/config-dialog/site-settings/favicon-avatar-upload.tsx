// 标记这是一个 React 客户端组件（Next.js 13+ App Router 语法）
'use client'

// 导入 React 的 useRef 钩子，用于获取 DOM 元素引用
import { useRef } from 'react'
// 导入 sonner 库的 toast 组件，用于显示消息提示
import { toast } from 'sonner'
// 导入自定义的文件 SHA256 哈希计算函数
import { hashFileSHA256 } from '@/lib/file-utils'
// 导入类型定义 FileItem
import type { FileItem } from './types'

// 定义组件的 Props 接口
interface FaviconAvatarUploadProps {
	// 当前选中的 Favicon 文件项
	faviconItem: FileItem | null
	// 更新 Favicon 文件项的状态函数
	setFaviconItem: React.Dispatch<React.SetStateAction<FileItem | null>>
	// 当前选中的 Avatar 文件项
	avatarItem: FileItem | null
	// 更新 Avatar 文件项的状态函数
	setAvatarItem: React.Dispatch<React.SetStateAction<FileItem | null>>
}

// 导出组件
export function FaviconAvatarUpload({ faviconItem, setFaviconItem, avatarItem, setAvatarItem }: FaviconAvatarUploadProps) {
	// 创建 ref，用于引用 Favicon 的隐藏文件输入框
	const faviconInputRef = useRef<HTMLInputElement>(null)
	// 创建 ref，用于引用 Avatar 的隐藏文件输入框
	const avatarInputRef = useRef<HTMLInputElement>(null)

	// 处理 Favicon 文件选择的异步函数
	const handleFaviconFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		// 获取用户选择的第一个文件
		const file = e.target.files?.[0]
		// 如果没有选择文件，直接返回
		if (!file) return

		// 检查文件类型是否为图片
		if (!file.type.startsWith('image/')) {
			// 如果不是图片，显示错误提示
			toast.error('请选择图片文件')
			return
		}

		// 计算文件的 SHA256 哈希值
		const hash = await hashFileSHA256(file)
		// 创建文件的本地预览 URL
		const previewUrl = URL.createObjectURL(file)
		// 更新 Favicon 状态，包含文件信息、预览 URL 和哈希值
		setFaviconItem({ type: 'file', file, previewUrl, hash })
		// 清空输入框的值，允许重复选择同一个文件
		if (e.currentTarget) e.currentTarget.value = ''
	}

	// 处理 Avatar 文件选择的异步函数（逻辑与 Favicon 处理函数一致）
	const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		if (!file.type.startsWith('image/')) {
			toast.error('请选择图片文件')
			return
		}

		const hash = await hashFileSHA256(file)
		const previewUrl = URL.createObjectURL(file)
		setAvatarItem({ type: 'file', file, previewUrl, hash })
		if (e.currentTarget) e.currentTarget.value = ''
	}

	// 渲染组件 UI
	return (
		// 使用 grid 布局，两列显示，间距为 4
		<div className='grid grid-cols-2 gap-4'>
			{/* Favicon 上传区域 */}
			<div>
				{/* Favicon 标签 */}
				<label className='mb-2 block text-sm font-medium'>Favicon</label>
				{/* 隐藏的文件输入框，通过 ref 控制点击 */}
				<input ref={faviconInputRef} type='file' accept='image/*' className='hidden' onChange={handleFaviconFileSelect} />
				{/* 自定义的上传区域容器 */}
				<div className='group relative h-20 w-20 cursor-pointer overflow-hidden rounded-lg border bg-white/60'>
					{/* 如果已选择 Favicon 文件，显示预览图；否则显示默认 Favicon */}
					{faviconItem?.type === 'file' ? (
						<img src={faviconItem.previewUrl} alt='favicon preview' className='h-full w-full object-cover' />
					) : (
						<img src='/favicon.png' alt='current favicon' className='h-full w-full object-cover' />
					)}
					{/* 鼠标悬停时显示的遮罩层和文字 */}
					<div className='pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
						<span className='text-xs text-white'>{faviconItem ? '更换' : '上传'}</span>
					</div>

					{/* 透明的点击层，点击时触发隐藏的文件输入框 */}
					<div className='absolute inset-0' onClick={() => faviconInputRef.current?.click()} />
				</div>
			</div>

			{/* Avatar 上传区域（结构与 Favicon 类似，仅样式和逻辑略有不同） */}
			<div>
				{/* Avatar 标签 */}
				<label className='mb-2 block text-sm font-medium'>Avatar</label>
				{/* 隐藏的文件输入框 */}
				<input ref={avatarInputRef} type='file' accept='image/*' className='hidden' onChange={handleAvatarFileSelect} />
				{/* 自定义的上传区域容器（圆形） */}
				<div className='group relative h-20 w-20 cursor-pointer overflow-hidden rounded-full border bg-white/60'>
					{/* 如果已选择 Avatar 文件，显示预览图；否则显示默认 Avatar */}
					{avatarItem?.type === 'file' ? (
						<img src={avatarItem.previewUrl} alt='avatar preview' className='h-full w-full object-cover' />
					) : (
						<img src='/images/avatar.png' alt='current avatar' className='h-full w-full object-cover' />
					)}
					{/* 鼠标悬停时显示的遮罩层和文字 */}
					<div className='pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
						<span className='text-xs text-white'>{avatarItem ? '更换' : '上传'}</span>
					</div>
					{/* 透明的点击层 */}
					<div className='absolute inset-0' onClick={() => avatarInputRef.current?.click()} />
				</div>
			</div>
		</div>
	)
}