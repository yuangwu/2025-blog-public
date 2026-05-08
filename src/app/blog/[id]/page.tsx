// 标记这是一个 Next.js 客户端组件（仅在浏览器端运行）
'use client'

// 导入 React 核心 hooks
import { useEffect, useMemo, useState } from 'react'
// 导入 Next.js 导航相关 hooks
import { useParams, useRouter } from 'next/navigation'
// 导入日期处理库
import dayjs from 'dayjs'
// 导入动画库组件
import { motion } from 'motion/react'
// 导入自定义博客预览组件
import { BlogPreview } from '@/components/blog-preview'
// 导入博客加载工具函数和类型定义
import { loadBlog, type BlogConfig } from '@/lib/load-blog'
// 导入自定义“已读文章”状态管理 hook
import { useReadArticles } from '@/hooks/use-read-articles'
// 导入自定义特效组件
import LiquidGrass from '@/components/liquid-grass'

// 定义页面组件（默认导出）
export default function Page() {
	// 1. 获取路由参数和导航工具
	// 获取 URL 参数（如 /blog/[id] 中的 id）
	const params = useParams() as { id?: string | string[] }
	// 处理 slug：确保是字符串（兼容数组情况）
	const slug = Array.isArray(params?.id) ? params.id[0] : params?.id || ''
	// 获取路由实例（用于页面跳转）
	const router = useRouter()
	// 从自定义 hook 中获取“标记为已读”的函数
	const { markAsRead } = useReadArticles()

	// 2. 定义组件状态
	// 博客数据状态（包含配置、Markdown 内容、封面图）
	const [blog, setBlog] = useState<{ config: BlogConfig; markdown: string; cover?: string } | null>(null)
	// 错误信息状态
	const [error, setError] = useState<string | null>(null)
	// 加载中状态
	const [loading, setLoading] = useState<boolean>(true)

	// 3. 数据加载副作用（组件挂载或 slug 变化时执行）
	useEffect(() => {
		// 用于防止组件卸载后仍设置状态（避免内存泄漏）
		let cancelled = false

		// 异步加载博客数据的核心函数
		async function run() {
			if (!slug) return
			// 如果没有 slug，直接返回

			try {
				setLoading(true)
				// 开始加载
				// 调用工具函数加载博客数据
				const blogData = await loadBlog(slug)

				// 如果组件未卸载，更新状态
				if (!cancelled) {
					setBlog(blogData)
					// 设置博客数据
					setError(null)
					// 清除错误
					markAsRead(slug)
					// 标记文章为已读
				}
			} catch (e: any) {
				// 处理加载错误
				if (!cancelled) setError(e?.message || '加载失败')
			} finally {
				// 无论成功/失败，结束加载状态
				if (!cancelled) setLoading(false)
			}
		}

		run() // 执行加载函数

		// 组件卸载时的清理函数
		return () => {
			cancelled = true
			// 标记为取消，防止状态更新
		}
	}, [slug, markAsRead])
	// 依赖项：slug 或 markAsRead 变化时重新执行

	// 4. 计算衍生数据（使用 useMemo 优化性能）
	// 计算文章标题（优先用配置中的标题，否则用 slug）
	const title = useMemo(() => (blog?.config.title ? blog.config.title : slug), [blog?.config.title, slug])
	// 格式化文章日期（如：2024年 5月 1日）
	const date = useMemo(() => dayjs(blog?.config.date).format('YYYY年 M月 D日'), [blog?.config.date])
	// 获取文章标签
	const tags = blog?.config.tags || []

	// 5. 事件处理函数
	// 点击“编辑”按钮时跳转到编辑页面
	const handleEdit = () => {
		router.push(`/write/${slug}`)
	}

	// 6. 条件渲染（根据不同状态显示不同内容）
	// 如果没有 slug，显示“无效链接”
	if (!slug) {
		return <div className='text-secondary flex h-full items-center justify-center text-sm'>无效的链接</div>
	}
	// 如果正在加载，显示“加载中...”
	if (loading) {
		return <div className='text-secondary flex h-full items-center justify-center text-sm'>加载中...</div>
	}
	// 如果有错误，显示错误信息
	if (error) {
		return <div className='flex h-full items-center justify-center text-sm text-red-500'>{error}</div>
	}
	// 如果博客数据不存在，显示“文章不存在”
	if (!blog) {
		return <div className='text-secondary flex h-full items-center justify-center text-sm'>文章不存在</div>
	}

	// 7. 正常渲染博客内容
	return (
		<>
			{/* 博客预览组件：渲染 Markdown 内容、标题、标签等 */}
			<BlogPreview
				markdown={blog.markdown}
				title={title}
				tags={tags}
				date={date}
				summary={blog.config.summary}
				// 处理封面图 URL（兼容相对路径和绝对路径）
				cover={blog.cover ? (blog.cover.startsWith('http') ? blog.cover : `${origin}${blog.cover}`) : undefined}
				slug={slug}
			/>

			{/* 动画编辑按钮（仅在非移动端显示） */}
			<motion.button
				initial={{ opacity: 0, scale: 0.6 }}
				// 初始动画状态
				animate={{ opacity: 1, scale: 1 }}
				// 进入动画
				whileHover={{ scale: 1.05 }}
				// 悬停动画
				whileTap={{ scale: 0.95 }}
				// 点击动画
				onClick={handleEdit}
				// 点击事件
				className='absolute top-4 right-6 rounded-xl border bg-white/60 px-6 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/80 max-sm:hidden'>
				编辑
			</motion.button>

			{/* 特殊特效：如果 slug 是 'liquid-grass'，显示 LiquidGrass 组件 */}
			{slug === 'liquid-grass' && <LiquidGrass />}
		</>
	)
}
