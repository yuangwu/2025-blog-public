'use client'

import { useState, useRef, useEffect } from 'react'
// 导入 framer-motion 的 motion/react 入口，用于动画效果
import { motion } from 'motion/react'
// 引入 toast 通知库
import { toast } from 'sonner'
// 自定义 Markdown 渲染 hook
import { useMarkdownRender } from '@/hooks/use-markdown-render'
// 推送关于页内容的服务方法及类型
import { pushAbout, type AboutData } from './services/push-about'
// 权限状态管理
import { useAuthStore } from '@/hooks/use-auth'
// 站点全局配置
import { useConfigStore } from '@/app/(home)/stores/config-store'
// 点赞按钮组件
import LikeButton from '@/components/like-button'
// 将 SVG 文件作为 React 组件导入（依赖项目配置 SVGR 或类似 loader）
import GithubSVG from '@/svgs/github.svg'
// 页面的初始数据（来自同目录下的 JSON 文件）
import initialData from './list.json'

export default function Page() {
	// 当前编辑中的数据
	const [data, setData] = useState<AboutData>(initialData as AboutData)
	// 原始数据，用于取消编辑时恢复
	const [originalData, setOriginalData] = useState<AboutData>(initialData as AboutData)
	// 是否处于编辑模式
	const [isEditMode, setIsEditMode] = useState(false)
	// 是否正在保存
	const [isSaving, setIsSaving] = useState(false)
	// 是否开启预览模式（编辑时有效）
	const [isPreviewMode, setIsPreviewMode] = useState(false)
	// 隐藏的密钥文件 input 引用
	const keyInputRef = useRef<HTMLInputElement>(null)

	// 获取认证状态和设置私钥的方法
	const { isAuth, setPrivateKey } = useAuthStore()
	// 站点配置内容
	const { siteContent } = useConfigStore()
	// Markdown 渲染 hook，返回渲染后的 React 节点和加载状态
	const { content, loading } = useMarkdownRender(data.content)
	// 是否隐藏编辑按钮，从站点配置中获取，若配置不存在则默认不隐藏
	// 使用可选链避免 siteContent 为 undefined 时报错
	const hideEditButton = siteContent?.hideEditButton ?? false

	// 处理选择的私钥文件，读取内容并保存
	const handleChoosePrivateKey = async (file: File) => {
		try {
			const text = await file.text()
			setPrivateKey(text)
			// 设置私钥后自动执行保存
			await handleSave()
		} catch (error) {
			console.error('Failed to read private key:', error)
			toast.error('读取密钥文件失败')
		}
	}

	// 保存按钮点击处理：如果未认证则触发密钥文件选择，否则直接保存
	const handleSaveClick = () => {
		if (!isAuth) {
			keyInputRef.current?.click()
		} else {
			handleSave()
		}
	}

	// 进入编辑模式，同时关闭预览
	const handleEnterEditMode = () => {
		setIsEditMode(true)
		setIsPreviewMode(false)
	}

	// 执行保存逻辑，将当前数据推送到后端
	const handleSave = async () => {
		setIsSaving(true)

		try {
			await pushAbout(data)

			// 更新原始数据为当前保存的数据
			setOriginalData(data)
			// 退出编辑和预览模式
			setIsEditMode(false)
			setIsPreviewMode(false)
			toast.success('保存成功！')
		} catch (error: any) {
			console.error('Failed to save:', error)
			toast.error(`保存失败: ${error?.message || '未知错误'}`)
		} finally {
			setIsSaving(false)
		}
	}

	// 取消编辑，恢复到原始数据并退出编辑模式
	const handleCancel = () => {
		setData(originalData)
		setIsEditMode(false)
		setIsPreviewMode(false)
	}

	// 保存按钮的文本根据认证状态动态显示
	const buttonText = isAuth ? '保存' : '导入密钥'

	// 键盘快捷键监听：非编辑状态下按下 Ctrl/Cmd + , 进入编辑模式
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!isEditMode && (e.ctrlKey || e.metaKey) && e.key === ',') {
				e.preventDefault()
				setIsEditMode(true)
				setIsPreviewMode(false)
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [isEditMode])

	return (
		<>
			{/* 隐藏的文件选择器，用于导入密钥 .pem 文件 */}
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				className='hidden'
				onChange={async e => {
					const f = e.target.files?.[0]
					if (f) await handleChoosePrivateKey(f)
					// 清空已选文件，以便再次选择同一个文件仍能触发 onChange
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			{/* 主内容区域 */}
			<div className='flex flex-col items-center justify-center px-6 pt-32 pb-12 max-sm:px-0'>
				<div className='w-full max-w-[800px]'>
					{/* 根据当前模式展示不同界面 */}
					{isEditMode ? (
						isPreviewMode ? (
							// 编辑模式下的 Markdown 预览
							<div className='space-y-6'>
								<div className='text-center'>
									<h1 className='mb-4 text-4xl font-bold'>{data.title || '标题预览'}</h1>
									<p className='text-secondary text-lg'>{data.description || '描述预览'}</p>
								</div>

								{loading ? (
									<div className='text-secondary text-center'>预览渲染中...</div>
								) : (
									<div className='card relative p-6'>
										<div className='prose prose-sm max-w-none'>{content}</div>
									</div>
								)}
							</div>
						) : (
							// 编辑模式下的编辑器界面
							<div className='space-y-6'>
								<div className='space-y-4'>
									{/* 标题输入 */}
									<input
										type='text'
										placeholder='标题'
										className='w-full px-4 py-3 text-center text-2xl font-bold'
										value={data.title}
										onChange={e => setData({ ...data, title: e.target.value })}
									/>
									{/* 描述输入 */}
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
						// 普通浏览模式，显示标题、描述和渲染后的 Markdown
						<>
							{/* 标题与描述区域，带淡入上移动画 */}
							<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className='mb-12 text-center'>
								<h1 className='mb-4 text-4xl font-bold'>{data.title}</h1>
								<p className='text-secondary text-lg'>{data.description}</p>
							</motion.div>

							{loading ? (
								<div className='text-secondary text-center'>加载中...</div>
							) : (
								// Markdown 渲染内容，带缩放动画
								<motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className='card relative p-6'>
									<div className='prose prose-sm max-w-none'>{content}</div>
								</motion.div>
							)}
						</>
					)}

					{/* 底部链接和点赞按钮 */}
					<div className='mt-8 flex items-center justify-center gap-6'>
						{/* GitHub 图标链接 */}
						<motion.a
							href='https://github.com/YYsuni/2025-blog-public'
							target='_blank'
							rel='noreferrer'
							initial={{ opacity: 0, scale: 0.6 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 0 }}
							className='bg-card flex h-[53px] w-[53px] items-center justify-center rounded-full border'>
							<GithubSVG />
						</motion.a>

						{/* 点赞按钮 */}
						<LikeButton slug='open-source' delay={0} />
					</div>
				</div>
			</div>

			{/* 固定于右上角的操作按钮，移动端隐藏 */}
			<motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className='fixed top-4 right-6 z-10 flex gap-3 max-sm:hidden'>
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
						{/* 预览/继续编辑切换按钮 */}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={() => setIsPreviewMode(prev => !prev)}
							disabled={isSaving}
							className={`rounded-xl border bg-white/60 px-6 py-2 text-sm`}>
							{isPreviewMode ? '继续编辑' : '预览'}
						</motion.button>
						{/* 保存（或导入密钥）按钮 */}
						<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSaveClick} disabled={isSaving} className='brand-btn px-6'>
							{isSaving ? '保存中...' : buttonText}
						</motion.button>
					</>
				) : (
					// 非编辑模式下，根据配置决定是否显示编辑入口按钮
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
