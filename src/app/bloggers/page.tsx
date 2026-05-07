// 声明这是一个 React 客户端组件（Next.js 13+ App Router 语法）
'use client'

// 导入 React 核心 hooks
import { useState, useRef, useEffect } from 'react'
// 导入 Framer Motion 动画库组件
import { motion } from 'motion/react'
// 导入 Sonner 消息提示库
import { toast } from 'sonner'
// 导入自定义网格视图组件及其类型定义
import GridView, { type Blogger } from './grid-view'
// 导入自定义创建对话框组件
import CreateDialog from './components/create-dialog'
// 导入保存博主数据的服务函数
import { pushBloggers } from './services/push-bloggers'
// 导入认证状态管理的 store
import { useAuthStore } from '@/hooks/use-auth'
// 导入配置状态管理的 store
import { useConfigStore } from '@/app/(home)/stores/config-store'
// 导入初始博主列表数据
import initialList from './list.json'
// 导入头像上传组件的类型定义
import type { AvatarItem } from './components/avatar-upload-dialog'

// 定义并导出默认的页面组件
export default function Page() {
	// --- 状态管理 (State) ---
	
	// 当前显示的博主列表
	const [bloggers, setBloggers] = useState<Blogger[]>(initialList as Blogger[])
	// 原始博主列表（用于取消编辑时回滚）
	const [originalBloggers, setOriginalBloggers] = useState<Blogger[]>(initialList as Blogger[])
	// 是否处于编辑模式
	const [isEditMode, setIsEditMode] = useState(false)
	// 是否正在保存数据
	const [isSaving, setIsSaving] = useState(false)
	// 当前正在编辑的博主对象（null 表示新建）
	const [editingBlogger, setEditingBlogger] = useState<Blogger | null>(null)
	// 是否打开创建/编辑对话框
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
	// 存储头像文件的 Map (key: 博主url, value: 头像对象)
	const [avatarItems, setAvatarItems] = useState<Map<string, AvatarItem>>(new Map())
	// 隐藏的文件输入框引用（用于导入密钥）
	const keyInputRef = useRef<HTMLInputElement>(null)

	// --- 全局状态 (Store) ---
	
	// 从认证 store 获取认证状态和设置私钥的方法
	const { isAuth, setPrivateKey } = useAuthStore()
	// 从配置 store 获取网站内容配置
	const { siteContent } = useConfigStore()
	// 是否隐藏编辑按钮（默认为 false）
	const hideEditButton = siteContent.hideEditButton ?? false

	// --- 事件处理函数 (Handlers) ---

	// 更新单个博主信息
	const handleUpdate = (updatedBlogger: Blogger, oldBlogger: Blogger, avatarItem?: AvatarItem) => {
		// 更新列表中的对应博主
		setBloggers(prev => prev.map(b => (b.url === oldBlogger.url ? updatedBlogger : b)))
		// 如果有新头像，更新头像 Map
		if (avatarItem) {
			setAvatarItems(prev => {
				const newMap = new Map(prev)
				newMap.set(updatedBlogger.url, avatarItem)
				return newMap
			})
		}
	}

	// 点击"添加"按钮
	const handleAdd = () => {
		setEditingBlogger(null) // 清空当前编辑对象，表示新建
		setIsCreateDialogOpen(true) // 打开对话框
	}

	// 保存新建或编辑后的博主
	const handleSaveBlogger = (updatedBlogger: Blogger) => {
		if (editingBlogger) {
			// 如果是编辑模式，替换旧数据
			const updated = bloggers.map(b => (b.url === editingBlogger.url ? updatedBlogger : b))
			setBloggers(updated)
		} else {
			// 如果是新建模式，添加到列表末尾
			setBloggers([...bloggers, updatedBlogger])
		}
	}

	// 删除博主
	const handleDelete = (blogger: Blogger) => {
		// 弹出确认框
		if (confirm(`确定要删除 ${blogger.name} 吗？`)) {
			// 过滤掉被删除的博主
			setBloggers(bloggers.filter(b => b.url !== blogger.url))
		}
	}

	// 处理选择私钥文件
	const handleChoosePrivateKey = async (file: File) => {
		try {
			// 读取文件内容为文本
			const text = await file.text()
			setPrivateKey(text) // 更新 store 中的私钥
			// 选择文件后自动触发保存
			await handleSave()
		} catch (error) {
			console.error('Failed to read private key:', error)
			toast.error('读取密钥文件失败')
		}
	}

	// 点击"保存"按钮时的逻辑
	const handleSaveClick = () => {
		if (!isAuth) {
			// 如果未认证，触发隐藏的文件选择框来导入密钥
			keyInputRef.current?.click()
		} else {
			// 如果已认证，直接保存
			handleSave()
		}
	}

	// 实际执行保存的异步函数
	const handleSave = async () => {
		setIsSaving(true) // 开启保存中状态

		try {
			// 调用服务端 API 保存博主数据和头像
			await pushBloggers({
				bloggers,
				avatarItems
			})

			// 保存成功后的清理工作
			setOriginalBloggers(bloggers) // 更新原始数据为当前数据
			setAvatarItems(new Map()) // 清空头像暂存
			setIsEditMode(false) // 退出编辑模式
			toast.success('保存成功！') // 显示成功提示
		} catch (error: any) {
			console.error('Failed to save:', error)
			toast.error(`保存失败: ${error?.message || '未知错误'}`) // 显示失败提示
		} finally {
			setIsSaving(false) // 无论成功失败，关闭保存中状态
		}
	}

	// 取消编辑
	const handleCancel = () => {
		setBloggers(originalBloggers) // 回滚数据到原始状态
		setAvatarItems(new Map()) // 清空头像暂存
		setIsEditMode(false) // 退出编辑模式
	}

	// 根据认证状态决定按钮显示文字
	const buttonText = isAuth ? '保存' : '导入密钥'

	// --- 副作用 (Effects) ---

	// 监听键盘快捷键
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// 如果不在编辑模式，且按下了 Ctrl/Cmd + , (逗号)
			if (!isEditMode && (e.ctrlKey || e.metaKey) && e.key === ',') {
				e.preventDefault()
				setIsEditMode(true) // 进入编辑模式
			}
		}

		// 绑定键盘事件
		window.addEventListener('keydown', handleKeyDown)
		// 组件卸载时解绑事件
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [isEditMode])

	// --- 渲染 (Render) ---

	return (
		<>
			{/* 隐藏的文件输入框，用于选择 .pem 密钥文件 */}
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				className='hidden'
				onChange={async e => {
					const f = e.target.files?.[0]
					if (f) await handleChoosePrivateKey(f)
					// 清空 input 值，允许重复选择同一文件
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			{/* 博主列表网格视图 */}
			<GridView bloggers={bloggers} isEditMode={isEditMode} onUpdate={handleUpdate} onDelete={handleDelete} />

			{/* 右上角的操作按钮组 (带动画效果) */}
			<motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className='absolute top-4 right-6 flex gap-3 max-sm:hidden'>
				{isEditMode ? (
					// 编辑模式下显示的按钮
					<>
						{/* 取消按钮 */}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleCancel}
							disabled={isSaving}
							className='rounded-xl border bg-white/60 px-6 py-2 text-sm'>
							取消
						</motion.button>
						{/* 添加按钮 */}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleAdd}
							className='rounded-xl border bg-white/60 px-6 py-2 text-sm'>
							添加
						</motion.button>
						{/* 保存/导入密钥按钮 */}
						<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSaveClick} disabled={isSaving} className='brand-btn px-6'>
							{isSaving ? '保存中...' : buttonText}
						</motion.button>
					</>
				) : (
					// 非编辑模式下显示"编辑"按钮（如果配置允许）
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

			{/* 创建/编辑博主的对话框 */}
			{isCreateDialogOpen && <CreateDialog blogger={editingBlogger} onClose={() => setIsCreateDialogOpen(false)} onSave={handleSaveBlogger} />}
		</>
	)
}