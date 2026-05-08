'use client'
// 标记此组件为客户端组件，因为使用了 React hooks 和浏览器 API（如 window.confirm）

import { motion } from 'motion/react' // 引入 motion 库用于动画
import { useRef, useState } from 'react'
import { toast } from 'sonner' // 轻量级 Toast 提示库
import { useRouter } from 'next/navigation'
import { useWriteStore } from '../stores/write-store' // 写作相关全局状态
import { usePreviewStore } from '../stores/preview-store' // 预览状态管理
import { usePublish } from '../hooks/use-publish' // 发布、删除等发布相关逻辑

export function WriteActions() {
	// 从写作状态中解构所需状态与方法
	const { loading, mode, form, loadBlogForEdit, originalSlug, updateForm } = useWriteStore()
	// 获取打开预览的方法
	const { openPreview } = usePreviewStore()
	// 获取发布、删除、导入密钥相关状态与方法
	const { isAuth, onChoosePrivateKey, onPublish, onDelete } = usePublish()

	// 是否正在保存的状态（可能由父组件或其他逻辑更新，此处仅用于按钮禁用控制）
	const [saving, setSaving] = useState(false)

	// 隐藏的文件选择 input 引用，用于触发选择 PEM 密钥文件或 Markdown 文件
	const keyInputRef = useRef<HTMLInputElement>(null)
	const mdInputRef = useRef<HTMLInputElement>(null)
	const router = useRouter()

	// 处理“导入密钥”或“发布/更新”按钮点击
	const handleImportOrPublish = () => {
		if (!isAuth) {
			// 未认证时触发密钥文件选择
			keyInputRef.current?.click()
		} else {
			// 已认证则执行发布/更新操作
			onPublish()
		}
	}

	// 取消当前操作，根据上下文返回不同页面
	const handleCancel = () => {
		// 使用浏览器原生确认弹窗，避免误操作
		if (!window.confirm('放弃本次修改吗？')) {
			return
		}
		// 如果是编辑模式且原始 slug 存在，返回该博客页面；否则返回首页
		if (mode === 'edit' && originalSlug) {
			router.push(`/blog/${originalSlug}`)
		} else {
			router.push('/')
		}
	}

	// 根据认证状态与编辑模式决定主按钮的显示文本
	const buttonText = isAuth ? (mode === 'edit' ? '更新' : '发布') : '导入密钥'

	// 处理删除文章
	const handleDelete = () => {
		// 未认证时提示先导入密钥
		if (!isAuth) {
			toast.info('请先导入密钥')
			return
		}
		// 根据是否有标题生成更具体的确认消息
		const confirmMsg = form?.title
			? `确定删除《${form.title}》吗？该操作不可恢复。`
			: '确定删除当前文章吗？该操作不可恢复。'
		// 用户确认后执行删除
		if (window.confirm(confirmMsg)) {
			onDelete()
		}
	}

	// 触发导入 Markdown 文件选择
	const handleImportMd = () => {
		mdInputRef.current?.click()
	}

	// 处理 Markdown 文件选择变化，读取文本内容并更新表单
	const handleMdFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		try {
			// 使用 File API 读取文本
			const text = await file.text()
			// 将读取到的 Markdown 内容更新到 store
			updateForm({ md: text })
			toast.success('已导入 Markdown 文件')
		} catch (error) {
			toast.error('导入失败，请重试')
		} finally {
			// 清空 input 值，以便再次选择同一文件时仍能触发 change 事件
			if (e.currentTarget) e.currentTarget.value = ''
		}
	}

	return (
		<>
			{/* 隐藏的密钥文件选择输入 */}
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				className='hidden'
				onChange={async e => {
					const f = e.target.files?.[0]
					if (f) await onChoosePrivateKey(f)
					// 清空值
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>
			{/* 隐藏的 Markdown 文件选择输入 */}
			<input
				ref={mdInputRef}
				type='file'
				accept='.md'
				className='hidden'
				onChange={handleMdFileChange}
			/>

			{/* 操作按钮列表，绝对定位在右上角 */}
			<ul className='absolute top-4 right-6 flex items-center gap-2'>
				{/* 编辑模式下额外显示“编辑模式”标签、删除、取消按钮 */}
				{mode === 'edit' && (
					<>
						<motion.div
							initial={{ opacity: 0, scale: 0.6 }}
							animate={{ opacity: 1, scale: 1 }}
							className='flex items-center gap-2'
						>
							<div className='rounded-lg border bg-blue-50 px-4 py-2 text-sm text-blue-700'>
								编辑模式
							</div>
						</motion.div>

						<motion.button
							initial={{ opacity: 0, scale: 0.6 }}
							animate={{ opacity: 1, scale: 1 }}
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							className='rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-100'
							disabled={loading}
							onClick={handleDelete}
						>
							删除
						</motion.button>

						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleCancel}
							disabled={saving}
							className='bg-card rounded-xl border px-4 py-2 text-sm'
						>
							取消
						</motion.button>
					</>
				)}

				{/* 导入 MD 文件按钮 */}
				<motion.button
					initial={{ opacity: 0, scale: 0.6 }}
					animate={{ opacity: 1, scale: 1 }}
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					className='bg-card rounded-xl border px-4 py-2 text-sm'
					disabled={loading}
					onClick={handleImportMd}
				>
					导入 MD
				</motion.button>

				{/* 预览按钮 */}
				<motion.button
					initial={{ opacity: 0, scale: 0.6 }}
					animate={{ opacity: 1, scale: 1 }}
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					className='bg-card rounded-xl border px-6 py-2 text-sm'
					disabled={loading}
					onClick={openPreview}
				>
					预览
				</motion.button>

				{/* 主操作按钮：导入密钥 / 发布 / 更新 */}
				<motion.button
					initial={{ opacity: 0, scale: 0.6 }}
					animate={{ opacity: 1, scale: 1 }}
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					className='brand-btn px-6'
					disabled={loading}
					onClick={handleImportOrPublish}
				>
					{buttonText}
				</motion.button>
			</ul>
		</>
	)
}
