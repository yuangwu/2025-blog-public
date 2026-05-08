'use client'

import { useRef } from 'react'
import { toast } from 'sonner'
import { hashFileSHA256 } from '@/lib/file-utils'
import type { FileItem } from './types'

// 定义组件接收的 props 类型
interface FaviconAvatarUploadProps {
	faviconItem: FileItem | null
	setFaviconItem: React.Dispatch<React.SetStateAction<FileItem | null>>
	avatarItem: FileItem | null
	setAvatarItem: React.Dispatch<React.SetStateAction<FileItem | null>>
}

/**
 * Favicon 和头像上传组件
 * 分别管理网站 favicon 和 avatar 图片的选择与预览
 */
export function FaviconAvatarUpload({
	faviconItem,
	setFaviconItem,
	avatarItem,
	setAvatarItem,
}: FaviconAvatarUploadProps) {
	// 用于触发隐藏的文件输入框的 ref
	const faviconInputRef = useRef<HTMLInputElement>(null)
	const avatarInputRef = useRef<HTMLInputElement>(null)

	/**
	 * 处理 favicon 文件选择
	 * 校验图片类型，计算文件哈希，生成预览 URL 并更新状态
	 */
	const handleFaviconFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		// 仅允许图片类型
		if (!file.type.startsWith('image/')) {
			toast.error('请选择图片文件')
			return
		}

		// 计算文件 SHA-256 哈希，用于去重或校验
		const hash = await hashFileSHA256(file)
		// 生成本地预览地址
		const previewUrl = URL.createObjectURL(file)
		setFaviconItem({ type: 'file', file, previewUrl, hash })

		// 清空 input 的值，确保再次选择同一文件时依然触发 onChange
		if (e.currentTarget) e.currentTarget.value = ''
	}

	/**
	 * 处理 avatar 文件选择
	 * 逻辑与 favicon 相同，更新对应的状态
	 */
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

	return (
		<div className='grid grid-cols-2 gap-4'>
			{/* Favicon 区域 */}
			<div>
				<label className='mb-2 block text-sm font-medium'>Favicon</label>
				{/* 隐藏的原生文件选择器，点击预览区域时触发 */}
				<input
					ref={faviconInputRef}
					type='file'
					accept='image/*'
					className='hidden'
					onChange={handleFaviconFileSelect}
				/>
				{/* 预览区域：显示当前已选图片或默认 favicon，悬浮时显示“上传/更换”字样 */}
				<div className='group relative h-20 w-20 cursor-pointer overflow-hidden rounded-lg border bg-white/60'>
					{faviconItem?.type === 'file' ? (
						<img
							src={faviconItem.previewUrl}
							alt='favicon preview'
							className='h-full w-full object-cover'
						/>
					) : (
						<img
							src='/favicon.png'
							alt='current favicon'
							className='h-full w-full object-cover'
						/>
					)}
					{/* 悬浮遮罩及文字提示 */}
					<div className='pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
						<span className='text-xs text-white'>
							{faviconItem ? '更换' : '上传'}
						</span>
					</div>
					{/* 透明遮罩层用于捕获点击事件，触发隐藏的文件输入框 */}
					<div
						className='absolute inset-0'
						onClick={() => faviconInputRef.current?.click()}
					/>
				</div>
			</div>

			{/* Avatar 区域 */}
			<div>
				<label className='mb-2 block text-sm font-medium'>Avatar</label>
				<input
					ref={avatarInputRef}
					type='file'
					accept='image/*'
					className='hidden'
					onChange={handleAvatarFileSelect}
				/>
				<div className='group relative h-20 w-20 cursor-pointer overflow-hidden rounded-full border bg-white/60'>
					{avatarItem?.type === 'file' ? (
						<img
							src={avatarItem.previewUrl}
							alt='avatar preview'
							className='h-full w-full object-cover'
						/>
					) : (
						<img
							src='/images/avatar.png'
							alt='current avatar'
							className='h-full w-full object-cover'
						/>
					)}
					<div className='pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
						<span className='text-xs text-white'>
							{avatarItem ? '更换' : '上传'}
						</span>
					</div>
					<div
						className='absolute inset-0'
						onClick={() => avatarInputRef.current?.click()}
					/>
				</div>
			</div>
		</div>
	)
}
