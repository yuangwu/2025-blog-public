'use client' // 声明这是一个客户端组件，允许使用浏览器 API 和 React hooks

import { useParams } from 'next/navigation' // 获取动态路由参数
import { useWriteStore } from '../stores/write-store' // 编辑状态管理（表单数据、封面等）
import { usePreviewStore } from '../stores/preview-store' // 预览状态管理（是否显示预览）
import { useLoadBlog } from '../hooks/use-load-blog' // 自定义 Hook：根据 slug 加载博客数据
import { WriteEditor } from '../components/editor' // 编辑器组件（主体内容编辑）
import { WriteSidebar } from '../components/sidebar' // 侧边栏组件（元数据、封面设置等）
import { WriteActions } from '../components/actions' // 操作按钮组件（保存、发布等）
import { WritePreview } from '../components/preview' // 预览组件（全屏预览）

export default function EditBlogPage() {
	// 获取路由参数中的 slug，类型断言为包含可选 slug 的对象
	const params = useParams() as { slug?: string }
	const slug = params?.slug || '' // 解析 slug，若不存在则为空字符串

	// 从编辑 store 中获取表单数据和封面对象
	const { form, cover } = useWriteStore()
	// 从预览 store 中获取预览状态和关闭预览的方法
	const { isPreview, closePreview } = usePreviewStore()
	// 根据 slug 加载博客，返回 loading 状态（加载中为 true）
	const { loading } = useLoadBlog(slug)

	// 计算封面预览 URL：若封面为 URL 类型则直接使用 url，否则使用预览地址（如本地文件）
	const coverPreviewUrl = cover ? (cover.type === 'url' ? cover.url : cover.previewUrl) : null

	// 数据加载中状态：显示居中加载提示
	if (loading) {
		return <div className='text-secondary flex h-screen items-center justify-center text-sm'>加载中...</div>
	}

	// 参数无效：slug 为空时显示错误信息
	if (!slug) {
		return <div className='flex h-screen items-center justify-center text-sm text-red-500'>无效的博客 ID</div>
	}

	// 根据预览状态进行条件渲染
	return isPreview ? (
		// 预览模式：渲染全屏预览组件，传入表单数据、封面预览 URL、关闭回调及 slug
		<WritePreview form={form} coverPreviewUrl={coverPreviewUrl} onClose={closePreview} slug={slug} />
	) : (
		// 编辑模式：显示左右布局的编辑器和侧边栏，以及底部的操作按钮
		<>
			<div className='flex h-full justify-center gap-6 px-6 pt-24 pb-12'>
				<WriteEditor />   {/* 主编辑器：Markdown 或富文本输入 */}
				<WriteSidebar /> {/* 侧边栏：设置标题、标签、封面等 */}
			</div>

			<WriteActions /> {/* 底部操作栏：保存草稿、发布、预览按钮等 */}
		</>
	)
}