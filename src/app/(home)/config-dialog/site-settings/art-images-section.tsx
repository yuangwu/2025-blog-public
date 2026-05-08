// 标记这是一个 React 客户端组件（Next.js App Router 语法）
'use client'

// 导入 React 的核心 Hooks
import { useRef, useState } from 'react'
// 导入 Sonner 库用于显示 Toast 提示消息
import { toast } from 'sonner'
// 导入自定义的工具函数，用于计算文件的 SHA256 哈希值
import { hashFileSHA256 } from '@/lib/file-utils'
// 导入类型定义：网站全局配置状态
import type { SiteContent } from '../../stores/config-store'
// 导入类型定义：图片上传状态和文件项结构
import type { ArtImageUploads, FileItem } from './types'

// 定义组件 Props 的接口类型
interface ArtImagesSectionProps {
	// 表单数据（包含当前配置的图片列表等）
	formData: SiteContent
	// 更新表单数据的 Setter 函数
	setFormData: React.Dispatch<React.SetStateAction<SiteContent>>
	// 本地图片上传的临时状态（包含文件对象和预览 URL）
	artImageUploads: ArtImageUploads
	// 更新本地上传状态的 Setter 函数
	setArtImageUploads: React.Dispatch<React.SetStateAction<ArtImageUploads>>
}

