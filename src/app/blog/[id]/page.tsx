'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { motion } from 'motion/react'
// 导入博客预览组件，用于渲染博客内容
import { BlogPreview } from '@/components/blog-preview'
// 导入加载博客的方法和博客配置类型
import { loadBlog, type BlogConfig } from '@/lib/load-blog'
// 自定义 Hook，用于管理已读文章
import { useReadArticles } from '@/hooks/use-read-articles'
// 仅在特定博客中显示的特效组件（如液态草地动画）
import LiquidGrass from '@/components/liquid-grass'

/**
 * 博客详情页面组件
 * 根据动态路由的 slug 加载并展示对应的博客文章
 */
export default function Page() {
	// 获取路由参数，可能为 id 字符串或字符串数组
	const params = useParams() as { id?: string | string[] }
	// 统一处理 slug 为字符串（取数组的第一项或直接使用字符串，无参数时为空字符串）
	const slug = Array.isArray(params?.id) ? params.id[0] : params?.id || ''
	const router = useRouter()
	// 获取“标记为已读”的方法
	const { markAsRead } = useReadArticles()

	// 博客数据状态：包含配置、markdown 内容和封面图
	const [blog, setBlog] = useState<{ config: BlogConfig; markdown: string; cover?: string } | null>(null)
	// 错误信息状态
	const [error, setError] = useState<string | null>(null)
	// 加载状态
	const [loading, setLoading] = useState<boolean>(true)

	// 当 slug 或 markAsRead 发生变化时，重新加载博客数据
	useEffect(() => {
		let cancelled = false // 防止组件卸载后仍然更新状态
		async function run() {
			if (!slug) return // 如果没有 slug，直接返回
			try {
				setLoading(true)
				// 调用加载函数获取博客数据
				const blogData = await loadBlog(slug)

				// 仅在组件未卸载时更新状态
				if (!cancelled) {
					setBlog(blogData)
					setError(null)
					markAsRead(slug) // 标记文章为已读
				}
			} catch (e: any) {
				if (!cancelled) setError(e?.message || '加载失败')
			} finally {
				if (!cancelled) setLoading(false)
			}
		}
		run()
		// 组件卸载时设置 cancelled 为 true，避免内存泄漏或错误更新
		return () => {
			cancelled = true
		}
	}, [slug, markAsRead])

	// 博客标题优先使用配置中的标题，否则回退为 slug
	const title = useMemo(() => (blog?.config.title ? blog.config.title : slug), [blog?.config.title, slug])
	// 格式化日期为中文格式（例如：2026年 5月 8日）
	const date = useMemo(() => dayjs(blog?.config.date).format('YYYY年 M月 D日'), [blog?.config.date])
	// 标签列表
	const tags = blog?.config.tags || []

	// 跳转到编辑页面的处理函数
	const handleEdit = () => {
		router.push(`/write/${slug}`)
	}

	// 无效链接提示
	if (!slug) {
		return <div className='text-secondary flex h-full items-center justify-center text-sm'>无效的链接</div>
	}

	// 加载中提示
	if (loading) {
		return <div className='text-secondary flex h-full items-center justify-center text-sm'>加载中...</div>
	}

	// 加载出错提示
	if (error) {
		return <div className='flex h-full items-center justify-center text-sm text-red-500'>{error}</div>
	}

	// 博客不存在提示
	if (!blog) {
		return <div className='text-secondary flex h-full items-center justify-center text-sm'>文章不存在</div>
	}

	return (
		<>
			{/* 博客预览主体 */}
			<BlogPreview
				markdown={blog.markdown}
				title={title}
				tags={tags}
				date={date}
				summary={blog.config.summary}
				/* 封面图处理：若是完整链接直接使用，否则拼接当前域名前缀 */
				cover={blog.cover ? (blog.cover.startsWith('http') ? blog.cover : `${origin}${blog.cover}`) : undefined}
				slug={slug}
			/>

			{/* 编辑按钮，使用 framer-motion 添加动效 */}
			<motion.button
				initial={{ opacity: 0, scale: 0.6 }}
				animate={{ opacity: 1, scale: 1 }}
				whileHover={{ scale: 1.05 }}
				whileTap={{ scale: 0.95 }}
				onClick={handleEdit}
				className='absolute top-4 right-6 rounded-xl border bg-white/60 px-6 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/80 max-sm:hidden'>
				编辑
			</motion.button>

			{/* 当 slug 为 'liquid-grass' 时显示自带特效组件 */}
			{slug === 'liquid-grass' && <LiquidGrass />}
		</>
	)
}
