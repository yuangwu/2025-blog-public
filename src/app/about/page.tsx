// 标记该组件为客户端组件，仅在浏览器端渲染
'use client'

// 导入 React 核心钩子：状态管理、引用获取、副作用处理
import { useState, useRef, useEffect } from 'react'
// 导入 Framer Motion 用于实现动画效果
import { motion } from 'motion/react'
// 导入 Sonner 用于显示 Toast 提示消息
import { toast } from 'sonner'
// 导入自定义 Hook：用于 Markdown 内容的渲染
import { useMarkdownRender } from '@/hooks/use-markdown-render'
// 导入数据推送服务和类型定义：用于保存“关于”页面数据
import { pushAbout, type AboutData } from './services/push-about'
// 导入自定义 Hook：用于身份认证状态管理
import { useAuthStore } from '@/hooks/use-auth'
// 导入自定义 Hook：用于网站配置状态管理
import { useConfigStore } from '@/app/(home)/stores/config-store'
// 导入自定义组件：点赞按钮
import LikeButton from '@/components/like-button'
// 导入 SVG 图标：GitHub 标志
import GithubSVG from '@/svgs/github.svg'
// 导入初始数据：从 JSON 文件加载“关于”页面的默认内容
import initialData from './list.json'

// 定义并导出默认的“关于”页面组件
export default function Page() {
	// 状态：当前页面显示/编辑的数据，类型为 AboutData
	const [data, setData] = useState<AboutData>(initialData as AboutData)
	// 状态：保存原始数据，用于取消编辑时回滚
	const [originalData, setOriginalData] = useState<AboutData>(initialData as AboutData)
	// 状态：控制是否处于编辑模式
	const [isEditMode, setIsEditMode] = useState(false)
	// 状态：控制是否正在保存数据
	const [isSaving, setIsSaving] = useState(false)
	// 状态：控制是否处于预览模式
	const [isPreviewMode, setIsPreviewMode] = useState(false)
	// 引用：用于触发隐藏的文件输入框（选择密钥文件）
	const keyInputRef = useRef<HTMLInputElement>(null)

	// 从认证 Store 获取：认证状态和设置私钥的方法
	const { isAuth, setPrivateKey } = useAuthStore()
	// 从配置 Store 获取：网站内容配置
	const { siteContent } = useConfigStore()
	// 使用自定义 Hook：渲染 Markdown 内容，返回渲染后的内容和加载状态
	const { content, loading } = useMarkdownRender(data.content)
	// 配置项：是否隐藏编辑按钮，默认为 false
	const hideEditButton = siteContent.hideEditButton ?? false

	// 处理函数：读取并设置用户选择的私钥文件
	const handleChoosePrivateKey = async (file: File) => {
		try {
			// 读取文件内容为文本
			const text = await file.text()
			// 将私钥保存到认证 Store
			setPrivateKey(text)
			// 自动触发保存操作
			await handleSave()
		} catch (error) {
			console.error('Failed to read private key:', error)
			toast.error('读取密钥文件失败')
		}
	}

	// 处理函数：点击“保存”按钮时的逻辑
	const handleSaveClick = () => {
		// 如果未认证，触发文件选择框导入密钥
		if (!isAuth) {
			keyInputRef.current?.click()
		} else {
			// 已认证，直接保存
			handleSave()
		}
	}

	// 处理函数：进入编辑模式
	const handleEnterEditMode = () => {
		setIsEditMode(true)
		setIsPreviewMode(false)
	}

	// 处理函数：保存数据到后端
	const handleSave = async () => {
		setIsSaving(true)

		try {
			// 调用服务推送数据
			await pushAbout(data)

			// 保存成功后，更新原始数据并退出编辑/预览模式
			setOriginalData(data)
			setIsEditMode(false)
			setIsPreviewMode(false)
			toast.success('保存成功！')
		} catch (error: any) {
			console.error('Failed to save:', error)
			toast.error(`保存失败: ${error?.message || '未知错误'}`)
		} finally {
			// 无论成功失败，都关闭保存状态
			setIsSaving(false)
		}
	}

	// 处理函数：取消编辑，回滚到原始数据
	const handleCancel = () => {
		setData(originalData)
		setIsEditMode(false)
		setIsPreviewMode(false)
	}

	// 动态按钮文本：已认证显示“保存”，未认证显示“导入密钥”
	const buttonText = isAuth ? '保存' : '导入密钥'

	// 副作用：监听键盘快捷键 Ctrl/Cmd + , 快速进入编辑模式
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!isEditMode && (e.ctrlKey || e.metaKey) && e.key === ',') {
				e.preventDefault()
				setIsEditMode(true)
				setIsPreviewMode(false)
			}
		}

		// 绑定键盘事件
		window.addEventListener('keydown', handleKeyDown)
		// 组件卸载时移除事件监听
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [isEditMode])

	return (
		<>
			{/* 隐藏的文件输入框：用于选择 .pem 私钥文件 */}
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				className='hidden'
				onChange={async e => {
					const f = e.target.files?.[0]
					if (f) await handleChoosePrivateKey(f)
					// 清空输入框值，允许重复选择同一文件
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			{/* 页面主容器：居中布局，响应式 padding */}
			<div className='flex flex-col items-center justify-center px-6 pt-32 pb-12 max-sm:px-0'>
				<div className='w-full max-w-[800px]'>
					{/* 条件渲染：编辑模式 */}
					{isEditMode ? (
						// 子条件：预览模式
						isPreviewMode ? (
							<div className='space-y-6'>
								<div className='text-center'>
									<h1 className='mb-4 text-4xl font-bold'>{data.title || '标题预览'}</h1>
									<p className='text-secondary text-lg'>{data.description || '描述预览'}</p>
								</div>

								{/* Markdown 渲染加载状态 */}
								{loading ? (
									<div className='text-secondary text-center'>预览渲染中...</div>
								) : (
									<div className='card relative p-6'>
										<div className='prose prose-sm max-w-none'>{content}</div>
									</div>
								)}
							</div>
						) : (
							// 子条件：编辑输入模式
							<div className='space-y-6'>
								<div className='space-y-4'>
									{/* 标题输入框 */}
									<input
										type='text'
										placeholder='标题'
										className='w-full px-4 py-3 text-center text-2xl font-bold'
										value={data.title}
										onChange={e => setData({ ...data, title: e.target.value })}
									/>
									{/* 描述输入框 */}
									<input
										type='text'
										placeholder='描述'
										className='w-full px-4 py-3 text-center text-lg'
										value={data.description}
										onChange={e => setData({ ...data, description: e.target.value })}
									/>
								</div>

								{/* Markdown 内容编辑区 */}
								<div className='card relative'>
									<textarea
										placeholder='Markdown 内容'
										className='min-h-[400px] w-full resize-none text-sm'
										value={data.content}
										onChange={e => setData({ ...data, content: e.target.value })}
									/>
								</div>
							</div>
						)
					) : (
						// 条件渲染：非编辑模式（查看模式）
						<>
							{/* 标题区域：带动画效果 */}
							<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className='mb-12 text-center'>
								<h1 className='mb-4 text-4xl font-bold'>{data.title}</h1>
								<p className='text-secondary text-lg'>{data.description}</p>
							</motion.div>

							{/* Markdown 内容加载状态 */}
							{loading ? (
								<div className='text-secondary text-center'>加载中...</div>
							) : (
								// Markdown 内容展示区：带动画效果
								<motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className='card relative p-6'>
									<div className='prose prose-sm max-w-none'>{content}</div>
								</motion.div>
							)}
						</>
					)}

					{/* 底部交互区：GitHub 链接和点赞按钮 */}
					<div className='mt-8 flex items-center justify-center gap-6'>
						{/* GitHub 图标链接：带动画 */}
						<motion.a
							href='https://github.com/yuangwu/yuangwu-biog'
							target='_blank'
							rel='noreferrer'
							initial={{ opacity: 0, scale: 0.6 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 0 }}
							className='bg-card flex h-[53px] w-[53px] items-center justify-center rounded-full border'>
							<GithubSVG />
						</motion.a>

						{/* 点赞按钮组件 */}
						<LikeButton slug='open-source' delay={0} />
					</div>
				</div>
			</div>

			{/* 右上角悬浮按钮组：仅在非移动端显示 */}
			<motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className='fixed top-4 right-6 z-10 flex gap-3 max-sm:hidden'>
				{/* 编辑模式下的按钮：取消、预览/继续编辑、保存 */}
				{isEditMode ? (
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
						{/* 切换预览/编辑模式按钮 */}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={() => setIsPreviewMode(prev => !prev)}
							disabled={isSaving}
							className={`rounded-xl border bg-white/60 px-6 py-2 text-sm`}>
							{isPreviewMode ? '继续编辑' : '预览'}
						</motion.button>
						{/* 保存/导入密钥按钮 */}
						<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSaveClick} disabled={isSaving} className='brand-btn px-6'>
							{isSaving ? '保存中...' : buttonText}
						</motion.button>
					</>
				) : (
					// 非编辑模式：显示“编辑”按钮（如果未隐藏）
					!hideEditButton && (
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleEnterEditMode}
							className='rounded-xl border bg-white/60 px-6 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/80'>
							编辑
						</motion.button>
					)
				)}
			</motion.div>
		</>
	)
}