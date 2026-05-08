'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
// 项目卡片组件与 Project 类型
import { ProjectCard, type Project } from './components/project-card'
// 创建/编辑项目的弹窗组件
import CreateDialog from './components/create-dialog'
// 向远程推送项目数据的服务函数
import { pushProjects } from './services/push-projects'
// 鉴权状态管理（是否已导入密钥）
import { useAuthStore } from '@/hooks/use-auth'
// 站点全局配置（如是否隐藏编辑按钮）
import { useConfigStore } from '@/app/(home)/stores/config-store'
// 初始项目列表数据（来自本地 JSON）
import initialList from './list.json'
// 图片上传对话框相关的图片项类型
import type { ImageItem } from './components/image-upload-dialog'

export default function Page() {
	// 当前展示和编辑的项目列表
	const [projects, setProjects] = useState<Project[]>(initialList as Project[])
	// 原始项目列表的副本，用于取消编辑时恢复
	const [originalProjects, setOriginalProjects] = useState<Project[]>(initialList as Project[])
	// 是否处于编辑模式
	const [isEditMode, setIsEditMode] = useState(false)
	// 是否正在保存
	const [isSaving, setIsSaving] = useState(false)
	// 当前被编辑的项目（新建时为 null）
	const [editingProject, setEditingProject] = useState<Project | null>(null)
	// 创建/编辑对话框的显隐
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
	// 记录每个项目对应的图片上传项（key 为项目 url）
	const [imageItems, setImageItems] = useState<Map<string, ImageItem>>(new Map())
	// 隐藏的文件选择 input，用于导入密钥
	const keyInputRef = useRef<HTMLInputElement>(null)

	// 是否已认证（已导入私钥）
	const { isAuth, setPrivateKey } = useAuthStore()
	// 从全局配置中获取站点内容对象，使用可选链避免 undefined 报错
	const { siteContent } = useConfigStore()
	const hideEditButton = siteContent?.hideEditButton ?? false

	// 更新某个项目，并可附带新的图片项
	const handleUpdate = (updatedProject: Project, oldProject: Project, imageItem?: ImageItem) => {
		setProjects(prev => prev.map(p => (p.url === oldProject.url ? updatedProject : p)))
		if (imageItem) {
			setImageItems(prev => {
				const newMap = new Map(prev)
				newMap.set(updatedProject.url, imageItem)
				return newMap
			})
		}
	}

	// 点击“添加”按钮
	const handleAdd = () => {
		setEditingProject(null) // 新建时没有正在编辑的项目
		setIsCreateDialogOpen(true)
	}

	// 保存创建/编辑对话框中的项目
	const handleSaveProject = (updatedProject: Project) => {
		if (editingProject) {
			// 编辑已有项目：替换对应项目
			const updated = projects.map(p => (p.url === editingProject.url ? updatedProject : p))
			setProjects(updated)
		} else {
			// 新建项目：添加到列表末尾
			setProjects([...projects, updatedProject])
		}
	}

	// 删除项目
	const handleDelete = (project: Project) => {
		if (confirm(`确定要删除 ${project.name} 吗？`)) {
			setProjects(projects.filter(p => p.url !== project.url))
		}
	}

	// 处理用户选择的私钥文件
	const handleChoosePrivateKey = async (file: File) => {
		try {
			const text = await file.text()
			setPrivateKey(text) // 将密钥文本存入全局状态
			await handleSave() // 导入密钥后立即尝试保存
		} catch (error) {
			console.error('Failed to read private key:', error)
			toast.error('读取密钥文件失败')
		}
	}

	// 点击保存按钮：未认证则触发密钥文件选择，已认证则直接保存
	const handleSaveClick = () => {
		if (!isAuth) {
			keyInputRef.current?.click()
		} else {
			handleSave()
		}
	}

	// 执行保存操作，将项目列表和图片项推送到远程
	const handleSave = async () => {
		setIsSaving(true)

		try {
			await pushProjects({
				projects,
				imageItems
			})

			// 保存成功后更新原始数据，清空图片暂存，退出编辑模式
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

	// 取消编辑：恢复原始项目列表，清空图片暂存
	const handleCancel = () => {
		setProjects(originalProjects)
		setImageItems(new Map())
		setIsEditMode(false)
	}

	// 根据认证状态动态显示按钮文字
	const buttonText = isAuth ? '保存' : '导入密钥'

	// 全局快捷键：Ctrl + , 进入编辑模式
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
			{/* 隐藏的密钥文件选择器 */}
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				className='hidden'
				onChange={async e => {
					const f = e.target.files?.[0]
					if (f) await handleChoosePrivateKey(f)
					// 清空 input 值，以便重新选择同一个文件时仍能触发 onChange
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			{/* 项目卡片网格 */}
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

			{/* 悬浮操作按钮区域（大屏可见） */}
			<motion.div
				initial={{ opacity: 0, scale: 0.6 }}
				animate={{ opacity: 1, scale: 1 }}
				className='absolute top-4 right-6 flex gap-3 max-sm:hidden'
			>
				{isEditMode ? (
					// 编辑模式下显示取消、添加、保存按钮
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
					// 非编辑模式且配置未隐藏编辑按钮时，显示编辑按钮
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

			{/* 创建/编辑对话框 */}
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
