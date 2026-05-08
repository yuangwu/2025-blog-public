'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { hashFileSHA256 } from '@/lib/file-utils'
import type { SiteContent } from '../../stores/config-store'
import type { ArtImageUploads, FileItem } from './types'

// 组件接收的 props 类型
interface ArtImagesSectionProps {
	formData: SiteContent // 当前站点配置数据
	setFormData: React.Dispatch<React.SetStateAction<SiteContent>> // 更新站点配置的函数
	artImageUploads: ArtImageUploads // 已上传（或待上传）的艺术图片文件信息
	setArtImageUploads: React.Dispatch<React.SetStateAction<ArtImageUploads>> // 更新艺术图片上传状态的函数
}

/**
 * 艺术图片管理区域组件
 * 支持通过文件上传和 URL 两种方式添加图片，并可以设置当前使用的图片
 */
export function ArtImagesSection({
	formData,
	setFormData,
	artImageUploads,
	setArtImageUploads,
}: ArtImagesSectionProps) {
	// 用于触发文件选择框的 ref
	const artInputRef = useRef<HTMLInputElement>(null)
	// 管理 URL 输入框的值
	const [artUrlInput, setArtUrlInput] = useState('')

	/**
	 * 处理文件选择（多选）
	 * 读取图片文件，计算哈希，生成预览，并更新配置和上传状态
	 */
	const handleArtFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || [])
		if (!files.length) return

		for (const file of files) {
			// 只接受图片文件
			if (!file.type.startsWith('image/')) {
				toast.error('请选择图片文件')
				continue
			}

			// 通过文件内容计算 SHA-256 作为唯一 ID
			const hash = await hashFileSHA256(file)
			// 提取扩展名，默认为 png
			const ext = file.name.split('.').pop() || 'png'
			const id = hash
			// 目标存储路径（部署后由存储方案决定实际处理方式）
			const targetPath = `/images/art/${id}.${ext}`
			// 生成本地预览 URL
			const previewUrl = URL.createObjectURL(file)

			// 记录上传文件信息
			setArtImageUploads(prev => ({
				...prev,
				[id]: { type: 'file', file, previewUrl, hash },
			}))

			// 更新配置中的艺术图片列表
			setFormData(prev => {
				const existing = prev.artImages ?? []
				// 移除可能存在的同 id 旧记录（重新上传）
				const filtered = existing.filter(item => item.id !== id)
				const artImages = [...filtered, { id, url: targetPath }]
				return {
					...prev,
					artImages,
					// 如果还没有设置当前使用的图片，则默认使用刚添加的这张
					currentArtImageId: prev.currentArtImageId || id,
				}
			})
		}

		// 清空 URL 输入和文件选择框（以便再次选择同一文件时触发 onChange）
		setArtUrlInput('')
		if (e.currentTarget) e.currentTarget.value = ''
	}

	/**
	 * 通过 URL 添加艺术图片
	 * 生成一个基于时间戳的唯一 ID，并直接加入配置列表
	 */
	const handleArtUrlSubmit = () => {
		if (!artUrlInput.trim()) {
			toast.error('请输入图片 URL')
			return
		}

		// 构造一个唯一 id，避免重复
		const id = `url-${Date.now()}`
		setFormData(prev => {
			const existing = prev.artImages ?? []
			const artImages = [...existing, { id, url: artUrlInput.trim() }]
			return {
				...prev,
				artImages,
				// 如果还没有当前图片，则将新添加的 URL 图片设为当前
				currentArtImageId: prev.currentArtImageId || id,
			}
		})

		// 清空输入框
		setArtUrlInput('')
	}

	/**
	 * 将指定 id 的图片设置为当前使用
	 */
	const handleSetCurrentArtImage = (id: string) => {
		setFormData(prev => ({
			...prev,
			currentArtImageId: id,
		}))
	}

	/**
	 * 删除指定 id 的艺术图片
	 * 如果是本地文件，先释放预览 URL，再清理上传记录和配置
	 */
	const handleRemoveArtImage = (id: string) => {
		const uploadItem = artImageUploads[id]
		// 若为文件上传，释放之前生成的 blob URL
		if (uploadItem?.type === 'file') {
			URL.revokeObjectURL(uploadItem.previewUrl)
		}

		// 从上传记录中移除
		setArtImageUploads(prev => {
			const next = { ...prev }
			delete next[id]
			return next
		})

		// 从配置列表中移除，并处理当前图片 id 的变更
		setFormData(prev => {
			const existing = prev.artImages ?? []
			const artImages = existing.filter(item => item.id !== id)
			const isCurrent = prev.currentArtImageId === id
			return {
				...prev,
				artImages,
				// 如果删除的是当前使用的图片，则自动切换到列表中的第一张（如果有）
				currentArtImageId: isCurrent ? artImages[0]?.id || '' : prev.currentArtImageId,
			}
		})
	}

	return (
		<div>
			{/* 区域标题 */}
			<label className="mb-2 block text-sm font-medium">首页图片</label>

			{/* 隐藏的文件选择器，通过按钮触发 */}
			<input
				ref={artInputRef}
				type="file"
				accept="image/*"
				multiple
				className="hidden"
				onChange={handleArtFilesSelect}
			/>

			{/* 无图片提示 */}
			{(formData.artImages?.length ?? 0) === 0 && (
				<p className="mb-2 text-xs text-gray-500">
					暂未配置 Art 图片，点击下方「+」添加。
				</p>
			)}

			{/* 图片网格展示 */}
			<div className="grid grid-cols-4 gap-3 max-sm:grid-cols-3">
				{formData.artImages?.map(item => {
					const isActive = formData.currentArtImageId === item.id
					const uploadItem = artImageUploads[item.id]
					// 优先使用上传预览，否则直接使用 URL
					const src =
						uploadItem?.type === 'file' ? uploadItem.previewUrl : item.url

					return (
						<div key={item.id} className="group relative">
							{/* 图片缩略图按钮，点击切换为当前使用 */}
							<button
								type="button"
								onClick={() => handleSetCurrentArtImage(item.id)}
								className={`block w-full overflow-hidden rounded-xl border bg-white/60 transition-all ${
									isActive
										? 'ring-brand shadow-md ring-2'
										: 'hover:border-brand/60'
								}`}
							>
								<img
									src={src}
									alt="art preview"
									className="h-24 w-full object-cover"
								/>
							</button>

							{/* 「当前使用」标识 */}
							{isActive && (
								<span className="bg-brand pointer-events-none absolute top-1 left-1 rounded-full px-2 py-0.5 text-[10px] text-white shadow">
									当前使用
								</span>
							)}

							{/* 删除按钮（鼠标悬浮时显示） */}
							<button
								type="button"
								onClick={() => handleRemoveArtImage(item.id)}
								className="text-secondary absolute top-1 right-1 hidden rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] shadow group-hover:block"
							>
								删除
							</button>
						</div>
					)
				})}

				{/* “+”按钮，触发文件选择 */}
				<div className="flex items-center justify-center">
					<button
						type="button"
						onClick={() => artInputRef.current?.click()}
						className="hover:border-brand/60 flex h-24 w-full items-center justify-center rounded-xl border border-dashed bg-white/40 text-2xl text-gray-400 hover:bg-white/80"
					>
						+
					</button>
				</div>
			</div>

			{/* URL 输入与添加区域 */}
			<div className="mt-3 flex gap-2">
				<input
					type="url"
					value={artUrlInput}
					onChange={e => setArtUrlInput(e.target.value)}
					onKeyDown={e => {
						// 按回车键提交
						if (e.key === 'Enter') {
							e.preventDefault()
							handleArtUrlSubmit()
						}
					}}
					placeholder="输入图片 URL"
					className="bg-secondary/10 flex-1 rounded-lg border px-3 py-1.5 text-xs"
				/>
				<button
					type="button"
					onClick={handleArtUrlSubmit}
					className="bg-card rounded-lg border px-3 py-1.5 text-xs font-medium"
				>
					添加 URL
				</button>
			</div>
		</div>
	)
}