// 导出组件：ArtImagesSection（首页图片管理区域）
export function ArtImagesSection({ formData, setFormData, artImageUploads, setArtImageUploads }: ArtImagesSectionProps) {
	// 创建一个 Ref，用于隐藏的 <input type="file"> DOM 元素
	const artInputRef = useRef<HTMLInputElement>(null)
	// 状态：用于存储“通过 URL 添加图片”输入框的内容
	const [artUrlInput, setArtUrlInput] = useState('')

	// 处理函数：当用户通过文件选择器选择图片后触发
	const handleArtFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		// 将 FileList 转换为数组
		const files = Array.from(e.target.files || [])
		// 如果没选文件，直接返回
		if (!files.length) return

		// 遍历处理每一个选中的文件
		for (const file of files) {
			// 校验文件类型：必须是图片
			if (!file.type.startsWith('image/')) {
				toast.error('请选择图片文件')
				continue
			}

			// 1. 计算文件的 SHA256 哈希值（作为唯一 ID，避免重复上传）
			const hash = await hashFileSHA256(file)
			// 2. 获取文件后缀名
			const ext = file.name.split('.').pop() || 'png'
			// 3. 使用哈希值作为文件 ID
			const id = hash
			// 4. 构建文件最终的存储路径（模拟）
			const targetPath = `/images/art/${id}.${ext}`
			// 5. 生成浏览器本地预览 URL
			const previewUrl = URL.createObjectURL(file)

			// 更新“上传状态”：将新文件添加到状态中
			setArtImageUploads(prev => ({
				...prev,
				[id]: { type: 'file', file, previewUrl, hash }
			}))

			// 更新“表单数据”：将图片路径添加到配置中
			setFormData(prev => {
				const existing = prev.artImages ?? []
				// 如果该图片已存在，先移除旧的
				const filtered = existing.filter(item => item.id !== id)
				// 添加新的图片配置
				const artImages = [...filtered, { id, url: targetPath }]
				return {
					...prev,
					artImages,
					// 如果还没有“当前使用”的图片，自动设为这一张
					currentArtImageId: prev.currentArtImageId || id
				}
			})
		}

		// 清空 URL 输入框
		setArtUrlInput('')
		// 清空文件 input 的值，允许重复选择同一个文件
		if (e.currentTarget) e.currentTarget.value = ''
	}

	// 处理函数：当用户点击“添加 URL”按钮时触发
	const handleArtUrlSubmit = () => {
		// 校验输入框不能为空
		if (!artUrlInput.trim()) {
			toast.error('请输入图片 URL')
			return
		}

		// 为 URL 图片生成一个临时唯一 ID（带时间戳）
		const id = `url-${Date.now()}`
		// 更新表单数据
		setFormData(prev => {
			const existing = prev.artImages ?? []
			const artImages = [...existing, { id, url: artUrlInput.trim() }]
			return {
				...prev,
				artImages,
				currentArtImageId: prev.currentArtImageId || id
			}
		})

		// 清空输入框
		setArtUrlInput('')
	}

	// 处理函数：点击图片缩略图，设为“当前使用”
	const handleSetCurrentArtImage = (id: string) => {
		setFormData(prev => ({
			...prev,
			currentArtImageId: id
		}))
	}

	// 处理函数：删除某张图片
	const handleRemoveArtImage = (id: string) => {
		const uploadItem = artImageUploads[id]
		// 如果是本地文件上传，需要释放之前创建的预览 URL，防止内存泄漏
		if (uploadItem?.type === 'file') {
			URL.revokeObjectURL(uploadItem.previewUrl)
		}

		// 1. 从“上传状态”中移除
		setArtImageUploads(prev => {
			const next = { ...prev }
			delete next[id]
			return next
		})

		// 2. 从“表单数据”中移除
		setFormData(prev => {
			const existing = prev.artImages ?? []
			const artImages = existing.filter(item => item.id !== id)
			// 如果删掉的是“当前使用”的图片，则自动切换为列表中的第一张
			const isCurrent = prev.currentArtImageId === id
			return {
				...prev,
				artImages,
				currentArtImageId: isCurrent ? artImages[0]?.id || '' : prev.currentArtImageId
			}
		})
	}

	// 组件 UI 渲染
	return (
		<div>
			{/* 标题标签 */}
			<label className='mb-2 block text-sm font-medium'>首页图片</label>
			
			{/* 隐藏的文件输入框，通过 Ref 手动触发 */}
			<input ref={artInputRef} type='file' accept='image/*' multiple className='hidden' onChange={handleArtFilesSelect} />
			
			{/* 空状态提示 */}
			{(formData.artImages?.length ?? 0) === 0 && <p className='mb-2 text-xs text-gray-500'>暂未配置 Art 图片，点击下方「+」添加。</p>}
			
			{/* 图片网格布局 */}
			<div className='grid grid-cols-4 gap-3 max-sm:grid-cols-3'>
				{/* 遍历渲染已添加的图片 */}
				{formData.artImages?.map(item => {
					// 判断是否为“当前使用”的图片
					const isActive = formData.currentArtImageId === item.id
					// 获取对应的上传状态（如果是本地文件的话）
					const uploadItem = artImageUploads[item.id]
					// 决定显示的 src：本地预览图 或 网络 URL
					const src = uploadItem?.type === 'file' ? uploadItem.previewUrl : item.url

					return (
						<div key={item.id} className='group relative'>
							{/* 图片选择按钮 */}
							<button
								type='button'
								onClick={() => handleSetCurrentArtImage(item.id)}
								className={`block w-full overflow-hidden rounded-xl border bg-white/60 transition-all ${
									isActive ? 'ring-brand shadow-md ring-2' : 'hover:border-brand/60'
								}`}>
								<img src={src} alt='art preview' className='h-24 w-full object-cover' />
							</button>
							
							{/* “当前使用”标签 */}
							{isActive && (
								<span className='bg-brand pointer-events-none absolute top-1 left-1 rounded-full px-2 py-0.5 text-[10px] text-white shadow'>当前使用</span>
							)}
							
							{/* 删除按钮（鼠标悬停时显示） */}
							<button
								type='button'
								onClick={() => handleRemoveArtImage(item.id)}
								className='text-secondary absolute top-1 right-1 hidden rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] shadow group-hover:block'>
								删除
							</button>
						</div>
					)
				})}
				
				{/* 添加图片按钮（+号） */}
				<div className='flex items-center justify-center'>
					<button
						type='button'
						// 点击时触发隐藏的文件选择框
						onClick={() => artInputRef.current?.click()}
						className='hover:border-brand/60 flex h-24 w-full items-center justify-center rounded-xl border border-dashed bg-white/40 text-2xl text-gray-400 hover:bg-white/80'>
						+
					</button>
				</div>
			</div>
			
			{/* 通过 URL 添加图片的区域 */}
			<div className='mt-3 flex gap-2'>
				<input
					type='url'
					value={artUrlInput}
					onChange={e => setArtUrlInput(e.target.value)}
					// 支持回车键提交
					onKeyDown={e => {
						if (e.key === 'Enter') {
							e.preventDefault()
							handleArtUrlSubmit()
						}
					}}
					placeholder='输入图片 URL'
					className='bg-secondary/10 flex-1 rounded-lg border px-3 py-1.5 text-xs'
				/>
				<button type='button' onClick={handleArtUrlSubmit} className='bg-card rounded-lg border px-3 py-1.5 text-xs font-medium'>
					添加 URL
				</button>
			</div>
		</div>
	)
}