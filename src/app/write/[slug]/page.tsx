'use client' // 标记为客户端组件，因为使用了状态管理和浏览器 API

import { useParams } from 'next/navigation'
import { useWriteStore } from '../stores/write-store' // 编辑器表单与封面数据状态
import { usePreviewStore } from '../stores/preview-store' // 预览模式状态
import { useLoadBlog } from '../hooks/use-load-blog' // 根据 slug 加载博客数据的自定义 Hook
import { WriteEditor } from '../components/editor' // 编辑器主体组件
import { WriteSidebar } from '../components/sidebar' // 侧边栏（设置、标签等）
import { WriteActions } from '../components/actions' // 底部操作栏（保存、发布等）
import { WritePreview } from '../components/preview' // 预览弹窗/页面

export default function EditBlogPage() {
	// 获取动态路由参数 slug，例如 /edit/[slug]
	const params = useParams() as { slug?: string }
	const slug = params?.slug || '' // 确保 slug 是字符串，未获取到时为空字符串

	// 从状态管理中获取表单数据与封面信息
	const { form, cover } = useWriteStore()
	// 预览状态与关闭预览的方法
	const { isPreview, closePreview } = usePreviewStore()
	// 加载博客数据，loading 表示是否正在请求
	const { loading } = useLoadBlog(slug)

	// 计算封面预览用的 URL，优先使用 URL 类型封面，否则使用本地预览地址
	const coverPreviewUrl = cover
		? cover.type === 'url'
			? cover.url
			: cover.previewUrl
		: null

	// 数据加载中，展示加载状态
	if (loading) {
		return (
			<div className="text-secondary flex h-screen items-center justify-center text-sm">
				加载中...
			</div>
		)
	}

	// 如果没有有效的 slug，说明路由参数异常，给出错误提示
	if (!slug) {
		return (
			<div className="flex h-screen items-center justify-center text-sm text-red-500">
				无效的博客 ID
			</div>
		)
	}

	// 根据预览状态渲染不同界面
	return isPreview ? (
		// 预览模式：展示博客预览内容，并可关闭预览
		<WritePreview
			form={form}
			coverPreviewUrl={coverPreviewUrl}
			onClose={closePreview}
			slug={slug}
		/>
	) : (
		// 编辑模式：编辑器 + 侧边栏布局，以及底部操作栏
		<>
			<div className="flex h-full justify-center gap-6 px-6 pt-24 pb-12">
				<WriteEditor />
				<WriteSidebar />
			</div>
			<WriteActions />
		</>
	)
}
