// 导入 motion 库的动画组件（用于给按钮添加动效）
import { motion } from 'motion/react'
// 引入 React hooks
import { useRef, useState } from 'react'
// 引入 sonner 的 toast，用于显示轻量通知
import { toast } from 'sonner'
// 引入 Next.js 路由钩子，用于页面跳转
import { useRouter } from 'next/navigation'
// 自定义状态管理：写作页面的全局数据（文章表单、模式等）
import { useWriteStore } from '../stores/write-store'
// 自定义状态管理：预览功能的状态
import { usePreviewStore } from '../stores/preview-store'
// 发布相关的自定义 hook，封装密钥验证、发布、删除等逻辑
import { usePublish } from '../hooks/use-publish'

/**
 * 写作页操作栏组件
 * 提供预览、导入 Markdown、发布/更新、删除、取消等功能按钮
 */
export function WriteActions() {
	// 从写作 store 中获取所需状态和方法
	const {
		loading,        // 是否正在加载/提交中
		mode,           // 当前模式: 'edit' 或 'create'
		form,           // 文章表单数据（包含 title, md 等）
		loadBlogForEdit,// 用于加载待编辑文章（当前未使用，预留）
		originalSlug,   // 编辑模式下的原始 slug
		updateForm,     // 更新表单字段的方法
	} = useWriteStore()

	// 获取预览 store 中的打开预览方法
	const { openPreview } = usePreviewStore()

	// 从发布 hook 中获取密钥验证状态和相关操作
	const { isAuth, onChoosePrivateKey, onPublish, onDelete } = usePublish()

	// 本地状态：是否正在保存（取消按钮的禁用状态）
	const [saving, setSaving] = useState(false)

	// ref：指向隐藏的「导入私钥」文件输入框
	const keyInputRef = useRef<HTMLInputElement>(null)
	// ref：指向隐藏的「导入 Markdown」文件输入框
	const mdInputRef = useRef<HTMLInputElement>(null)

	// Next.js 路由实例
	const router = useRouter()

	/**
	 * 主按钮点击处理：
	 * 未认证 -> 触发私钥文件选择
	 * 已认证 -> 执行发布或更新
	 */
	const handleImportOrPublish = () => {
		if (!isAuth) {
			keyInputRef.current?.click()
		} else {
			onPublish()
		}
	}

	// 取消操作：弹出确认后根据不同模式跳转到相应页面
	const handleCancel = () => {
		if (!window.confirm('放弃本次修改吗？')) {
			return
		}
		if (mode === 'edit' && originalSlug) {
			// 编辑模式且存在原 slug，跳回文章详情页
			router.push(`/blog/${originalSlug}`)
		} else {
			// 新建模式或编辑异常，返回首页
			router.push('/')
		}
	}

	// 计算主按钮显示的文本
	const buttonText = isAuth
		? mode === 'edit'
			? '更新'   // 已认证 & 编辑模式
			: '发布'   // 已认证 & 新建模式
		: '导入密钥' // 未认证状态

	// 删除按钮处理：需要先认证，再二次确认，最终调用删除方法
	const handleDelete = () => {
		if (!isAuth) {
			toast.info('请先导入密钥')
			return
		}
		const confirmMsg = form?.title
			? `确定删除《${form.title}》吗？该操作不可恢复。`
			: '确定删除当前文章吗？该操作不可恢复。'
		if (window.confirm(confirmMsg)) {
			onDelete()
		}
	}

	// 触发隐藏的 Markdown 文件输入框
	const handleImportMd = () => {
		mdInputRef.current?.click()
	}

	// Markdown 文件选择后的处理：读取文本内容，更新表单的 md 字段
	const handleMdFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		try {
			// 使用现代 File API 读取文件文本
			const text = await file.text()
			updateForm({ md: text })
			toast.success('已导入 Markdown 文件')
		} catch (error) {
			toast.error('导入失败，请重试')
		} finally {
			// 无论成功失败，都清空文件输入框的值，以便重复选择同一文件
			if (e.currentTarget) e.currentTarget.value = ''
		}
	}

	return (
		<>
			{/* 隐藏的私钥文件输入框（.pem 格式） */}
			<input
				ref={keyInputRef}
				type="file"
				accept=".pem"
				className="hidden"
				onChange={async (e) => {
					const f = e.target.files?.[0]
					if (f) await onChoosePrivateKey(f) // 调用发布 hook 的密钥导入逻辑
					if (e.currentTarget) e.currentTarget.value = '' // 清空
				}}
			/>

			{/* 隐藏的 Markdown 文件输入框 */}
			<input
				ref={mdInputRef}
				type="file"
				accept=".md"
				className="hidden"
				onChange={handleMdFileChange}
			/>

			{/* 操作按钮区域：绝对定位在页面右上角 */}
			<ul className="absolute top-4 right-6 flex items-center gap-2">
				{/* 仅在编辑模式下显示「编辑模式」标签、删除按钮和取消按钮 */}
				{mode === 'edit' && (
					<>
						{/* 带轻微动画的编辑模式标识 */}
						<motion.div
							initial={{ opacity: 0, scale: 0.6 }}
							animate={{ opacity: 1, scale: 1 }}
							className="flex items-center gap-2"
						>
							<div className="rounded-lg border bg-blue-50 px-4 py-2 text-sm text-blue-700">
								编辑模式
							</div>
						</motion.div>

						{/* 删除按钮（红色警示风格） */}
						<motion.button
							initial={{ opacity: 0, scale: 0.6 }}
							animate={{ opacity: 1, scale: 1 }}
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-100"
							disabled={loading} // 加载中禁用避免重复操作
							onClick={handleDelete}
						>
							删除
						</motion.button>

						{/* 取消按钮：放弃本次修改 */}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleCancel}
							disabled={saving} // 保存过程中不可取消，防止数据不一致
							className="bg-card rounded-xl border px-4 py-2 text-sm"
						>
							取消
						</motion.button>
					</>
				)}

				{/* 导入 Markdown 按钮（通用） */}
				<motion.button
					initial={{ opacity: 0, scale: 0.6 }}
					animate={{ opacity: 1, scale: 1 }}
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					className="bg-card rounded-xl border px-4 py-2 text-sm"
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
					className="bg-card rounded-xl border px-6 py-2 text-sm"
					disabled={loading}
					onClick={openPreview}
				>
					预览
				</motion.button>

				{/* 主操作按钮：文本动态变化（导入密钥 / 发布 / 更新） */}
				<motion.button
					initial={{ opacity: 0, scale: 0.6 }}
					animate={{ opacity: 1, scale: 1 }}
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					className="brand-btn px-6" // 品牌样式按钮
					disabled={loading}
					onClick={handleImportOrPublish}
				>
					{buttonText}
				</motion.button>
			</ul>
		</>
	)
}