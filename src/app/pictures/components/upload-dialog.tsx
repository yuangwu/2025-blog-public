'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { DialogModal } from '@/components/dialog-modal' // 自定义弹窗组件，需提前创建
import type { ImageItem } from '../../projects/components/image-upload-dialog' // 图片类型定义

// 上传对话框的 props 类型
interface UploadDialogProps {
	onClose: () => void // 关闭对话框的回调
	onSubmit: (payload: { images: ImageItem[]; description: string }) => void // 提交时的回调，传递图片数组和描述
}

export default function UploadDialog({ onClose, onSubmit }: UploadDialogProps) {
	// 描述文本的状态
	const [description, setDescription] = useState('')
	// 已选择的图片列表（ImageItem 数组）
	const [images, setImages] = useState<ImageItem[]>([])
	// 隐藏的文件输入框引用，用于触发文件选择
	const fileInputRef = useRef<HTMLInputElement>(null)

	// 处理文件选择变化
	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		// 将 FileList 转为数组
		const files = Array.from(e.target.files || [])
		if (files.length === 0) return

		const nextImages: ImageItem[] = []

		// 遍历每个文件，检查是否为图片类型
		for (const file of files) {
			if (!file.type.startsWith('image/')) {
				toast.error('请选择图片文件')
				return
			}

			// 生成预览 URL
			const previewUrl = URL.createObjectURL(file)
			nextImages.push({
				type: 'file',
				file,
				previewUrl
			})
		}

		// 更新图片列表（每次选择会替换原有图片）
		setImages(nextImages)
	}

	// 提交表单
	const handleSubmit = () => {
		// 校验至少有一张图片
		if (images.length === 0) {
			toast.error('请至少选择一张图片')
			return
		}

		// 调用父组件传入的提交方法
		onSubmit({
			images,
			description
		})

		// 清空状态并关闭对话框
		setImages([])
		setDescription('')
		onClose()
	}

	// 关闭对话框时的清理工作
	const handleClose = () => {
		// 释放通过 URL.createObjectURL 创建的所有预览 URL，避免内存泄漏
		images.forEach(image => {
			if (image.type === 'file') {
				URL.revokeObjectURL(image.previewUrl)
			}
		})
		// 重置状态
		setImages([])
		setDescription('')
		// 触发关闭回调
		onClose()
	}

	return (
		<DialogModal open onClose={handleClose} className='card w-md max-sm:w-full'>
			<div className='space-y-4'>
				{/* 标题 */}
				<h2 className='text-xl font-bold'>上传图片</h2>

				{/* 图片选择区域 */}
				<div>
					<label className='text-secondary mb-2 block text-sm font-medium'>选择图片（可多选）</label>
					{/* 隐藏的原生文件输入框，仅通过按钮触发 */}
					<input ref={fileInputRef} type='file' accept='image/*' multiple className='hidden' onChange={handleFileSelect} />

					{/* 未选择图片时，显示占位区域 */}
					{images.length === 0 ? (
						<div
							onClick={() => fileInputRef.current?.click()} // 点击打开文件选择
							className='flex h-32 cursor-pointer items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 transition-colors hover:bg-secondary/10'>
							<div className='text-center'>
								<Plus className='mx-auto mb-1 h-8 w-8 text-gray-500' />
								<p className='text-secondary text-xs'>点击选择图片</p>
							</div>
						</div>
					) : (
						<>
							{/* 图片预览区域：最多显示前 3 张的层叠效果 */}
							<div className='relative flex h-40 items-center justify-center overflow-visible rounded-xl bg-linear-to-br from-gray-50 to-gray-100'>
								{images.slice(0, 3).map((image, index) =>
									image.type === 'file' ? (
										<div
											key={index}
											// 根据索引应用不同的旋转与偏移样式，形成层叠效果
											className={`absolute h-32 w-44 overflow-hidden rounded-xl border-4 border-white bg-white shadow-xl transition-transform ${
												index === 0 ? '-left-4 -translate-y-2 -rotate-6' : index === 1 ? 'z-20 rotate-1' : 'right-0 translate-y-2 rotate-6'
											}`}>
											<img src={image.previewUrl} alt={`preview-${index}`} className='h-full w-full object-cover' />
										</div>
									) : null
								)}

								{/* 超过 3 张时，显示总数标记 */}
								{images.length > 3 && (
									<div className='absolute right-4 -bottom-2 rounded-full bg-black/70 px-3 py-1 text-xs text-white shadow-lg'>共 {images.length} 张</div>
								)}
							</div>

							{/* 已选图片信息与继续添加按钮 */}
							<div className='mt-3 flex items-center justify-between'>
								<span className='text-secondary text-xs'>已选择 {images.length} 张图片</span>
								<button
									type='button'
									onClick={() => fileInputRef.current?.click()} // 再次打开文件选择
									className='rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50'>
									继续添加
								</button>
							</div>
						</>
					)}
				</div>

				{/* 描述输入 */}
				<div>
					<label className='text-secondary mb-2 block text-sm font-medium'>描述（可选，应用于本次所有图片）</label>
					<textarea
						value={description}
						onChange={e => setDescription(e.target.value)}
						placeholder='这组图片的说明...'
						className='w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none'
						rows={3}
					/>
				</div>

				{/* 底部操作按钮 */}
				<div className='mt-4 flex gap-3'>
					<button
						type='button'
						onClick={handleClose}
						className='flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm transition-colors hover:bg-gray-50'>
						取消
					</button>
					<button type='button' onClick={handleSubmit} className='brand-btn flex-1 justify-center px-4'>
						确认上传
					</button>
				</div>
			</div>
		</DialogModal>
	)
}
