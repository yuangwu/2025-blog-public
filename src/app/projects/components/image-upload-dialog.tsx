'use client'
// ↑ Next.js 客户端组件声明，确保该组件在浏览器端渲染

import { useState, useRef } from 'react'
import { toast } from 'sonner' // 轻量级 toast 通知库
import { Plus } from 'lucide-react' // 图标库中的加号图标
import { DialogModal } from '@/components/dialog-modal' // 自定义的模态对话框容器组件

/**
 * 图片数据项类型：
 * - 若为 URL 类型，则包含 type: 'url' 与 url 字符串
 * - 若为文件类型，则包含 type: 'file', 文件对象 File, 本地预览地址 previewUrl 以及可选的哈希值 hash
 */
export type ImageItem = { type: 'url'; url: string } | { type: 'file'; file: File; previewUrl: string; hash?: string }

/** ImageUploadDialog 组件的 Props */
interface ImageUploadDialogProps {
	currentImage?: string // 当前已有的图片 URL（用于编辑场景时的初始值）
	onClose: () => void // 关闭对话框的回调
	onSubmit: (image: ImageItem) => void // 提交选择的图片（文件或URL）的回调
}

/**
 * 图片上传对话框组件
 * 支持两种方式添加图片：本地上传文件 或 输入图片 URL。
 * 通过 DialogModal 承载，带有预览、切换输入方式、表单提交与关闭清理逻辑。
 */
export default function ImageUploadDialog({ currentImage, onClose, onSubmit }: ImageUploadDialogProps) {
	// 图片 URL 输入框的值，若有 currentImage 则初始化为它
	const [urlInput, setUrlInput] = useState(currentImage || '')
	// 本地选择的文件及预览 URL，未选择时为 null
	const [previewFile, setPreviewFile] = useState<{ file: File; previewUrl: string } | null>(null)
	// 隐藏的 file input 引用，用于触发文件选择窗口
	const fileInputRef = useRef<HTMLInputElement>(null)

	/**
	 * 处理文件选择
	 * 验证是否为图片格式，生成临时预览 URL，并清空 URL 输入框
	 */
	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		// 校验：如果不是图片文件，提示并终止
		if (!file.type.startsWith('image/')) {
			toast.error('请选择图片文件')
			return
		}

		// 通过浏览器 API 创建本地预览地址（blob URL）
		const previewUrl = URL.createObjectURL(file)
		setPreviewFile({ file, previewUrl })
		// 清空 URL 输入，避免两种输入共存
		setUrlInput('')
	}

	/**
	 * 表单提交处理
	 * 优先提交本地文件（若已选择），否则尝试提交 URL。若两者均未提供则提示错误。
	 */
	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		if (previewFile) {
			// 已选择本地文件 → 提交文件类型数据
			onSubmit({
				type: 'file',
				file: previewFile.file,
				previewUrl: previewFile.previewUrl
			})
		} else if (urlInput.trim()) {
			// 没有文件但有 URL → 提交 URL 类型数据
			onSubmit({
				type: 'url',
				url: urlInput.trim()
			})
		} else {
			// 两者皆空，显示错误提示，并中断提交
			toast.error('请上传图片或输入 URL')
			return
		}

		// 提交成功后重置内部状态，关闭对话框
		setPreviewFile(null)
		setUrlInput(currentImage || '')
		onClose()
	}

	/**
	 * 关闭对话框的清理操作
	 * - 若存在预览文件，手动释放通过 createObjectURL 创建的内存对象，防止内存泄漏
	 * - 重置状态并调用外部 onClose
	 */
	const handleClose = () => {
		if (previewFile) {
			URL.revokeObjectURL(previewFile.previewUrl)
		}
		setPreviewFile(null)
		setUrlInput(currentImage || '')
		onClose()
	}

	return (
		// DialogModal：自定义模态框外层，open 控制显隐，className 传入卡片宽度等样式
		<DialogModal open onClose={handleClose} className='card w-md'>
			<h2 className='mb-4 text-xl font-bold'>选择图片</h2>
			<form onSubmit={handleSubmit} className='space-y-4'>
				{/* 本地文件上传区域 */}
				<div>
					<label className='text-secondary mb-2 block text-sm font-medium'>上传图片</label>
					{/* 隐藏的原生文件输入，由下方的区域点击触发 */}
					<input ref={fileInputRef} type='file' accept='image/*' className='hidden' onChange={handleFileSelect} />
					{/* 可点击的上传预览框 */}
					<div
						onClick={() => fileInputRef.current?.click()}
						className='mx-auto flex h-32 w-32 cursor-pointer items-center justify-center rounded-xl border border-gray-300 bg-secondary/10 transition-colors hover:bg-gray-200'>
						{previewFile ? (
							// 已选择文件时显示预览图
							<img src={previewFile.previewUrl} alt='preview' className='h-full w-full rounded-xl object-cover' />
						) : (
							// 未选择时显示 Plus 图标与提示文字
							<div className='text-center'>
								<Plus className='text-secondary mx-auto mb-1 h-8 w-8' />
								<p className='text-secondary text-xs'>点击上传图片</p>
							</div>
						)}
					</div>
				</div>

				{/* 分割线 "或" */}
				<div className='relative'>
					<div className='absolute inset-0 flex items-center'>
						<div className='w-full border-t border-gray-300'></div>
					</div>
					<div className='relative flex justify-center text-sm'>
						<span className='text-secondary rounded-lg bg-white px-4 py-1'>或</span>
					</div>
				</div>

				{/* 图片 URL 输入区域 */}
				<div>
					<label className='text-secondary mb-2 block text-sm font-medium'>图片 URL</label>
					<input
						type='url'
						value={urlInput}
						// 输入 URL 时若已有预览文件，则清除预览文件，避免冲突
						onChange={e => {
							setUrlInput(e.target.value)
							if (previewFile) {
								URL.revokeObjectURL(previewFile.previewUrl)
								setPreviewFile(null)
							}
						}}
						placeholder='https://example.com/image.png'
						className='focus:ring-brand w-full rounded-lg border border-gray-300 bg-gray-200 px-4 py-2 focus:ring-2 focus:outline-none'
					/>
				</div>

				{/* 操作按钮：确认 / 取消 */}
				<div className='flex gap-3 pt-2'>
					<button type='submit' className='brand-btn flex-1 justify-center rounded-lg px-6 py-2.5'>
						确认
					</button>
					<button
						type='button'
						onClick={handleClose}
						className='flex-1 rounded-lg border border-gray-300 bg-white px-6 py-2.5 transition-colors hover:bg-gray-50'>
						取消
					</button>
				</div>
			</form>
		</DialogModal>
	)
}