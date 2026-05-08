'use client'
// 标记为 Next.js 客户端组件（必须在文件顶部）

import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { DialogModal } from '@/components/dialog-modal'
import { useAuthStore } from '@/hooks/use-auth'
import { useConfigStore } from '../stores/config-store'
import { pushSiteContent } from '../services/push-site-content'
import type { SiteContent, CardStyles } from '../stores/config-store'
import { SiteSettings, type FileItem, type ArtImageUploads, type BackgroundImageUploads, type SocialButtonImageUploads } from './site-settings'
import { ColorConfig } from './color-config'
import { HomeLayout } from './home-layout'

// 组件 Props 接口定义
interface ConfigDialogProps {
	open: boolean
	// 控制对话框显示/隐藏
	onClose: () => void
	// 关闭对话框的回调函数
}

// 标签页类型定义（网站/色彩/布局）
type TabType = 'site' | 'color' | 'layout'

// 导出默认组件：配置对话框
export default function ConfigDialog({ open, onClose }: ConfigDialogProps) {
	// 从认证 store 获取状态和方法
	const { isAuth, setPrivateKey } = useAuthStore()
	// 从配置 store 获取网站内容、卡片样式及相关方法
	const { siteContent, setSiteContent, cardStyles, setCardStyles, regenerateBubbles } = useConfigStore()

	// 表单数据状态（用于实时编辑）
	const [formData, setFormData] = useState<SiteContent>(siteContent)
	// 卡片样式数据状态
	const [cardStylesData, setCardStylesData] = useState<CardStyles>(cardStyles)
	// 原始数据备份（用于取消时恢复）
	const [originalData, setOriginalData] = useState<SiteContent>(siteContent)
	const [originalCardStyles, setOriginalCardStyles] = useState<CardStyles>(cardStyles)

	// 保存中状态（防止重复提交）
	const [isSaving, setIsSaving] = useState(false)
	// 当前激活的标签页
	const [activeTab, setActiveTab] = useState<TabType>('site')
	// 私钥文件输入框的 ref（用于触发文件选择）
	const keyInputRef = useRef<HTMLInputElement>(null)

	// 各类图片上传的状态管理
	const [faviconItem, setFaviconItem] = useState<FileItem | null>(null) // 网站图标
	const [avatarItem, setAvatarItem] = useState<FileItem | null>(null) // 头像
	const [artImageUploads, setArtImageUploads] = useState<ArtImageUploads>({}) // 艺术图片
	const [backgroundImageUploads, setBackgroundImageUploads] = useState<BackgroundImageUploads>({}) // 背景图片
	const [socialButtonImageUploads, setSocialButtonImageUploads] = useState<SocialButtonImageUploads>({}) // 社交按钮图片

	// 副作用：当对话框打开时，重置所有表单数据和状态
	useEffect(() => {
		if (open) {
			// 深拷贝当前数据作为表单初始值
			const current = { ...siteContent }
			const currentCardStyles = { ...cardStyles }
			setFormData(current)
			setCardStylesData(currentCardStyles)
			// 备份原始数据
			setOriginalData(current)
			setOriginalCardStyles(currentCardStyles)
			// 清空所有图片上传状态
			setFaviconItem(null)
			setAvatarItem(null)
			setArtImageUploads({})
			setBackgroundImageUploads({})
			setSocialButtonImageUploads({})
			// 默认激活“网站设置”标签页
			setActiveTab('site')
		}
	}, [open, siteContent, cardStyles]) // 依赖项：对话框状态、网站内容、卡片样式

	// 副作用：组件卸载时清理图片预览 URL（防止内存泄漏）
	useEffect(() => {
		return () => {
			// 清理网站图标预览 URL
			if (faviconItem?.type === 'file') {
				URL.revokeObjectURL(faviconItem.previewUrl)
			}
			// 清理头像预览 URL
			if (avatarItem?.type === 'file') {
				URL.revokeObjectURL(avatarItem.previewUrl)
			}
			// 清理所有艺术图片预览 URL
			Object.values(artImageUploads).forEach(item => {
				if (item.type === 'file') {
					URL.revokeObjectURL(item.previewUrl)
				}
			})
			// 清理所有背景图片预览 URL
			Object.values(backgroundImageUploads).forEach(item => {
				if (item.type === 'file') {
					URL.revokeObjectURL(item.previewUrl)
				}
			})
			// 清理所有社交按钮图片预览 URL
			Object.values(socialButtonImageUploads).forEach(item => {
				if (item.type === 'file') {
					URL.revokeObjectURL(item.previewUrl)
				}
			})
		}
	}, [faviconItem, avatarItem, artImageUploads, backgroundImageUploads, socialButtonImageUploads])

	// 处理私钥文件选择
	const handleChoosePrivateKey = async (file: File) => {
		try {
			// 读取私钥文件内容
			const text = await file.text()
			// 设置到认证 store
			setPrivateKey(text)
			// 自动触发保存
			await handleSave()
		} catch (error) {
			console.error('Failed to read private key:', error)
			toast.error('读取密钥文件失败')
		}
	}

	// 处理“保存”按钮点击
	const handleSaveClick = () => {
		// 如果未认证，触发私钥文件选择
		if (!isAuth) {
			keyInputRef.current?.click()
		} else {
			// 已认证，直接保存
			handleSave()
		}
	}

	// 核心保存逻辑
	const handleSave = async () => {
		setIsSaving(true)
		try {
			// 计算被删除的艺术图片（用于后续在仓库中删除文件）
			const originalArtImages = originalData.artImages ?? []
			const currentArtImages = formData.artImages ?? []
			const removedArtImages = originalArtImages.filter(orig => !currentArtImages.some(current => current.id === orig.id))

			// 计算被删除的背景图片
			const originalBackgroundImages = originalData.backgroundImages ?? []
			const currentBackgroundImages = formData.backgroundImages ?? []
			const removedBackgroundImages = originalBackgroundImages.filter(orig => !currentBackgroundImages.some(current => current.id === orig.id))

			// 调用服务函数推送内容到服务器
			await pushSiteContent(
				formData,
				cardStylesData,
				faviconItem,
				avatarItem,
				artImageUploads,
				removedArtImages,
				backgroundImageUploads,
				removedBackgroundImages,
				socialButtonImageUploads
			)
			// 更新全局配置 store
			setSiteContent(formData)
			setCardStyles(cardStylesData)
			// 更新 CSS 主题变量
			updateThemeVariables(formData.theme)
			// 清空所有图片上传状态
			setFaviconItem(null)
			setAvatarItem(null)
			setArtImageUploads({})
			setBackgroundImageUploads({})
			setSocialButtonImageUploads({})
			// 关闭对话框
			onClose()
		} catch (error: any) {
			console.error('Failed to save:', error)
			toast.error(`保存失败: ${error?.message || '未知错误'}`)
		} finally {
			// 无论成功失败，都重置保存状态
			setIsSaving(false)
		}
	}

	// 处理“取消”按钮点击
	const handleCancel = () => {
		// 清理所有图片预览 URL
		if (faviconItem?.type === 'file') {
			URL.revokeObjectURL(faviconItem.previewUrl)
		}
		if (avatarItem?.type === 'file') {
			URL.revokeObjectURL(avatarItem.previewUrl)
		}
		Object.values(artImageUploads).forEach(item => {
			if (item.type === 'file') {
				URL.revokeObjectURL(item.previewUrl)
			}
		})
		Object.values(backgroundImageUploads).forEach(item => {
			if (item.type === 'file') {
				URL.revokeObjectURL(item.previewUrl)
			}
		})
		Object.values(socialButtonImageUploads).forEach(item => {
			if (item.type === 'file') {
				URL.revokeObjectURL(item.previewUrl)
			}
		})
		// 恢复到对话框打开时的原始状态
		setSiteContent(originalData)
		setCardStyles(originalCardStyles)
		regenerateBubbles()
		// 恢复文档标题和 meta 描述（如果被预览修改过）
		if (typeof document !== 'undefined') {
			document.title = originalData.meta.title
			const metaDescription = document.querySelector('meta[name="description"]')
			if (metaDescription) {
				metaDescription.setAttribute('content', originalData.meta.description)
			}
		}
		// 恢复 CSS 主题变量
		updateThemeVariables(originalData.theme)
		// 清空所有图片上传状态
		setFaviconItem(null)
		setAvatarItem(null)
		setArtImageUploads({})
		setBackgroundImageUploads({})
		setSocialButtonImageUploads({})
		// 关闭对话框
		onClose()
	}

	// 更新 CSS 主题变量（用于实时预览主题色）
	const updateThemeVariables = (theme?: SiteContent['theme']) => {
		// 确保在浏览器环境且有主题数据
		if (typeof document === 'undefined' || !theme) return

		// 解构主题色
		const { colorBrand, colorBrandSecondary, colorPrimary, colorSecondary, colorBg, colorBorder, colorCard, colorArticle } = theme

		// 获取根元素
		const root = document.documentElement

		// 逐个设置 CSS 变量
		if (colorBrand) root.style.setProperty('--color-brand', colorBrand)
		if (colorBrandSecondary) root.style.setProperty('--color-brand-secondary', colorBrandSecondary)
		if (colorPrimary) root.style.setProperty('--color-primary', colorPrimary)
		if (colorSecondary) root.style.setProperty('--color-secondary', colorSecondary)
		if (colorBg) root.style.setProperty('--color-bg', colorBg)
		if (colorBorder) root.style.setProperty('--color-border', colorBorder)
		if (colorCard) root.style.setProperty('--color-card', colorCard)
		if (colorArticle) root.style.setProperty('--color-article', colorArticle)
	}

	// 处理“预览”按钮点击
	const handlePreview = () => {
		console.log('formData', formData)
		// 临时更新全局配置 store（用于预览）
		setSiteContent(formData)
		setCardStyles(cardStylesData)
		regenerateBubbles()

		// 更新文档标题和 meta 描述
		if (typeof document !== 'undefined') {
			document.title = formData.meta.title
			const metaDescription = document.querySelector('meta[name="description"]')
			if (metaDescription) {
				metaDescription.setAttribute('content', formData.meta.description)
			}
		}
		// 更新 CSS 主题变量
		updateThemeVariables(formData.theme)

		// 关闭对话框（让用户看到预览效果）
		onClose()
	}

	// 根据认证状态动态显示按钮文字
	const buttonText = isAuth ? '保存' : '导入密钥'

	// 标签页配置
	const tabs: { id: TabType; label: string }[] = [
		{ id: 'site', label: '网站设置' },
		{ id: 'color', label: '色彩配置' },
		{ id: 'layout', label: '首页布局' }
	]

	// 组件渲染
	return (
		<>
			{/* 隐藏的私钥文件输入框（通过 ref 触发） */}
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem' // 只接受 .pem 格式的私钥文件
				className='hidden'
				onChange={async e => {
					const f = e.target.files?.[0]
					if (f) await handleChoosePrivateKey(f)
					// 清空输入框值，允许重复选择同一文件
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			{/* 对话框模态框 */}
			<DialogModal open={open} onClose={handleCancel} className='card scrollbar-none max-h-[90vh] min-h-[600px] w-[640px] overflow-y-auto'>
				{/* 顶部：标签页切换 + 操作按钮 */}
				<div className='mb-6 flex items-center justify-between'>
					{/* 标签页按钮组 */}
					<div className='flex gap-1'>
						{tabs.map(tab => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`relative px-4 py-2 text-sm font-medium transition-colors ${
									activeTab === tab.id ? 'text-brand' : 'text-secondary hover:text-primary'
								}`}>
								{tab.label}
								{/* 当前标签页的下划线指示器 */}
								{activeTab === tab.id && <div className='bg-brand absolute right-0 bottom-0 left-0 h-0.5' />}
							</button>
						))}
					</div>

					{/* 操作按钮组：预览、取消、保存 */}
					<div className='flex gap-3'>
						{/* 预览按钮（带动画效果） */}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handlePreview}
							className='bg-card rounded-xl border px-6 py-2 text-sm'>
							预览
						</motion.button>
						{/* 取消按钮（带动画效果） */}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleCancel}
							disabled={isSaving}
							className='bg-card rounded-xl border px-6 py-2 text-sm'>
							取消
						</motion.button>
						{/* 保存按钮（带动画效果） */}
						<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSaveClick} disabled={isSaving} className='brand-btn px-6'>
							{isSaving ? '保存中...' : buttonText}
						</motion.button>
					</div>
				</div>

				{/* 内容区域：根据当前标签页渲染对应子组件 */}
				<div className='min-h-[200px]'>
					{/* 网站设置 */}
					{activeTab === 'site' && (
						<SiteSettings
							formData={formData}
							setFormData={setFormData}
							faviconItem={faviconItem}
							setFaviconItem={setFaviconItem}
							avatarItem={avatarItem}
							setAvatarItem={setAvatarItem}
							artImageUploads={artImageUploads}
							setArtImageUploads={setArtImageUploads}
							backgroundImageUploads={backgroundImageUploads}
							setBackgroundImageUploads={setBackgroundImageUploads}
							socialButtonImageUploads={socialButtonImageUploads}
							setSocialButtonImageUploads={setSocialButtonImageUploads}
						/>
					)}
					{/* 色彩配置 */}
					{activeTab === 'color' && <ColorConfig formData={formData} setFormData={setFormData} />}
					{/* 首页布局 */}
					{activeTab === 'layout' && <HomeLayout cardStylesData={cardStylesData} setCardStylesData={setCardStylesData} onClose={onClose} />}
				</div>
			</DialogModal>
		</>
	)
}
