'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import GridView from './grid-view'
import CreateDialog from './components/create-dialog'
import { pushShares } from './services/push-shares'
import { useAuthStore } from '@/hooks/use-auth'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import initialList from './list.json'
import type { Share } from './components/share-card'
import type { LogoItem } from './components/logo-upload-dialog'

/**
 * 页面主组件
 * 负责编辑、保存、删除分享链接，支持导入密钥进行加密保存
 */
export default function Page() {
	// 当前编辑中的分享列表（可能已经被修改）
	const [shares, setShares] = useState<Share[]>(initialList as Share[])
	// 上一次保存时的原始列表，用于取消修改时回滚
	const [originalShares, setOriginalShares] = useState<Share[]>(initialList as Share[])
	// 是否处于编辑模式
	const [isEditMode, setIsEditMode] = useState(false)
	// 是否正在保存中
	const [isSaving, setIsSaving] = useState(false)
	// 当前正在编辑的分享（用于新建/编辑对话框区分）
	const [editingShare, setEditingShare] = useState<Share | null>(null)
	// 创建/编辑对话框是否打开
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
	// 收集本次编辑中添加/更新的 Logo 图片数据，key 为分享的 url
	const [logoItems, setLogoItems] = useState<Map<string, LogoItem>>(new Map())
	// 隐藏文件选择 input 的引用，用于触发密钥文件选择
	const keyInputRef = useRef<HTMLInputElement>(null)

	// 认证状态与设置私钥的方法
	const { isAuth, setPrivateKey } = useAuthStore()
	// 站点配置（例如控制编辑按钮是否显示）
	const { siteContent } = useConfigStore()
	const hideEditButton = siteContent.hideEditButton ?? false

	/**
	 * 更新某个分享信息，同时可附带新的 Logo 图数据
	 * @param updatedShare 修改后的分享对象
	 * @param oldShare     被修改的原始分享对象（用于定位原数据）
	 * @param logoItem     该分享对应的 Logo 数据，可选
	 */
	const handleUpdate = (updatedShare: Share, oldShare: Share, logoItem?: LogoItem) => {
		// 替换列表中对应的分享
		setShares(prev => prev.map(s => (s.url === oldShare.url ? updatedShare : s)))
		if (logoItem) {
			// 更新 logoItems 映射，记录新上传的 Logo
			setLogoItems(prev => {
				const newMap = new Map(prev)
				newMap.set(updatedShare.url, logoItem)
				return newMap
			})
		}
	}

	// 打开创建新分享的对话框
	const handleAdd = () => {
		setEditingShare(null)          // 清空当前编辑对象表示新建
		setIsCreateDialogOpen(true)
	}

	/**
	 * 保存对话框中的分享变更
	 * 如果 editingShare 存在则更新已有项，否则作为新项添加到列表
	 */
	const handleSaveShare = (updatedShare: Share) => {
		if (editingShare) {
			const updated = shares.map(s => (s.url === editingShare.url ? updatedShare : s))
			setShares(updated)
		} else {
			setShares([...shares, updatedShare])
		}
	}

	// 删除指定分享（带确认提示）
	const handleDelete = (share: Share) => {
		if (confirm(`确定要删除 ${share.name} 吗？`)) {
			setShares(shares.filter(s => s.url !== share.url))
		}
	}

	/**
	 * 用户选择密钥文件后读取内容并存入全局 store，之后自动触发保存
	 */
	const handleChoosePrivateKey = async (file: File) => {
		try {
			const text = await file.text()
			setPrivateKey(text)
			// 导入密钥后立即尝试保存
			await handleSave()
		} catch (error) {
			console.error('Failed to read private key:', error)
			toast.error('读取密钥文件失败')
		}
	}

	// 保存按钮点击逻辑：未认证则弹出文件选择器，已认证直接保存
	const handleSaveClick = () => {
		if (!isAuth) {
			keyInputRef.current?.click()
		} else {
			handleSave()
		}
	}

	/**
	 * 核心保存操作，调用 pushShares 将 shares 和 logoItems 持久化
	 */
	const handleSave = async () => {
		setIsSaving(true)

		try {
			await pushShares({
				shares,
				logoItems
			})

			// 更新原始快照，清空本次上传的 Logo 缓存，退出编辑模式
			setOriginalShares(shares)
			setLogoItems(new Map())
			setIsEditMode(false)
			toast.success('保存成功！')
		} catch (error: any) {
			console.error('Failed to save:', error)
			toast.error(`保存失败: ${error?.message || '未知错误'}`)
		} finally {
			setIsSaving(false)
		}
	}

	// 取消编辑：回滚列表到上次保存的状态，清空 Logo 缓存，退出编辑模式
	const handleCancel = () => {
		setShares(originalShares)
		setLogoItems(new Map())
		setIsEditMode(false)
	}

	// 根据是否已认证决定按钮文本
	const buttonText = isAuth ? '保存' : '导入密钥'

	// 全局快捷键监听：Ctrl + , 进入编辑模式（仅非编辑模式下生效）
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
			{/* 隐藏的文件选择 input，用于选择 .pem 密钥文件 */}
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				className='hidden'
				onChange={async e => {
					const f = e.target.files?.[0]
					if (f) await handleChoosePrivateKey(f)
					// 清空 input 值，确保再次选择同一个文件仍能触发 onChange
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			{/* 分享网格排列视图 */}
			<GridView shares={shares} isEditMode={isEditMode} onUpdate={handleUpdate} onDelete={handleDelete} />

			{/* 桌面端右上角操作按钮组（移动端隐藏） */}
			<motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className='absolute top-4 right-6 flex gap-3 max-sm:hidden'>
				{isEditMode ? (
					// 编辑模式下的操作：取消、添加、保存（或导入密钥）
					<>
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
							onClick={handleAdd}
							className='rounded-xl border bg-white/60 px-6 py-2 text-sm'>
							添加
						</motion.button>
						<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSaveClick} disabled={isSaving} className='brand-btn px-6'>
							{isSaving ? '保存中...' : buttonText}
						</motion.button>
					</>
				) : (
					// 非编辑模式下，如果配置没有隐藏编辑按钮则显示“编辑”按钮
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

			{/* 创建/编辑分享对话框（条件渲染） */}
			{isCreateDialogOpen && <CreateDialog share={editingShare} onClose={() => setIsCreateDialogOpen(false)} onSave={handleSaveShare} />}
		</>
	)
}
