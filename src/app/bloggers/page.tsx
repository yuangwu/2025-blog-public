'use client'

// ========== 依赖导入 ==========
// 注意：请确保以下依赖包已安装（motion, sonner），且所有相对路径和别名路径的文件存在
import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'          // 动画库，需安装 motion
import { toast } from 'sonner'                 // 轻提示组件，需安装 sonner
import GridView, { type Blogger } from './grid-view'           // 网格视图组件，需确保该文件存在并正确导出 Blogger 类型
import CreateDialog from './components/create-dialog'          // 创建/编辑弹窗组件，需确保路径正确
import { pushBloggers } from './services/push-bloggers'       // 保存博主数据的服务函数，需确保实现正确
import { useAuthStore } from '@/hooks/use-auth'               // 全局认证状态，需确保 hooks 存在
import { useConfigStore } from '@/app/(home)/stores/config-store' // 全局配置状态，需确保路径和导出正确
import initialList from './list.json'                         // 初始博主列表（JSON 文件），部署前必须存在该文件
import type { AvatarItem } from './components/avatar-upload-dialog' // 头像项类型，需确保组件导出该类型

// ========== 页面主组件 ==========
export default function Page() {
	// ---------- 状态定义 ----------
	const [bloggers, setBloggers] = useState<Blogger[]>(initialList as Blogger[]) // 当前显示的博主列表
	const [originalBloggers, setOriginalBloggers] = useState<Blogger[]>(initialList as Blogger[]) // 原始数据，用于取消编辑时还原
	const [isEditMode, setIsEditMode] = useState(false)      // 是否处于编辑模式
	const [isSaving, setIsSaving] = useState(false)          // 是否正在保存中（防止重复提交）
	const [editingBlogger, setEditingBlogger] = useState<Blogger | null>(null) // 当前正在编辑的博主（null 表示新增）
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)        // 创建/编辑弹窗是否打开
	const [avatarItems, setAvatarItems] = useState<Map<string, AvatarItem>>(new Map()) // 存储待上传的头像文件（key 为博主 URL）
	const keyInputRef = useRef<HTMLInputElement>(null)        // 隐藏的文件上传 input 引用，用于导入私钥

	// ---------- 全局状态 ----------
	const { isAuth, setPrivateKey } = useAuthStore()          // 是否已认证（有私钥）及设置私钥的方法
	const { siteContent } = useConfigStore()                  // 站点配置内容
	const hideEditButton = siteContent.hideEditButton ?? false // 是否隐藏编辑按钮

	// ---------- 业务函数 ----------
	// 更新博主信息（编辑模式下拖动排序或修改字段后调用）
	const handleUpdate = (updatedBlogger: Blogger, oldBlogger: Blogger, avatarItem?: AvatarItem) => {
		// 替换列表中旧的博主数据
		setBloggers(prev => prev.map(b => (b.url === oldBlogger.url ? updatedBlogger : b)))
		// 如果有新头像，存入 avatarItems 映射，供保存时上传
		if (avatarItem) {
			setAvatarItems(prev => {
				const newMap = new Map(prev)
				newMap.set(updatedBlogger.url, avatarItem)
				return newMap
			})
		}
	}

	// 打开新增博主的弹窗
	const handleAdd = () => {
		setEditingBlogger(null)    // 清空编辑对象，表示新增模式
		setIsCreateDialogOpen(true)
	}

	// 保存博主（新增或编辑后从弹窗回调）
	const handleSaveBlogger = (updatedBlogger: Blogger) => {
		if (editingBlogger) {
			// 编辑模式：替换原有 Blogger
			const updated = bloggers.map(b => (b.url === editingBlogger.url ? updatedBlogger : b))
			setBloggers(updated)
		} else {
			// 新增模式：追加到列表末尾
			setBloggers([...bloggers, updatedBlogger])
		}
	}

	// 删除博主（弹窗确认）
	const handleDelete = (blogger: Blogger) => {
		if (confirm(`确定要删除 ${blogger.name} 吗？`)) {
			setBloggers(bloggers.filter(b => b.url !== blogger.url))
		}
	}

	// 选择并导入私钥文件（.pem 格式）
	const handleChoosePrivateKey = async (file: File) => {
		try {
			const text = await file.text()
			setPrivateKey(text)        // 存储到全局 store
			// 选择密钥后自动执行保存操作（将当前博主列表推送到远端）
			await handleSave()
		} catch (error) {
			console.error('Failed to read private key:', error)
			toast.error('读取密钥文件失败')
		}
	}

	// 点击保存按钮时的处理：若未认证则触发文件选择，否则直接保存
	const handleSaveClick = () => {
		if (!isAuth) {
			keyInputRef.current?.click()   // 弹出文件选择框
		} else {
			handleSave()
		}
	}

	// 实际执行保存操作：调用 pushBloggers 上传数据
	const handleSave = async () => {
		setIsSaving(true)
		try {
			// 调用服务函数，传入当前博主列表和待上传的头像映射
			await pushBloggers({
				bloggers,
				avatarItems
			})
			// 保存成功后，同步原始数据，清空暂存的头像，退出编辑模式
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

	// 取消编辑：恢复到原始博主列表，清空暂存头像，退出编辑模式
	const handleCancel = () => {
		setBloggers(originalBloggers)
		setAvatarItems(new Map())
		setIsEditMode(false)
	}

	// 动态按钮文字：已认证显示“保存”，未认证显示“导入密钥”
	const buttonText = isAuth ? '保存' : '导入密钥'

	// ---------- 副作用 ----------
	// 监听键盘快捷键 Ctrl/Cmd + , 进入编辑模式（仅在非编辑模式下生效）
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

	// ---------- 渲染 ----------
	return (
		<>
			{/* 隐藏的文件输入框，用于选择私钥文件（仅 .pem 格式） */}
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				className='hidden'
				onChange={async e => {
					const f = e.target.files?.[0]
					if (f) await handleChoosePrivateKey(f)
					// 清空 value，允许重复选择同一个文件时再次触发 onChange
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			{/* 博主网格视图，支持编辑模式下的拖拽排序、修改和删除 */}
			<GridView bloggers={bloggers} isEditMode={isEditMode} onUpdate={handleUpdate} onDelete={handleDelete} />

			{/* 右上角操作按钮组，带入场动画，在移动端（max-sm）隐藏 */}
			<motion.div
				initial={{ opacity: 0, scale: 0.6 }}
				animate={{ opacity: 1, scale: 1 }}
				className='absolute top-4 right-6 flex gap-3 max-sm:hidden'
			>
				{isEditMode ? (
					// 编辑模式下显示：取消、添加、保存/导入密钥
					<>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleCancel}
							disabled={isSaving}
							className='rounded-xl border bg-white/60 px-6 py-2 text-sm'
						>
							取消
						</motion.button>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleAdd}
							className='rounded-xl border bg-white/60 px-6 py-2 text-sm'
						>
							添加
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
					</>
				) : (
					// 非编辑模式下，如果不隐藏编辑按钮则显示“编辑”按钮
					!hideEditButton && (
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={() => setIsEditMode(true)}
							className='bg-card rounded-xl border px-6 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/80'
						>
							编辑
						</motion.button>
					)
				)}
			</motion.div>

			{/* 创建/编辑弹窗，当 isCreateDialogOpen 为 true 时渲染 */}
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
