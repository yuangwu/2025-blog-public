'use client'

// 导入 React 常用的 hooks
import { useState, useRef, useEffect } from 'react'
// 导入动画库 motion (来自 motion/react)
import { motion } from 'motion/react'
// 导入 toast 通知库
import { toast } from 'sonner'
// 导入项目卡片组件和 Project 类型
import { ProjectCard, type Project } from './components/project-card'
// 导入新建/编辑项目的对话框组件
import CreateDialog from './components/create-dialog'
// 导入保存项目到远程的服务
import { pushProjects } from './services/push-projects'
// 导入认证状态管理 store
import { useAuthStore } from '@/hooks/use-auth'
// 导入站点配置 store，例如是否隐藏编辑按钮
import { useConfigStore } from '@/app/(home)/stores/config-store'
// 初始列表数据（本地 JSON）
import initialList from './list.json'
// 图片项类型（用于上传/管理项目图片）
import type { ImageItem } from './components/image-upload-dialog'

// 页面组件
export default function Page() {
	// 当前展示和编辑的项目列表，默认使用初始数据
	const [projects, setProjects] = useState<Project[]>(initialList as Project[])
	// 编辑前的原始项目列表，用于取消时恢复
	const [originalProjects, setOriginalProjects] = useState<Project[]>(initialList as Project[])
	// 是否处于编辑模式（显示编辑、添加、保存按钮）
	const [isEditMode, setIsEditMode] = useState(false)
	// 是否正在保存中
	const [isSaving, setIsSaving] = useState(false)
	// 当前正在编辑的项目（用于修改现有项目）
	const [editingProject, setEditingProject] = useState<Project | null>(null)
	// 创建对话框的开关状态
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
	// 存储项目相关的图片项映射（key: 项目 url, value: 图片信息）
	const [imageItems, setImageItems] = useState<Map<string, ImageItem>>(new Map())
	// 用于隐藏的文件导入 input 的 ref，触发私钥选择
	const keyInputRef = useRef<HTMLInputElement>(null)

	// 认证状态与设置私钥的方法
	const { isAuth, setPrivateKey } = useAuthStore()
	// 站点配置，例如是否隐藏编辑按钮
	const { siteContent } = useConfigStore()
	const hideEditButton = siteContent.hideEditButton ?? false

	// 处理项目更新（修改名称、描述等，同时可能附带图片）
	const handleUpdate = (updatedProject: Project, oldProject: Project, imageItem?: ImageItem) => {
		setProjects(prev => prev.map(p => (p.url === oldProject.url ? updatedProject : p)))
		// 如果有新图片，更新对应项目的图片项
		if (imageItem) {
			setImageItems(prev => {
				const newMap = new Map(prev)
				newMap.set(updatedProject.url, imageItem)
				return newMap
			})
		}
	}

	// 打开创建新项目的对话框
	const handleAdd = () => {
		setEditingProject(null)      // 确保没有编辑中的项目
		setIsCreateDialogOpen(true)  // 打开对话框
	}

	// 保存新建或编辑的项目
	const handleSaveProject = (updatedProject: Project) => {
		if (editingProject) {
			// 编辑模式：替换对应项目
			const updated = projects.map(p => (p.url === editingProject.url ? updatedProject : p))
			setProjects(updated)
		} else {
			// 新建模式：添加到列表
			setProjects([...projects, updatedProject])
		}
	}

	// 删除项目，需要二次确认
	const handleDelete = (project: Project) => {
		if (confirm(`确定要删除 ${project.name} 吗？`)) {
			setProjects(projects.filter(p => p.url !== project.url))
		}
	}

	// 用户选择私钥文件，读取内容并设置到认证 store，然后自动保存
	const handleChoosePrivateKey = async (file: File) => {
		try {
			const text = await file.text()
			setPrivateKey(text)     // 将私钥文本存入 store
			await handleSave()      // 设置私钥后直接保存
		} catch (error) {
			console.error('Failed to read private key:', error)
			toast.error('读取密钥文件失败')
		}
	}

	// 点击保存按钮，如果未认证则触发文件选择，否则直接保存
	const handleSaveClick = () => {
		if (!isAuth) {
			keyInputRef.current?.click()  // 模拟点击隐藏的 input 选择私钥
		} else {
			handleSave()
		}
	}

	// 保存项目数据到远程（附带图片信息）
	const handleSave = async () => {
		setIsSaving(true)
		try {
			await pushProjects({
				projects,
				imageItems
			})
			// 保存成功后，更新原始项目列表，清空图片改动记录，退出编辑模式
			setOriginalProjects(projects)
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

	// 取消编辑，恢复为原始项目列表并清空图片改动
	const handleCancel = () => {
		setProjects(originalProjects)
		setImageItems(new Map())
		setIsEditMode(false)
	}

	// 按钮文字，根据认证状态显示不同内容
	const buttonText = isAuth ? '保存' : '导入密钥'

	// 注册全局键盘快捷键：Ctrl/Cmd + , 进入编辑模式
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!isEditMode && (e.ctrlKey || e.metaKey) && e.key === ',') {
				e.preventDefault()           // 阻止浏览器默认行为（如打开设置）
				setIsEditMode(true)          // 进入编辑模式
			}
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [isEditMode])

	return (
		<>
			{/* 隐藏的文件导入 input，用于选择 .pem 私钥文件 */}
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				className='hidden'
				onChange={async e => {
					const f = e.target.files?.[0]
					if (f) await handleChoosePrivateKey(f)
					// 清空 input 值，保证再次选择同一文件仍能触发 onChange
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			{/* 项目卡片网格容器 */}
			<div className='flex flex-col items-center justify-center px-6 pt-32 pb-12'>
				<div className='grid w-full max-w-[1200px] grid-cols-2 gap-6 max-md:grid-cols-1'>
					{projects.map((project, index) => (
						<ProjectCard 
							key={project.url} 
							project={project} 
							isEditMode={isEditMode} 
							onUpdate={handleUpdate} 
							onDelete={() => handleDelete(project)} 
						/>
					))}
				</div>
			</div>

			{/* 悬浮在右上角的编辑/保存工具栏，小屏幕下隐藏 */}
			<motion.div 
				initial={{ opacity: 0, scale: 0.6 }} 
				animate={{ opacity: 1, scale: 1 }} 
				className='absolute top-4 right-6 flex gap-3 max-sm:hidden'
			>
				{isEditMode ? (
					<>
						{/* 取消按钮，恢复数据并退出编辑 */}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleCancel}
							disabled={isSaving}
							className='rounded-xl border bg-white/60 px-6 py-2 text-sm'>
							取消
						</motion.button>
						{/* 添加新项目按钮 */}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleAdd}
							className='rounded-xl border bg-white/60 px-6 py-2 text-sm'>
							添加
						</motion.button>
						{/* 保存/导入密钥按钮 */}
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
					// 非编辑模式且未隐藏编辑按钮时显示“编辑”入口
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

			{/* 新建/编辑项目的对话框 */}
			{isCreateDialogOpen && (
				<CreateDialog 
					project={editingProject} 
					onClose={() => setIsCreateDialogOpen(false)} 
					onSave={handleSaveProject} 
				/>
			)}
		</>
	)
}