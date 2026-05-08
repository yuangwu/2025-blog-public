'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
// 导入默认的图片数据列表，请确保 ./list.json 文件存在于当前目录
import initialList from './list.json'
import { RandomLayout } from './components/random-layout'
import UploadDialog from './components/upload-dialog'
// 导入推送图片到远程的服务函数
import { pushPictures } from './services/push-pictures'
// 用于获取认证状态和设置密钥的 hook
import { useAuthStore } from '@/hooks/use-auth'
// 用于获取站点配置（如是否隐藏编辑按钮）的 store
import { useConfigStore } from '@/app/(home)/stores/config-store'
// ImageItem 类型定义，用于上传对话框中的图片项
import type { ImageItem } from '../projects/components/image-upload-dialog'
import { useRouter } from 'next/navigation'

// 定义单组图片的数据结构
export interface Picture {
	id: string
	uploadedAt: string
	description?: string
	image?: string // 单张图片的 URL（旧格式兼容）
	images?: string[] // 多张图片的 URL 数组
}

export default function Page() {
	// 当前展示的图片列表（编辑时会修改）
	const [pictures, setPictures] = useState<Picture[]>(initialList as Picture[])
	// 进入编辑前的原始图片列表，用于取消时恢复
	const [originalPictures, setOriginalPictures] = useState<Picture[]>(initialList as Picture[])
	// 是否处于编辑模式
	const [isEditMode, setIsEditMode] = useState(false)
	// 是否正在保存
	const [isSaving, setIsSaving] = useState(false)
	// 上传对话框是否打开
	const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
	// 存放尚未上传的本地文件图片项，键为 "pictureId::index"
	const [imageItems, setImageItems] = useState<Map<string, ImageItem>>(new Map())
	// 用于触发选择密钥文件的隐藏 input 引用
	const keyInputRef = useRef<HTMLInputElement>(null)
	const router = useRouter()

	// 认证状态与设置密钥方法
	const { isAuth, setPrivateKey } = useAuthStore()
	// 站点配置
	const { siteContent } = useConfigStore()
	// 是否隐藏编辑按钮
	const hideEditButton = siteContent.hideEditButton ?? false

	// 处理上传对话框提交：接收图片项和描述，构造新的 Picture 并添加到列表
	const handleUploadSubmit = ({ images, description }: { images: ImageItem[]; description: string }) => {
		const now = new Date().toISOString()

		// 至少需要一张图片
		if (images.length === 0) {
			toast.error('请至少选择一张图片')
			return
		}

		// 生成唯一 ID
		const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
		const desc = description.trim() || undefined

		// 提取每张图片的 URL（在线 URL 或本地预览 URL）
		const imageUrls = images.map(imageItem => (imageItem.type === 'url' ? imageItem.url : imageItem.previewUrl))

		// 构造新的 Picture 对象
		const newPicture: Picture = {
			id,
			uploadedAt: now,
			description: desc,
			images: imageUrls
		}

		// 将本地文件类型的图片项存入 Map，后续真正保存时会上传它们
		const newMap = new Map(imageItems)
		images.forEach((imageItem, index) => {
			if (imageItem.type === 'file') {
				newMap.set(`${id}::${index}`, imageItem)
			}
		})

		// 更新状态
		setPictures(prev => [...prev, newPicture])
		setImageItems(newMap)
		setIsUploadDialogOpen(false)
	}

	// 删除单张图片或整个 Picture（根据 imageIndex 判断）
	const handleDeleteSingleImage = (pictureId: string, imageIndex: number | 'single') => {
		setPictures(prev => {
			return prev
				.map(picture => {
					if (picture.id !== pictureId) return picture

					// 如果是 'single'，代表删掉整个 Picture（例如只有一张图片时）
					if (imageIndex === 'single') {
						return null
					}

					// 否则从 images 数组中移除指定索引的图片
					if (picture.images && picture.images.length > 0) {
						const newImages = picture.images.filter((_, idx) => idx !== imageIndex)
						// 若删除后数组为空，则整个 Picture 也应删除
						if (newImages.length === 0) {
							return null
						}
						return {
							...picture,
							images: newImages
						}
					}

					return picture
				})
				// 过滤掉被标记为 null 的 Picture
				.filter((p): p is Picture => p !== null)
		})

		// 同步更新 imageItems 中的本地文件项，并重新调整索引
		setImageItems(prev => {
			const next = new Map(prev)
			if (imageIndex === 'single') {
				// 删除该 Picture 相关的所有文件项
				for (const key of next.keys()) {
					if (key.startsWith(`${pictureId}::`)) {
						next.delete(key)
					}
				}
			} else {
				// 删除指定索引的文件项
				next.delete(`${pictureId}::${imageIndex}`)

				// 删除后，后面的索引需要减 1 以保持连续
				const keysToUpdate: Array<{ oldKey: string; newKey: string }> = []
				for (const key of next.keys()) {
					if (key.startsWith(`${pictureId}::`)) {
						const [, indexStr] = key.split('::')
						const oldIndex = Number(indexStr)
						if (!isNaN(oldIndex) && oldIndex > imageIndex) {
							const newIndex = oldIndex - 1
							keysToUpdate.push({
								oldKey: key,
								newKey: `${pictureId}::${newIndex}`
							})
						}
					}
				}

				// 应用新的索引
				for (const { oldKey, newKey } of keysToUpdate) {
					const value = next.get(oldKey)
					if (value) {
						next.set(newKey, value)
						next.delete(oldKey)
					}
				}
			}
			return next
		})
	}

	// 删除一整组 Picture（需要用户确认）
	const handleDeleteGroup = (picture: Picture) => {
		if (!confirm('确定要删除这一组图片吗？')) return

		setPictures(prev => prev.filter(p => p.id !== picture.id))
		// 同时清除该 Picture 相关的本地文件引用
		setImageItems(prev => {
			const next = new Map(prev)
			for (const key of next.keys()) {
				if (key.startsWith(`${picture.id}::`)) {
					next.delete(key)
				}
			}
			return next
		})
	}

	// 用户选择密钥文件并读取内容，然后执行保存
	const handleChoosePrivateKey = async (file: File) => {
		try {
			const text = await file.text()
			setPrivateKey(text) // 将密钥存入 auth store
			await handleSave() // 立即触发保存
		} catch (error) {
			console.error('Failed to read private key:', error)
			toast.error('读取密钥文件失败')
		}
	}

	// 点击保存按钮：若未认证则弹出文件选择框，否则直接保存
	const handleSaveClick = () => {
		if (!isAuth) {
			keyInputRef.current?.click()
		} else {
			handleSave()
		}
	}

	// 执行保存逻辑：调用 pushPictures 将数据和文件推送到远程
	const handleSave = async () => {
		setIsSaving(true)

		try {
			await pushPictures({
				pictures,
				imageItems
			})

			// 保存成功后更新原始数据并退出编辑模式
			setOriginalPictures(pictures)
			setImageItems(new Map())
			setIsEditMode(false)
			toast.success('保存成功！')
		} catch (error: any) {
			console.error('Failed to save:', error)
			toast.error(`保存失败: ${error?.message || '未知错误'}`)
		} finally {
			setIsSaving(false)
		}
	}

	// 取消编辑：恢复到进入编辑前的状态
	const handleCancel = () => {
		setPictures(originalPictures)
		setImageItems(new Map())
		setIsEditMode(false)
	}

	// 根据认证状态显示按钮文字
	const buttonText = isAuth ? '保存' : '导入密钥'

	// 全局键盘快捷键：Ctrl/Cmd + , 进入编辑模式
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!isEditMode && (e.ctrlKey || e.metaKey) && e.key === ',') {
				e.preventDefault()
				setIsEditMode(true)
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [isEditMode])

	return (
		<>
			{/* 隐藏的文件选择器，用于导入 .pem 密钥文件 */}
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				className='hidden'
				onChange={async e => {
					const f = e.target.files?.[0]
					if (f) await handleChoosePrivateKey(f)
					// 清空文件输入值，以便可以重复选择同一个文件
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			{/* 随机布局展示图片列表 */}
			<RandomLayout
				pictures={pictures}
				isEditMode={isEditMode}
				onDeleteSingle={handleDeleteSingleImage}
				onDeleteGroup={handleDeleteGroup}
			/>

			{/* 当没有任何图片时的提示 */}
			{pictures.length === 0 && (
				<div className='text-secondary flex min-h-screen items-center justify-center text-center text-sm'>
					还没有上传图片，点击右上角「编辑」后即可开始上传。
				</div>
			)}

			{/* 右上角的操作按钮容器，带进入动画 */}
			<motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className='absolute top-4 right-6 flex gap-3 max-sm:hidden'>
				{isEditMode ? (
					<>
						{/* 编辑模式下的额外功能按钮 */}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={() => router.push('/image-toolbox')}
							className='rounded-xl border bg-blue-50 px-4 py-2 text-sm text-blue-700'>
							压缩工具
						</motion.button>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleCancel}
							disabled={isSaving}
							className='rounded-xl border bg-white/60 px-6 py-2 text-sm'>
							取消
						</motion.button>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={() => setIsUploadDialogOpen(true)}
							className='rounded-xl border bg-white/60 px-6 py-2 text-sm'>
							上传
						</motion.button>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleSaveClick}
							disabled={isSaving}
							className='brand-btn px-6'>
							{isSaving ? '保存中...' : buttonText}
						</motion.button>
					</>
				) : (
					// 非编辑模式下，根据配置决定是否显示编辑按钮
					!hideEditButton && (
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={() => setIsEditMode(true)}
							className='rounded-xl border bg-white/60 px-6 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/80'>
							编辑
						</motion.button>
					)
				)}
			</motion.div>

			{/* 上传对话框，仅在 isUploadDialogOpen 为 true 时渲染 */}
			{isUploadDialogOpen && (
				<UploadDialog
					onClose={() => setIsUploadDialogOpen(false)}
					onSubmit={handleUploadSubmit}
				/>
			)}
		</>
	)
}
