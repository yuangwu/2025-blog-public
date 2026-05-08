'use client' // 标记为客户端组件，仅在浏览器端运行

import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react' // 引入 framer-motion 动画库
import { toast } from 'sonner' // 引入 sonner 轻量级 toast 通知
import GridView from './grid-view' // 网格视图组件，用于展示分享卡片
import CreateDialog from './components/create-dialog' // 创建/编辑分享的弹窗组件
import { pushShares } from './services/push-shares' // 将分享数据推送到远端（如 GitHub）的服务
import { useAuthStore } from '@/hooks/use-auth' // 认证状态管理（私钥）
import { useConfigStore } from '@/app/(home)/stores/config-store' // 全局站点配置
import initialList from './list.json' // 初始的分享列表静态数据
import type { Share } from './components/share-card' // 分享项数据结构
import type { LogoItem } from './components/logo-upload-dialog' // 上传的 Logo 文件结构

export default function Page() {
	// 当前编辑中的分享列表
	const [shares, setShares] = useState<Share[]>(initialList as Share[])
	// 保存进入编辑模式前的原始分享列表，用于取消时回滚
	const [originalShares, setOriginalShares] = useState<Share[]>(initialList as Share[])
	// 是否处于编辑模式
	const [isEditMode, setIsEditMode] = useState(false)
	// 是否正在执行保存操作（显示 loading 状态）
	const [isSaving, setIsSaving] = useState(false)
	// 当前正在编辑的分享项（编辑已有项时非 null，新增时为 null）
	const [editingShare, setEditingShare] = useState<Share | null>(null)
	// 创建/编辑对话框的开关状态
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
	// 存储每个分享对应的待上传 Logo 文件，键为分享的 url
	const [logoItems, setLogoItems] = useState<Map<string, LogoItem>>(new Map())
	// 隐藏的文件选择器引用，用于导入 .pem 密钥
	const keyInputRef = useRef<HTMLInputElement>(null)

	// 从认证 store 获取是否已导入私钥，以及设置私钥的方法
	const { isAuth, setPrivateKey } = useAuthStore()
	// 从配置 store 获取站点内容配置，例如是否隐藏编辑按钮
	const { siteContent } = useConfigStore()
	const hideEditButton = siteContent.hideEditButton ?? false

	/**
	 * 更新某个分享（由 GridView 子组件触发）
	 * @param updatedShare 更新后的分享数据
	 * @param oldShare 原始分享数据（通过 url 匹配旧项）
	 * @param logoItem 该分享关联的新 Logo 文件（可选）
	 */
	const handleUpdate = (updatedShare: Share, oldShare: Share, logoItem?: LogoItem) => {
		// 找到旧的 url 并替换为新的分享数据
		setShares(prev => prev.map(s => (s.url === oldShare.url ? updatedShare : s)))
		// 如果有 Logo 文件变动，更新 logoItems Map
		if (logoItem) {
			setLogoItems(prev => {
				const newMap = new Map(prev)
				newMap.set(updatedShare.url, logoItem)
				return newMap
			})
		}
	}

	// 处理“添加”按钮：清空当前编辑项并打开创建对话框
	const handleAdd = () => {
		setEditingShare(null) // 置空表示新增
		setIsCreateDialogOpen(true)
	}

	/**
	 * 创建/编辑对话框保存时的回调
	 * 根据 editingShare 判断是新增还是编辑已有项
	 */
	const handleSaveShare = (updatedShare: Share) => {
		if (editingShare) {
			// 编辑：替换 url 相等的旧项
			const updated = shares.map(s => (s.url === editingShare.url ? updatedShare : s))
			setShares(updated)
		} else {
			// 新增：追加到列表末尾
			setShares([...shares, updatedShare])
		}
	}

	// 删除分享（需用户确认）
	const handleDelete = (share: Share) => {
		if (confirm(`确定要删除 ${share.name} 吗？`)) {
			setShares(shares.filter(s => s.url !== share.url))
		}
	}

	/**
	 * 用户选择私钥文件后的处理
	 * 读取文件文本，存入全局认证 store，并自动触发保存
	 */
	const handleChoosePrivateKey = async (file: File) => {
		try {
			const text = await file.text()
			setPrivateKey(text) // 将私钥文本存入 store
			// 密钥导入后自动执行一次保存（push 操作需要私钥）
			await handleSave()
		} catch (error) {
			console.error('Failed to read private key:', error)
			toast.error('读取密钥文件失败')
		}
	}

	// 点击“保存 / 导入密钥”按钮时的逻辑
	const handleSaveClick = () => {
		if (!isAuth) {
			// 尚未导入私钥，触发隐藏的文件选择器让用户选择 .pem 文件
			keyInputRef.current?.click()
		} else {
			// 已认证，直接保存
			handleSave()
		}
	}

	/**
	 * 执行保存操作：将当前的 shares 和 logoItems 通过 pushShares 推送到远端
	 */
	const handleSave = async () => {
		setIsSaving(true)
		try {
			await pushShares({
				shares,
				logoItems,
			})
			// 保存成功后：更新原始数据基准，清空未提交的 Logo 项，退出编辑模式
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

	// 取消编辑：恢复到编辑前的原始列表，清除 Logo 修改，退出编辑模式
	const handleCancel = () => {
		setShares(originalShares)
		setLogoItems(new Map())
		setIsEditMode(false)
	}

	// 根据是否已认证显示不同的按钮文案
	const buttonText = isAuth ? '保存' : '导入密钥'

	// 键盘快捷键：非编辑模式下按 Ctrl/Cmd + , 可快速进入编辑模式
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
			{/* 隐藏的文件选择器，用于导入 .pem 格式私钥 */}
			<input
				ref={keyInputRef}
				type="file"
				accept=".pem"
				className="hidden"
				onChange={async e => {
					const f = e.target.files?.[0]
					if (f) await handleChoosePrivateKey(f)
					// 清空 value，允许重复选择同一文件
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			{/* 分享卡片的网格展示区 */}
			<GridView
				shares={shares}
				isEditMode={isEditMode}
				onUpdate={handleUpdate}
				onDelete={handleDelete}
			/>

			{/* 右上角悬浮操作按钮组（小屏幕隐藏） */}
			<motion.div
				initial={{ opacity: 0, scale: 0.6 }}
				animate={{ opacity: 1, scale: 1 }}
				className="absolute top-4 right-6 flex gap-3 max-sm:hidden"
			>
				{isEditMode ? (
					<>
						{/* 取消按钮：放弃修改 */}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleCancel}
							disabled={isSaving}
							className="rounded-xl border bg-white/60 px-6 py-2 text-sm"
						>
							取消
						</motion.button>

						{/* 添加按钮：打开新增对话框 */}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleAdd}
							className="rounded-xl border bg-white/60 px-6 py-2 text-sm"
						>
							添加
						</motion.button>

						{/* 保存 / 导入密钥按钮 */}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleSaveClick}
							disabled={isSaving}
							className="brand-btn px-6"
						>
							{isSaving ? '保存中...' : buttonText}
						</motion.button>
					</>
				) : (
					// 非编辑模式且配置允许时，显示“编辑”按钮
					!hideEditButton && (
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={() => setIsEditMode(true)}
							className="bg-card rounded-xl border px-6 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/80"
						>
							编辑
						</motion.button>
					)
				)}
			</motion.div>

			{/* 创建或编辑分享的弹窗 */}
			{isCreateDialogOpen && (
				<CreateDialog
					share={editingShare}
					onClose={() => setIsCreateDialogOpen(false)}
					onSave={handleSaveShare}
				/>
			)}
		</>
	)
}