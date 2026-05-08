'use client' // 确保该组件仅在客户端渲染（Vercel 部署时 Next.js 支持）

// 依赖检查：需确保已安装 'sonner'、'lucide-react'，且项目中存在 @/components/dialog-modal 组件
import { useState, useRef } from 'react'
import { toast } from 'sonner' // toast 提示，需安装 sonner
import { Plus } from 'lucide-react' // 图标库，需安装 lucide-react
import { DialogModal } from '@/components/dialog-modal' // 自定义模态框组件，必须存在且默认导出 DialogModal

// 头像数据结构的联合类型：可以是 URL 字符串，也可以是本地文件对象（含预览 URL 和可选哈希）
export type AvatarItem = { type: 'url'; url: string } | { type: 'file'; file: File; previewUrl: string; hash?: string }

// 对话框组件 Props 类型定义
interface AvatarUploadDialogProps {
	currentAvatar?: string // 当前头像 URL（用于回显）
	onClose: () => void // 关闭对话框的回调
	onSubmit: (avatar: AvatarItem) => void // 提交头像时的回调
}

export default function AvatarUploadDialog({ currentAvatar, onClose, onSubmit }: AvatarUploadDialogProps) {
	// URL 输入框的值，若传入 currentAvatar 则默认填充
	const [urlInput, setUrlInput] = useState(currentAvatar || '')
	// 用户选择的本地文件及预览 URL（用于展示缩略图）
	const [previewFile, setPreviewFile] = useState<{ file: File; previewUrl: string } | null>(null)
	// 隐藏的文件 input 的引用
	const fileInputRef = useRef<HTMLInputElement>(null)

	// 处理用户选择本地文件
	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		// 校验文件类型：仅允许图片
		if (!file.type.startsWith('image/')) {
			toast.error('请选择图片文件')
			return
		}

		// 生成预览 URL（注意：使用时需在组件卸载或关闭时 revoke，避免内存泄漏）
		const previewUrl = URL.createObjectURL(file)
		setPreviewFile({ file, previewUrl })
		setUrlInput('') // 选中文件后清空 URL 输入框
	}

	// 提交表单：根据用户提供的内容（文件或 URL）调用 onSubmit
	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		if (previewFile) {
			// 若有本地文件，则提交文件类型数据
			onSubmit({
				type: 'file',
				file: previewFile.file,
				previewUrl: previewFile.previewUrl
			})
		} else if (urlInput.trim()) {
			// 否则提交 URL 类型数据
			onSubmit({
				type: 'url',
				url: urlInput.trim()
			})
		} else {
			toast.error('请上传图片或输入 URL')
			return
		}

		// 提交成功后重置状态并关闭对话框
		setPreviewFile(null)
		setUrlInput(currentAvatar || '')
		onClose()
	}

	// 关闭对话框时的清理工作：释放预览 URL 对象，重置状态
	const handleClose = () => {
		if (previewFile) {
			URL.revokeObjectURL(previewFile.previewUrl) // 避免内存泄漏
		}
		setPreviewFile(null)
		setUrlInput(currentAvatar || '')
		onClose()
	}

	return (
		<DialogModal open onClose={handleClose} className='card w-md'>
			{/* 注意：DialogModal 组件需要支持 open、onClose、className 属性，且内部应实现模态框逻辑 */}
			<h2 className='mb-4 text-xl font-bold'>选择头像</h2>

			<form onSubmit={handleSubmit} className='space-y-4'>
				{/* 图片上传区域 */}
				<div>
					<label className='text-secondary mb-2 block text-sm font-medium'>上传图片</label>
					<input ref={fileInputRef} type='file' accept='image/*' className='hidden' onChange={handleFileSelect} />
					<div
						onClick={() => fileInputRef.current?.click()}
						className='mx-auto flex h-32 w-32 cursor-pointer items-center justify-center rounded-full border border-gray-300 bg-secondary/10 transition-colors hover:bg-gray-200'>
						{previewFile ? (
							// 已有预览图则显示图片
							<img src={previewFile.previewUrl} alt='preview' className='h-full w-full rounded-lg object-cover' />
						) : (
							// 否则显示“+”号上传提示
							<div className='text-center'>
								<Plus className='text-secondary mx-auto mb-1 h-8 w-8' />
								<p className='text-secondary text-xs'>点击上传图片</p>
							</div>
						)}
					</div>
				</div>

				{/* 分割线：“或” */}
				<div className='relative'>
					<div className='absolute inset-0 flex items-center'>
						<div className='w-full border-t border-gray-300'></div>
					</div>
					<div className='relative flex justify-center text-sm'>
						<span className='text-secondary rounded-lg bg-white px-4 py-1'>或</span>
					</div>
				</div>

				{/* URL 输入框：用于输入网络图片地址 */}
				<div>
					<label className='text-secondary mb-2 block text-sm font-medium'>图片 URL</label>
					<input
						type='url'
						value={urlInput}
						onChange={e => {
							setUrlInput(e.target.value)
							// 当切换到 URL 输入时，释放之前预览的文件对象，避免内存残留
							if (previewFile) {
								URL.revokeObjectURL(previewFile.previewUrl)
								setPreviewFile(null)
							}
						}}
						placeholder='https://example.com/avatar.png'
						className='focus:ring-brand w-full rounded-lg border border-gray-300 bg-gray-200 px-4 py-2 focus:ring-2 focus:outline-none'
					/>
				</div>

				{/* 按钮区域：确认和取消 */}
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
