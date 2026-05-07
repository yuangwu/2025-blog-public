'use client'
// 标记此组件为客户端组件，仅在浏览器端运行

import { useEffect, useRef, useState } from 'react'
// 导入 React 的核心 Hook
import { motion } from 'motion/react'
// 导入 Framer Motion 动画库的 motion 组件
import { toast } from 'sonner'
// 导入 sonner 轻量级提示库
import { Plus, X } from 'lucide-react'
// 导入 lucide-react 图标库中的加号和关闭图标
import { DialogModal } from '@/components/dialog-modal'
// 导入自定义的模态对话框组件
import { useAuthStore } from '@/hooks/use-auth'
// 导入认证状态管理 Hook
import { useConfigStore } from '@/app/(home)/stores/config-store'
// 导入配置状态管理 Hook
import initialList from './list.json'
// 从本地 JSON 文件导入初始句子列表
import { pushSnippets } from './services/push-snippets'
// 导入将句子推送到后端的服务函数

/**
 * 从给定的句子数组中随机返回一个句子
 * @param list - 句子数组
 * @returns 随机句子，数组为空时返回空字符串
 */
const getRandomSnippet = (list: string[]) => (list.length === 0 ? '' : list[Math.floor(Math.random() * list.length)])

export default function Page() {
	// 当前有效的句子列表（可编辑）
	const [snippets, setSnippets] = useState<string[]>(initialList as string[])
	// 编辑前的原始句子列表，用于取消编辑时恢复
	const [originalSnippets, setOriginalSnippets] = useState<string[]>(initialList as string[])
	// 当前显示的随机句子
	const [currentSnippet, setCurrentSnippet] = useState<string>(getRandomSnippet(initialList as string[]))
	// 是否处于编辑模式
	const [isEditMode, setIsEditMode] = useState(false)
	// 是否正在保存
	const [isSaving, setIsSaving] = useState(false)
	// 是否打开管理句子弹窗
	const [isManageOpen, setIsManageOpen] = useState(false)
	// 管理弹窗中的临时刻表草稿
	const [draftSnippets, setDraftSnippets] = useState<string[]>([])
	// 管理弹窗中新增句子的输入值
	const [newSnippet, setNewSnippet] = useState('')
	// 隐藏的密钥文件选择器引用
	const keyInputRef = useRef<HTMLInputElement>(null)

	// 获取认证状态及设置私钥的方法
	const { isAuth, setPrivateKey } = useAuthStore()
	// 获取站点配置，例如是否隐藏编辑按钮
	const { siteContent } = useConfigStore()
	const hideEditButton = siteContent.hideEditButton ?? false

	// 注册全局键盘快捷键：Ctrl/Cmd + , 进入编辑模式
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// 仅在非编辑模式下响应快捷键
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

	/**
	 * 保存句子变更
	 * 先调用后端接口推送数据，成功后更新原始记录并退出编辑模式
	 */
	const handleSave = async () => {
		setIsSaving(true)
		try {
			await pushSnippets({ snippets })
			setOriginalSnippets(snippets)
			setIsEditMode(false)
			toast.success('保存成功！')
		} catch (error: any) {
			console.error('Failed to save snippets:', error)
			toast.error(`保存失败: ${error?.message || '未知错误'}`)
		} finally {
			setIsSaving(false)
		}
	}

	/**
	 * 保存按钮点击处理
	 * - 若用户未认证（未提供密钥），则触发密钥文件选择器
	 * - 否则直接执行保存
	 */
	const handleSaveClick = () => {
		if (!isAuth) {
			keyInputRef.current?.click()
		} else {
			void handleSave()
		}
	}

	// 取消编辑：丢弃所有修改，恢复为原始句子列表
	const handleCancel = () => {
		setSnippets(originalSnippets)
		setIsEditMode(false)
	}

	/**
	 * 用户选择了私钥文件后的处理
	 * 读取文件内容并存入状态，然后执行保存流程
	 */
	const handleChoosePrivateKey = async (file: File) => {
		try {
			const text = await file.text()
			await setPrivateKey(text)
			await handleSave()
		} catch (error) {
			console.error('Failed to read private key:', error)
			toast.error('读取密钥文件失败')
		}
	}

	// 打开管理弹窗，初始化草稿列表
	const openManageDialog = () => {
		setDraftSnippets(snippets)
		setNewSnippet('')
		setIsManageOpen(true)
	}

	// 在管理弹窗中添加一条新句子
	const handleAddDraft = () => {
		const value = newSnippet.trim()
		if (!value) {
			toast.error('请输入句子')
			return
		}
		setDraftSnippets(prev => [...prev, value])
		setNewSnippet('')
	}

	// 在管理弹窗中移除指定句子
	const handleRemoveDraft = (index: number) => {
		setDraftSnippets(prev => prev.filter((_, i) => i !== index))
	}

	// 应用管理弹窗的更改：清洗数据后更新主句子列表
	const applyManageChanges = () => {
		const cleaned = draftSnippets.map(item => item.trim()).filter(Boolean)
		if (cleaned.length === 0) {
			toast.error('请至少添加一句话')
			return
		}
		setSnippets(cleaned)
		setIsManageOpen(false)
		toast.success('已更新列表')
	}

	// 取消管理弹窗的更改，直接关闭
	const cancelManageChanges = () => {
		setIsManageOpen(false)
		setDraftSnippets([])
		setNewSnippet('')
	}

	// 根据认证状态动态设置保存按钮文案
	const buttonText = isAuth ? '保存' : '导入密钥'

	return (
		<>
			{/* 隐藏的密钥文件选择器，由 ref 控制触发 */}
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				className='hidden'
				onChange={async e => {
					const file = e.target.files?.[0]
					if (file) await handleChoosePrivateKey(file)
					// 重置 input 值，确保相同文件可再次触发 onChange
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			{/* 主内容区：居中显示当前随机句子 */}
			<div className='flex min-h-[70vh] flex-col items-center justify-center px-6 py-24'>
				<div className='w-full max-w-3xl text-center'>
					<p className='text-2xl leading-relaxed font-semibold'>{currentSnippet || '无'}</p>
				</div>
			</div>

			{/* 右上角操作按钮区域，小屏幕隐藏 */}
			<motion.div
				initial={{ opacity: 0, scale: 0.6 }}
				animate={{ opacity: 1, scale: 1 }}
				className='absolute top-4 right-6 flex gap-3 max-sm:hidden'
			>
				{/* 编辑模式下的按钮组 */}
				{isEditMode ? (
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
							onClick={openManageDialog}
							className='rounded-xl border bg-white/60 px-6 py-2 text-sm'
						>
							管理
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
					// 非编辑模式且允许显示编辑按钮时才渲染
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

			{/* 管理句子弹窗 */}
			<DialogModal
				open={isManageOpen}
				onClose={cancelManageChanges}
				className='card static w-[520px] max-sm:w-full'
			>
				<div className='space-y-4'>
					{/* 新增句子输入行 */}
					<div className='flex items-center gap-3'>
						<input
							type='text'
							value={newSnippet}
							onChange={e => setNewSnippet(e.target.value)}
							placeholder='新增'
							className='flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none'
						/>
						<button
							onClick={handleAddDraft}
							className='brand-btn flex items-center gap-1 px-4 py-2 text-sm'
						>
							<Plus className='h-4 w-4' />
							新增
						</button>
					</div>

					{/* 草稿句子列表 */}
					<div className='max-h-[320px] space-y-2 overflow-y-auto pr-1'>
						{draftSnippets.length === 0 && (
							<p className='text-secondary py-6 text-center text-sm'>暂无内容</p>
						)}
						{draftSnippets.map((item, index) => (
							<div
								key={`${item}-${index}`}
								className='group flex items-start gap-3 rounded-lg px-3 py-2 text-sm'
							>
								<p className='flex-1 leading-relaxed text-gray-800'>{item}</p>
								<button
									onClick={() => handleRemoveDraft(index)}
									className='text-gray-400 transition-colors hover:text-red-500'
								>
									<X className='h-4 w-4' />
								</button>
							</div>
						))}
					</div>

					{/* 底部操作按钮 */}
					<div className='mt-4 flex gap-3'>
						<button
							onClick={cancelManageChanges}
							className='flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm transition-colors hover:bg-gray-50'
						>
							取消
						</button>
						<button
							onClick={applyManageChanges}
							className='brand-btn flex-1 justify-center px-4'
						>
							保存
						</button>
					</div>
				</div>
			</DialogModal>
		</>
	)
}