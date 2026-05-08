'use client' // 标记为客户端组件，仅在浏览器端执行

// 导入必要的依赖
import { useRef, useState } from 'react'
import { toast } from 'sonner' // 用于显示提示消息
import { hashFileSHA256 } from '@/lib/file-utils' // 自定义工具函数：计算文件 SHA256 哈希值
import type { SiteContent } from '../../stores/config-store' // 导入类型定义：站点内容配置
import type { BackgroundImageUploads, FileItem } from './types' // 导入类型定义：背景图片上传相关类型

// 定义组件 Props 的类型接口
interface BackgroundImagesSectionProps {
	formData: SiteContent // 表单数据，包含当前配置的背景图片列表
	setFormData: React.Dispatch<React.SetStateAction<SiteContent>> // 更新 formData 的状态函数
	backgroundImageUploads: BackgroundImageUploads // 本地文件上传的临时状态（包含预览图等）
	setBackgroundImageUploads: React.Dispatch<React.SetStateAction<BackgroundImageUploads>> // 更新上传状态的函数
}

// 导出背景图片管理组件
export function BackgroundImagesSection({ 
	formData, 
	setFormData, 
	backgroundImageUploads, 
	setBackgroundImageUploads 
}: BackgroundImagesSectionProps) {
	// 创建一个 ref 用于隐藏的文件输入框，方便手动触发点击
	const backgroundInputRef = useRef<HTMLInputElement>(null)
	// 状态：管理 URL 输入框的内容
	const [backgroundUrlInput, setBackgroundUrlInput] = useState('')

	/**
	 * 处理函数：当用户选择本地图片文件时触发
	 * 1. 验证文件类型
	 * 2. 计算文件哈希值（作为唯一 ID）
	 * 3. 生成预览 URL
	 * 4. 更新状态
	 */
	const handleBackgroundFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		// 获取用户选择的第一个文件
		const file = e.target.files?.[0]
		if (!file) return

		// 验证文件是否为图片类型
		if (!file.type.startsWith('image/')) {
			toast.error('请选择图片文件')
			return
		}

		// 计算文件的 SHA256 哈希值，用于作为文件的唯一标识
		const hash = await hashFileSHA256(file)
		// 获取文件扩展名
		const ext = file.name.split('.').pop() || 'png'
		const id = hash
		// 构建文件在服务器上的目标存储路径
		const targetPath = `/images/background/${id}.${ext}`
		// 生成本地预览 URL
		const previewUrl = URL.createObjectURL(file)

		// 更新“上传中文件”的状态，保存文件对象和预览链接
		setBackgroundImageUploads(prev => ({
			...prev,
			[id]: { type: 'file', file, previewUrl, hash }
		}))

		// 更新表单配置数据
		setFormData(prev => {
			// 获取现有的背景图片列表
			const existing = (prev.backgroundImages ?? []) as Array<{ id: string; url: string }>
			// 如果列表中已有相同 ID（相同文件），先移除旧的
			const filtered = existing.filter(item => item.id !== id)
			// 将新图片加入列表
			const backgroundImages = [...filtered, { id, url: targetPath }]
			return {
				...prev,
				backgroundImages: backgroundImages as any,
				// 如果还没有当前背景，则自动设置这张为当前背景
				currentBackgroundImageId: prev.currentBackgroundImageId || id
			}
		})

		// 清空 URL 输入框
		setBackgroundUrlInput('')
		// 重置文件输入框的值，允许重复选择同一个文件
		if (e.currentTarget) e.currentTarget.value = ''
	}

	/**
	 * 处理函数：当用户提交图片 URL 时触发
	 */
	const handleBackgroundUrlSubmit = () => {
		// 验证输入不为空
		if (!backgroundUrlInput.trim()) {
			toast.error('请输入图片 URL')
			return
		}

		// 为 URL 图片生成一个临时唯一 ID
		const id = `url-${Date.now()}`
		// 更新表单数据
		setFormData(prev => {
			const existing = (prev.backgroundImages ?? []) as Array<{ id: string; url: string }>
			const backgroundImages = [...existing, { id, url: backgroundUrlInput.trim() }]
			return {
				...prev,
				backgroundImages: backgroundImages as any,
				currentBackgroundImageId: prev.currentBackgroundImageId || id
			}
		})

		// 清空输入框
		setBackgroundUrlInput('')
	}

	/**
	 * 处理函数：设置某一张图片为当前使用的背景
	 */
	const handleSetCurrentBackgroundImage = (id: string) => {
		setFormData(prev => ({
			...prev,
			currentBackgroundImageId: id
		}))
	}

	/**
	 * 处理函数：取消当前背景设置（不显示背景）
	 */
	const handleClearBackgroundImage = () => {
		setFormData(prev => ({
			...prev,
			currentBackgroundImageId: ''
		}))
	}

	/**
	 * 处理函数：从列表中删除某张背景图片
	 */
	const handleRemoveBackgroundImage = (id: string) => {
		// 获取被删除项
		const uploadItem = backgroundImageUploads[id]
		// 如果是本地文件上传，释放预览 URL 占用的内存
		if (uploadItem?.type === 'file') {
			URL.revokeObjectURL(uploadItem.previewUrl)
		}

		// 从“上传列表”状态中移除
		setBackgroundImageUploads(prev => {
			const next = { ...prev }
			delete next[id]
			return next
		})

		// 从“表单数据”中移除
		setFormData(prev => {
			const existing = (prev.backgroundImages ?? []) as Array<{ id: string; url: string }>
			const backgroundImages = existing.filter(item => item.id !== id)
			// 如果删除的是“当前正在使用”的背景，则自动切换到列表第一张，或清空
			const isCurrent = prev.currentBackgroundImageId === id
			return {
				...prev,
				backgroundImages: backgroundImages as any,
				currentBackgroundImageId: isCurrent ? backgroundImages[0]?.id || '' : prev.currentBackgroundImageId
			}
		})
	}

	// 组件 UI 渲染
	return (
		<div>
			{/* 标题栏：显示标签和“取消设置”按钮 */}
			<div className='mb-2 flex items-center justify-between'>
				<label className='block text-sm font-medium'>背景图片</label>
				{/* 如果当前设置了背景，则显示“取消设置”按钮 */}
				{formData.currentBackgroundImageId && formData.currentBackgroundImageId.trim() && (
					<button
						type='button'
						onClick={handleClearBackgroundImage}
						className='text-secondary rounded-lg border bg-white/60 px-3 py-1 text-xs font-medium hover:bg-white/80'>
						取消设置
					</button>
				)}
			</div>

			{/* 隐藏的文件输入框，通过 ref 手动触发 */}
			<input ref={backgroundInputRef} type='file' accept='image/*' className='hidden' onChange={handleBackgroundFileSelect} />

			{/* 图片网格：展示已添加的背景图片 */}
			<div className='grid grid-cols-4 gap-3 max-sm:grid-cols-3'>
				{/* 遍历背景图片列表进行渲染 */}
				{((formData.backgroundImages ?? []) as Array<{ id: string; url: string }>)
					.filter(item => item.url && item.url.trim() !== '')
					.map(item => {
						// 判断是否为当前选中的背景
						const isActive = formData.currentBackgroundImageId === item.id
						// 获取上传项（如果是本地文件）
						const uploadItem = backgroundImageUploads[item.id]
						// 确定图片源：本地预览图 或 网络 URL
						const src = uploadItem?.type === 'file' ? uploadItem.previewUrl : item.url

						return (
							<div key={item.id} className='group relative'>
								{/* 图片选择按钮 */}
								<button
									type='button'
									onClick={() => handleSetCurrentBackgroundImage(item.id)}
									className={`block w-full overflow-hidden rounded-xl border bg-white/60 transition-all ${
										isActive ? 'ring-brand shadow-md ring-2' : 'hover:border-brand/60'
									}`}>
									<img src={src} alt='background preview' className='h-24 w-full object-cover' />
								</button>
								
								{/* 当前使用标签 */}
								{isActive && (
									<span className='bg-brand pointer-events-none absolute top-1 left-1 rounded-full px-2 py-0.5 text-[10px] text-white shadow'>当前使用</span>
								)}
								
								{/* 删除按钮（鼠标悬停时显示） */}
								<button
									type='button'
									onClick={() => handleRemoveBackgroundImage(item.id)}
									className='text-secondary absolute top-1 right-1 hidden rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] shadow group-hover:block'>
									删除
								</button>
							</div>
						)
					})}

				{/* 添加新图片的按钮（“+”号） */}
				<div className='flex items-center justify-center'>
					<button
						type='button'
						onClick={() => backgroundInputRef.current?.click()} // 触发隐藏的文件选择框
						className='hover:border-brand/60 flex h-24 w-full items-center justify-center rounded-xl border border-dashed bg-white/40 text-2xl text-gray-400 hover:bg-white/80'>
						+
					</button>
				</div>
			</div>

			{/* URL 输入区域：通过链接添加图片 */}
			<div className='mt-3 flex gap-2'>
				<input
					type='url'
					value={backgroundUrlInput}
					onChange={e => setBackgroundUrlInput(e.target.value)}
					// 支持回车键提交
					onKeyDown={e => {
						if (e.key === 'Enter') {
							e.preventDefault()
							handleBackgroundUrlSubmit()
						}
					}}
					placeholder='输入图片 URL'
					className='bg-secondary/10 flex-1 rounded-lg border px-3 py-1.5 text-xs'
				/>
				<button type='button' onClick={handleBackgroundUrlSubmit} className='bg-card rounded-lg border px-3 py-1.5 text-xs font-medium'>
					添加 URL
				</button>
			</div>
		</div>
	)
}
