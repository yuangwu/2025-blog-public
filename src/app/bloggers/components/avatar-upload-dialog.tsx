'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
// 导入博主网格视图组件及其 Blogger 类型
import GridView, { type Blogger } from './grid-view'
// 创建博主对话框组件
import CreateDialog from './components/create-dialog'
// 推送博主数据到 GitHub 的服务函数
import { pushBloggers } from './services/push-bloggers'
// 用于获取认证状态和设置私钥的 hook
import { useAuthStore } from '@/hooks/use-auth'
// 站点全局配置 store
import { useConfigStore } from '@/app/(home)/stores/config-store'
/**
 * 初始博主列表数据（静态 JSON 文件）
 * ⚠️ 部署前请确保 list.json 文件存在且格式正确，否则构建将失败。
 */
import initialList from './list.json'
// 头像上传相关类型
import type { AvatarItem } from './components/avatar-upload-dialog'

/**
 * 博主管理页面组件
 * 支持查看、编辑、新增、删除博主，并通过密钥认证后推送到 GitHub。
 */
export default function Page() {
	// 当前编辑中的博主列表
	const [bloggers, setBloggers] = useState<Blogger[]>(initialList as Blogger[])
	// 进入编辑模式前的原始列表，用于取消编辑时恢复
	const [originalBloggers, setOriginalBloggers] = useState<Blogger[]>(initialList as Blogger[])
	// 是否处于编辑模式
	const [isEditMode, setIsEditMode] = useState(false)
	// 是否正在保存数据
	const [isSaving, setIsSaving] = useState(false)
	// 当前正在编辑的博主（修改模式），为 null 表示新增
	const [editingBlogger, setEditingBlogger] = useState<Blogger | null>(null)
	// 创建对话框的打开状态
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
	// 保存每个博主对应的头像文件信息，key 为博主 url
	const [avatarItems, setAvatarItems] = useState<Map<string, AvatarItem>>(new Map())
	// 隐藏的文件选择 input，用于导入私钥
	const keyInputRef = useRef<HTMLInputElement>(null)

	// 获取认证状态与设置私钥的方法
	const { isAuth, setPrivateKey } = useAuthStore()
	// 获取站点内容配置
	const { siteContent } = useConfigStore()
	// 根据配置决定是否隐藏编辑按钮
	const hideEditButton = siteContent.hideEditButton ?? false

	/**
	 * 更新博主信息
	 * @param updatedBlogger 更新后的博主对象
	 * @param oldBlogger 原来的博主对象（用于匹配）
	 * @param avatarItem 可选的头像文件，如提供则一同更新
	 */
	const handleUpdate = (updatedBlogger: Blogger, oldBlogger: Blogger, avatarItem?: AvatarItem) => {
		setBloggers(prev => prev.map(b => (b.url === oldBlogger.url ? updatedBlogger : b)))
		if (avatarItem) {
			setAvatarItems(prev => {
				const newMap = new Map(prev)
				newMap.set(updatedBlogger.url, avatarItem)
				return newMap
			})
		}
	}

	// 打开新增博主对话框
	const handleAdd = () => {
		setEditingBlogger(null)
		setIsCreateDialogOpen(true)
	}

	// 保存从创建对话框返回的博主数据（新增或修改）
	const handleSaveBlogger = (updatedBlogger: Blogger) => {
		if (editingBlogger) {
			// 修改已有博主
			const updated = bloggers.map(b => (b.url === editingBlogger.url ? updatedBlogger : b))
			setBloggers(updated)
		} else {
			// 添加新博主
			setBloggers([...bloggers, updatedBlogger])
		}
	}

	// 删除博主（需要用户确认）
	const handleDelete = (blogger: Blogger) => {
		if (confirm(`确定要删除 ${blogger.name} 吗？`)) {
			setBloggers(bloggers.filter(b => b.url !== blogger.url))
		}
	}

	// 选择私钥文件并自动保存
	const handleChoosePrivateKey = async (file: File) => {
		try {
			const text = await file.text()
			setPrivateKey(text)
			// 导入密钥后自动触发保存操作，将当前编辑结果推送到远端
			await handleSave()
		} catch (error) {
			console.error('Failed to read private key:', error)
			toast.error('读取密钥文件失败')
		}
	}

	// 点击保存按钮时，未认证则触发私钥文件选择，已认证则直接保存
	const handleSaveClick = () => {
		if (!isAuth) {
			keyInputRef.current?.click()
		} else {
			handleSave()
		}
	}

	// 核心保存逻辑：将博主列表与头像项推送到 GitHub
	const handleSave = async () => {
		setIsSaving(true)

		try {
			await pushBloggers({
				bloggers,
				avatarItems
			})

			// 保存成功后更新原始列表，清空暂存的头像项，退出编辑模式
			setOriginalBloggers(bloggers)
			setAvatarItems(new Map())
			setIsEditMode(false)
			toast.success('保存成功！')
		} catch (error: any) {
			console.error('Failed to save:', error)
			toast.error(`保存失败: ${error?.message || '未知错误'}`)
		} finally {
			setIsSaving(false)
		}
	}

	// 取消编辑，恢复到编辑前的原始数据
	const handleCancel = () => {
		setBloggers(originalBloggers)
		setAvatarItems(new Map())
		setIsEditMode(false)
	}

	// 根据认证状态显示对应按钮文字
	const buttonText = isAuth ? '保存' : '导入密钥'

	// 注册全局快捷键：非编辑模式下按下 Ctrl/Cmd + , 进入编辑模式
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
			{/* 隐藏的文件上传 input，用于导入 .pem 格式私钥文件 */}
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				className='hidden'
				onChange={async e => {
					const f = e.target.files?.[0]
					if (f) await handleChoosePrivateKey(f)
					// 清空 input 的值，以便重复选择同一文件仍能触发 onChange
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			{/* 博主网格视图，传递更新和删除回调 */}
			<GridView bloggers={bloggers} isEditMode={isEditMode} onUpdate={handleUpdate} onDelete={handleDelete} />

			{/* 右上角操作按钮栏，移动端隐藏 */}
			<motion.div
				initial={{ opacity: 0, scale: 0.6 }}
				animate={{ opacity: 1, scale: 1 }}
				className='absolute top-4 right-6 flex gap-3 max-sm:hidden'>
				{isEditMode ? (
					<>
						{/* 取消编辑按钮 */}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleCancel}
							disabled={isSaving}
							className='rounded-xl border bg-white/60 px-6 py-2 text-sm'>
							取消
						</motion.button>
						{/* 添加博主按钮 */}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleAdd}
							className='rounded-xl border bg-white/60 px-6 py-2 text-sm'>
							添加
						</motion.button>
						{/* 保存 / 导入密钥按钮 */}
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
					// 未编辑状态，且未被配置隐藏时，显示编辑按钮
					!hideEditButton && (
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={() => setIsEditMode(true)}
							className='bg-card rounded-xl border px-6 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/80'>
							编辑
						</motion.button>
					)
				)}
			</motion.div>

			{/* 创建博主对话框，受控打开 */}
			{isCreateDialogOpen && (
				<CreateDialog
					blogger={editingBlogger}
					onClose={() => setIsCreateDialogOpen(false)}
					onSave={handleSaveBlogger}
				/>
			)}
		</>
	)
}
