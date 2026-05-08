'use client'

import { useState, useRef, useEffect } from 'react' // 引入 React hooks
import { motion } from 'motion/react' // 引入动画库 motion
import { toast } from 'sonner' // 引入轻量级 toast 通知库
import { DialogModal } from '@/components/dialog-modal' // 引入通用弹窗组件
import { useAuthStore } from '@/hooks/use-auth' // 引入身份认证状态管理
import { useConfigStore } from '../stores/config-store' // 引入配置状态管理
import { pushSiteContent } from '../services/push-site-content' // 引入推送网站内容的服务
import type { SiteContent, CardStyles } from '../stores/config-store' // 引入类型定义
// 引入“网站设置”子组件及其相关类型
import {
	SiteSettings,
	type FileItem,
	type ArtImageUploads,
	type BackgroundImageUploads,
	type SocialButtonImageUploads
} from './site-settings'
import { ColorConfig } from './color-config' // 引入“色彩配置”子组件
import { HomeLayout } from './home-layout' // 引入“首页布局”子组件

// 配置弹窗的 props 类型定义
interface ConfigDialogProps {
	open: boolean // 是否打开弹窗
	onClose: () => void // 关闭弹窗的回调函数
}

// 标签页类型
type TabType = 'site' | 'color' | 'layout'

/**
 * 配置弹窗主组件，包含三个标签页：网站设置、色彩配置、首页布局
 * 支持预览、保存（需身份认证）和取消操作
 */
