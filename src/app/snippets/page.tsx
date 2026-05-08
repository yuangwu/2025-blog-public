'use client' // 标记为客户端组件，允许使用浏览器 API 和 hooks

import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react' // 引入 motion 动画库
import { toast } from 'sonner' // 引入 toast 通知库
import { Plus, X } from 'lucide-react' // 引入图标组件
import { DialogModal } from '@/components/dialog-modal' // 自定义对话框组件
import { useAuthStore } from '@/hooks/use-auth' // 认证状态管理 hook
import { useConfigStore } from '@/app/(home)/stores/config-store' // 站点配置状态管理 hook
import initialList from './list.json' // 初始句子列表 JSON 文件
import { pushSnippets } from './services/push-snippets' // 保存句子到远程的服务函数

/**
 * 从列表中随机获取一个句子
 * @param list 句子数组
 * @returns 随机句子，若列表为空则返回空字符串
 */
const getRandomSnippet = (list: string[]) =>
	list.length === 0 ? '' : list[Math.floor(Math.random() * list.length)]

export default function Page() {
	// 当前可编辑的句子列表（草稿状态）
	const [snippets, setSnippets] = useState<string[]>(initialList as string[])
	// 保存前的原始句子列表，用于取消编辑恢复
	const [originalSnippets, setOriginalSnippets] = useState<string[]>(initialList as string[])
	// 当前展示的随机句子
	const [currentSnippet, setCurrentSnippet] = useState<string>(
		getRandomSnippet(initialList as string[])
	)
	// 是否处于编辑模式
	const [isEditMode, setIsEditMode] = useState(false)
	// 是否正在保存中
	const [isSaving, setIsSaving] = useState(false)
	// 管理弹窗是否打开
	const [isManageOpen, setIsManageOpen] = useState(false)
	// 管理弹窗中的句子草稿列表
	const [draftSnippets, setDraftSnippets] = useState<string[]>([])
	// 管理弹窗中的新句子输入内容
	const [newSnippet, setNewSnippet] = useState('')
	// 用于触发文件选择 input 的引用（导入密钥时）
	const keyInputRef = useRef<HTMLInputElement>(null)

	// 从认证 hook 获取认证状态和设置私钥的方法
	const { isAuth, setPrivateKey } = useAuthStore()
	// 从配置 hook 获取站点内容配置
	const { siteContent } = useConfigStore()
	// 是否隐藏编辑按钮，默认显示
	const hideEditButton = siteContent.hideEditButton ?? false

	// 注册全局快捷键：Ctrl/Cmd + , 进入编辑模式
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// 只在非编辑模式且按下 Ctrl/Cmd + , 时触发
			if (!isEditMode && (e.ctrlKey || e.metaKey) && e.key === ',') {
				e.preventDefault() // 阻止浏览器默认行为（如打开设置）
				setIsEditMode(true)
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown) // 清理事件监听
		}
	}, [isEditMode]) // 依赖 isEditMode 以避免闭包陈旧值

	/**
	 * 保存句子列表到远程
	 */
	const handleSave = async () => {
		setIsSaving(true) // 开始保存，显示加载状态
		try {
			await pushSnippets({ snippets }) // 调用保存接口
			setOriginalSnippets(snippets) // 更新原始数据为当前数据
			setIsEditMode(false) // 退出编辑模式
			toast.success('保存成功！')
		} catch (error: any) {
			console.error('Failed to save snippets:', error)
			toast.error(`保存失败: ${error?.message || '未知错误'}`)
		} finally {
			setIsSaving(false) // 结束保存状态
		}
	}

	/**
	 * 点击保存按钮的处理：若未认证则触发导入私钥，否则直接保存
	 */
	const handleSaveClick = () => {
		if (!isAuth) {
			// 未认证时，模拟点击隐藏的文件 input，引导用户选择私钥文件
			keyInputRef.current?.click()
		} else {
			void handleSave() // 已认证直接保存
		}
	}

	/**
	 * 取消编辑：恢复为原始句子列表并退出编辑模式
	 */
	const handleCancel = () => {
		setSnippets(originalSnippets)
		setIsEditMode(false)
	}

	/**
	 * 处理用户选择的私钥文件：读取内容、设置私钥并保存
	 */
	const handleChoosePrivateKey = async (file: File) => {
		try {
			const text = await file.text() // 读取 .pem 文件内容
			await setPrivateKey(text) // 存储私钥到状态
			await handleSave() // 自动触发保存
		} catch (error) {
			console.error('Failed to read private key:', error)
			toast.error('读取密钥文件失败')
		}
	}

	/**
	 * 打开管理弹窗：初始化草稿列表和新句子输入
	 */
	const openManageDialog = () => {
		setDraftSnippets(snippets) // 将当前句子列表复制到弹窗草稿中
		setNewSnippet('')
		setIsManageOpen(true)
	}

	/**
	 * 在管理弹窗中添加一条新句子
	 */
	const handleAddDraft = () => {
		const value = newSnippet.trim()
		if (!value) {
			toast.error('请输入句子')
			return
		}
		setDraftSnippets(prev => [...prev, value]) // 追加到草稿列表
		setNewSnippet('') // 清空输入框
	}

	/**
	 * 从管理弹窗草稿列表中移除指定索引的句子
	 */
	const handleRemoveDraft = (index: number) => {
		setDraftSnippets(prev => prev.filter((_, i) => i !== index))
	}

	/**
	 * 应用管理弹窗的修改：清除空项并更新正式句子列表
	 */
	const applyManageChanges = () => {
		const cleaned = draftSnippets.map(item => item.trim()).filter(Boolean) // 去空格、去空字符串
		if (cleaned.length === 0) {
			toast.error('请至少添加一句话')
			return
		}
		setSnippets(cleaned)
		setIsManageOpen(false)
		toast.success('已更新列表')
	}

	/**
	 * 取消管理弹窗的修改，关闭弹窗并重置草稿数据
	 */
	const cancelManageChanges = () => {
		setIsManageOpen(false)
		setDraftSnippets([])
		setNewSnippet('')
	}

	// 根据认证状态动态显示按钮文字
	const buttonText = isAuth ? '保存' : '导入密钥'

	return (
		<>
			{/* 隐藏的文件输入，用于导入私钥文件 */}
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				className='hidden'
				onChange={async e => {
					const file = e.target.files?.[0]
					if (file) await handleChoosePrivateKey(file)
					// 清空 input 值，以便再次选择同一文件时仍触发 onChange
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			{/* 主内容区：居中显示当前随机句子 */}
			<div className='flex min-h-[70vh] flex-col items-center justify-center px-6 py-24'>
				<div className='w-full max-w-3xl text-center'>
					<p className='text-2xl leading-relaxed font-semibold'>
						{currentSnippet || '无'}
					</p>
				</div>
			</div>

			{/* 右上角浮动的操作按钮，仅在编辑模式显示，小屏幕隐藏 */}
			<motion.div
				initial={{ opacity: 0, scale: 0.6 }}
				animate={{ opacity: 1, scale: 1 }}
				className='absolute top-4 right-6 flex gap-3 max-sm:hidden'
			>
				{isEditMode ? (
					<>
						{/* 取消按钮：恢复原始数据并退出编辑 */}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleCancel}
							disabled={isSaving}
							className='rounded-xl border bg-white/60 px-6 py-2 text-sm'
						>
							取消
						</motion.button>
						{/* 管理按钮：打开句子管理弹窗 */}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={openManageDialog}
							className='rounded-xl border bg-white/60 px-6 py-2 text-sm'
						>
							管理
						</motion.button>
						{/* 保存 / 导入密钥按钮 */}
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
					// 非编辑模式且未隐藏编辑按钮时，显示编辑按钮
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

			{/* 管理弹窗：新增 / 删除句子 */}
			<DialogModal
				open={isManageOpen}
				onClose={cancelManageChanges}
				className='card static w-[520px] max-sm:w-full'
			>
				<div className='space-y-4'>
					{/* 新增句子输入区 */}
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

					{/* 草稿句子列表，可滚动 */}
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

					{/* 弹窗底部操作按钮 */}
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