export default function ConfigDialog({ open, onClose }: ConfigDialogProps) {
	// 获取认证状态和设置密钥的方法
	const { isAuth, setPrivateKey } = useAuthStore()
	// 获取全局网站内容、卡片样式和气泡重新生成方法
	const { siteContent, setSiteContent, cardStyles, setCardStyles, regenerateBubbles } = useConfigStore()

	// 弹窗内部的网站内容表单数据（副本）
	const [formData, setFormData] = useState<SiteContent>(siteContent)
	// 弹窗内部的卡片样式表单数据（副本）
	const [cardStylesData, setCardStylesData] = useState<CardStyles>(cardStyles)
	// 打开弹窗时的原始网站内容快照，用于取消时恢复
	const [originalData, setOriginalData] = useState<SiteContent>(siteContent)
	// 打开弹窗时的原始卡片样式快照
	const [originalCardStyles, setOriginalCardStyles] = useState<CardStyles>(cardStyles)
	// 是否正在保存
	const [isSaving, setIsSaving] = useState(false)
	// 当前激活的标签页
	const [activeTab, setActiveTab] = useState<TabType>('site')

	// 用于触发隐藏的文件选择器
	const keyInputRef = useRef<HTMLInputElement>(null)

	// 以下状态用于管理用户新上传的文件对象，以便后续上传到仓库
	const [faviconItem, setFaviconItem] = useState<FileItem | null>(null) // 网站图标
	const [avatarItem, setAvatarItem] = useState<FileItem | null>(null) // 头像
	const [artImageUploads, setArtImageUploads] = useState<ArtImageUploads>({}) // 文章配图
	const [backgroundImageUploads, setBackgroundImageUploads] = useState<BackgroundImageUploads>({}) // 背景图片
	const [socialButtonImageUploads, setSocialButtonImageUploads] = useState<SocialButtonImageUploads>({}) // 社交按钮图片

	// 弹窗打开时，使用当前全局配置初始化内部表单数据
	useEffect(() => {
		if (open) {
			const current = { ...siteContent }
			const currentCardStyles = { ...cardStyles }
			setFormData(current)
			setCardStylesData(currentCardStyles)
			setOriginalData(current)
			setOriginalCardStyles(currentCardStyles)
			// 清空所有新上传的文件记录（因为重新打开弹窗）
			setFaviconItem(null)
			setAvatarItem(null)
			setArtImageUploads({})
			setBackgroundImageUploads({})
			setSocialButtonImageUploads({})
			setActiveTab('site') // 默认显示“网站设置”标签
		}
	}, [open, siteContent, cardStyles])

	// 组件卸载时清理所有预览 URL，避免内存泄漏
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
			// 清理文章配图预览 URL
			Object.values(artImageUploads).forEach(item => {
				if (item.type === 'file') {
					URL.revokeObjectURL(item.previewUrl)
				}
			})
			// 清理背景图片预览 URL
			Object.values(backgroundImageUploads).forEach(item => {
				if (item.type === 'file') {
					URL.revokeObjectURL(item.previewUrl)
				}
			})
			// 清理社交按钮图片预览 URL
			Object.values(socialButtonImageUploads).forEach(item => {
				if (item.type === 'file') {
					URL.revokeObjectURL(item.previewUrl)
				}
			})
		}
	}, [faviconItem, avatarItem, artImageUploads, backgroundImageUploads, socialButtonImageUploads])

	/**
	 * 处理用户导入私钥文件（用于 GitHub 认证）
	 * 读取文件内容，设置为私钥，然后自动触发保存操作
	 */
	const handleChoosePrivateKey = async (file: File) => {
		try {
			const text = await file.text()
			setPrivateKey(text) // 存储私钥
			await handleSave() // 私钥导入后立即保存配置
		} catch (error) {
			console.error('Failed to read private key:', error)
			toast.error('读取密钥文件失败')
		}
	}

	/**
	 * 保存按钮点击处理
	 * 如果尚未认证，则触发隐藏的文件选择器让用户导入私钥
	 */
	const handleSaveClick = () => {
		if (!isAuth) {
			keyInputRef.current?.click() // 弹出文件选择窗口
		} else {
			handleSave()
		}
	}

	/**
	 * 保存配置主逻辑
	 * 计算被移除的图片，调用推送服务将配置和文件上传到 GitHub 仓库
	 */
	const handleSave = async () => {
		setIsSaving(true)
		try {
			// 计算需要删除的文章配图（原文存在但新数据中不存在）
			const originalArtImages = originalData.artImages ?? []
			const currentArtImages = formData.artImages ?? []
			const removedArtImages = originalArtImages.filter(
				orig => !currentArtImages.some(current => current.id === orig.id)
			)

			// 计算需要删除的背景图片
			const originalBackgroundImages = originalData.backgroundImages ?? []
			const currentBackgroundImages = formData.backgroundImages ?? []
			const removedBackgroundImages = originalBackgroundImages.filter(
				orig => !currentBackgroundImages.some(current => current.id === orig.id)
			)

			// 调用推送服务，同时传入新上传的文件和需要删除的图片信息
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

			// 更新全局状态
			setSiteContent(formData)
			setCardStyles(cardStylesData)
			updateThemeVariables(formData.theme) // 应用主题颜色

			// 清空文件上传状态
			setFaviconItem(null)
			setAvatarItem(null)
			setArtImageUploads({})
			setBackgroundImageUploads({})
			setSocialButtonImageUploads({})
			onClose() // 关闭弹窗
		} catch (error: any) {
			console.error('Failed to save:', error)
			toast.error(`保存失败: ${error?.message || '未知错误'}`)
		} finally {
			setIsSaving(false)
		}
	}

	/**
	 * 取消按钮处理
	 * 恢复全局配置到弹窗打开时的状态，清理预览 URL，并还原页面标题和主题
	 */
	const handleCancel = () => {
		// 清理所有预览 URL，与卸载逻辑相同
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

		// 恢复原始全局配置
		setSiteContent(originalData)
		setCardStyles(originalCardStyles)
		regenerateBubbles() // 重新生成背景气泡

		// 恢复文档标题和 meta description（如果曾经被预览修改过）
		if (typeof document !== 'undefined') {
			document.title = originalData.meta.title
			const metaDescription = document.querySelector('meta[name="description"]')
			if (metaDescription) {
				metaDescription.setAttribute('content', originalData.meta.description)
			}
		}

		// 恢复原始主题颜色
		updateThemeVariables(originalData.theme)

		// 清空文件上传状态
		setFaviconItem(null)
		setAvatarItem(null)
		setArtImageUploads({})
		setBackgroundImageUploads({})
		setSocialButtonImageUploads({})
		onClose() // 关闭弹窗
	}

	/**
	 * 将主题颜色对象中的值设置为 CSS 自定义属性，动态改变页面主题
	 */
	const updateThemeVariables = (theme?: SiteContent['theme']) => {
		if (typeof document === 'undefined' || !theme) return

		const { colorBrand, colorBrandSecondary, colorPrimary, colorSecondary, colorBg, colorBorder, colorCard, colorArticle } = theme
		const root = document.documentElement

		if (colorBrand) root.style.setProperty('--color-brand', colorBrand)
		if (colorBrandSecondary) root.style.setProperty('--color-brand-secondary', colorBrandSecondary)
		if (colorPrimary) root.style.setProperty('--color-primary', colorPrimary)
		if (colorSecondary) root.style.setProperty('--color-secondary', colorSecondary)
		if (colorBg) root.style.setProperty('--color-bg', colorBg)
		if (colorBorder) root.style.setProperty('--color-border', colorBorder)
		if (colorCard) root.style.setProperty('--color-card', colorCard)
		if (colorArticle) root.style.setProperty('--color-article', colorArticle)
	}

	/**
	 * 预览按钮处理
	 * 将当前表单数据应用到全局状态，更新页面标题和主题，然后关闭弹窗
	 */
	const handlePreview = () => {
		console.log('formData', formData)
		setSiteContent(formData)
		setCardStyles(cardStylesData)
		regenerateBubbles()

		// 更新浏览器标签页标题
		if (typeof document !== 'undefined') {
			document.title = formData.meta.title
			const metaDescription = document.querySelector('meta[name="description"]')
			if (metaDescription) {
				metaDescription.setAttribute('content', formData.meta.description)
			}
		}
		updateThemeVariables(formData.theme)

		onClose() // 预览后关闭弹窗，让用户直接在页面上看到效果
	}

	// 根据认证状态决定按钮文字
	const buttonText = isAuth ? '保存' : '导入密钥'

	// 标签页配置项
	const tabs: { id: TabType; label: string }[] = [
		{ id: 'site', label: '网站设置' },
		{ id: 'color', label: '色彩配置' },
		{ id: 'layout', label: '首页布局' }
	]

	return (
		<>
			{/* 隐藏的文件选择器，用于导入私钥文件 */}
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				className='hidden'
				onChange={async e => {
					const f = e.target.files?.[0]
					if (f) await handleChoosePrivateKey(f)
					// 重置 input 值，以便再次选择同一个文件也能触发 onChange
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			{/* 配置弹窗主体 */}
			<DialogModal
				open={open}
				onClose={handleCancel}
				className='card scrollbar-none max-h-[90vh] min-h-[600px] w-[640px] overflow-y-auto'
			>
				{/* 顶部标签切换栏和操作按钮 */}
				<div className='mb-6 flex items-center justify-between'>
					{/* 标签页导航 */}
					<div className='flex gap-1'>
						{tabs.map(tab => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`relative px-4 py-2 text-sm font-medium transition-colors ${
									activeTab === tab.id
										? 'text-brand'
										: 'text-secondary hover:text-primary'
								}`}
							>
								{tab.label}
								{/* 当前激活标签的下划线指示器 */}
								{activeTab === tab.id && (
									<div className='bg-brand absolute right-0 bottom-0 left-0 h-0.5' />
								)}
							</button>
						))}
					</div>

					{/* 右侧操作按钮组：预览、取消、保存 */}
					<div className='flex gap-3'>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handlePreview}
							className='bg-card rounded-xl border px-6 py-2 text-sm'
						>
							预览
						</motion.button>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleCancel}
							disabled={isSaving}
							className='bg-card rounded-xl border px-6 py-2 text-sm'
						>
							取消
						</motion.button>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleSaveClick}
							disabled={isSaving}
							className='brand-btn px-6'
						>
							{isSaving ? '保存中...' : buttonText}
						</motion.button>
					</div>
				</div>

				{/* 标签页内容区域 */}
				<div className='min-h-[200px]'>
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
					{activeTab === 'color' && (
						<ColorConfig formData={formData} setFormData={setFormData} />
					)}
					{activeTab === 'layout' && (
						<HomeLayout
							cardStylesData={cardStylesData}
							setCardStylesData={setCardStylesData}
							onClose={onClose}
						/>
					)}
				</div>
			</DialogModal>
		</>
	)
}
