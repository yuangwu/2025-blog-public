'use client'  // 标记为客户端组件，Next.js 13+ App Router 必需

// 导入编写页面的状态管理（表单数据、封面信息、重置方法）
import { useWriteStore } from './stores/write-store'
// 导入预览模式的状态管理（是否预览、关闭预览方法）
import { usePreviewStore } from './stores/preview-store'
// 编写区编辑器组件
import { WriteEditor } from './components/editor'
// 侧边栏组件（通常包含选项、设置等）
import { WriteSidebar } from './components/sidebar'
// 底部操作栏组件（如发布、保存等按钮）
import { WriteActions } from './components/actions'
// 预览模式下的文章展示组件
import { WritePreview } from './components/preview'
// React 副作用钩子
import { useEffect } from 'react'

// 编写页面的默认导出组件
export default function WritePage() {
	// 从编写状态中解构出表单数据、封面对象、重置函数
	const { form, cover, reset } = useWriteStore()
	// 组件挂载时重置编写页面状态（清空草稿等），确保每次进入都是全新状态
	useEffect(() => reset(), [])

	// 从预览状态中解构是否处于预览模式及关闭预览的函数
	const { isPreview, closePreview } = usePreviewStore()

	// 计算封面的预览 URL：
	// - 如果没有封面，则为 null
	// - 如果封面类型是 url，则使用 cover.url
	// - 否则（例如上传的本地文件）使用 cover.previewUrl
	const coverPreviewUrl = cover ? (cover.type === 'url' ? cover.url : cover.previewUrl) : null

	// 条件渲染：根据是否预览来决定显示预览组件还是编辑界面
	return isPreview ? (
		// 预览模式：传递表单数据、封面预览 URL、关闭预览的回调
		<WritePreview form={form} coverPreviewUrl={coverPreviewUrl} onClose={closePreview} />
	) : (
		// 编辑模式：展示编辑器、侧边栏和底部操作栏
		<>
			{/* 弹性布局容器，水平居中，间距 1.5rem，内边距：上 6rem，左右 1.5rem，下 3rem */}
			<div className='flex h-full justify-center gap-6 px-6 pt-24 pb-12'>
				<WriteEditor />   {/* 富文本/Markdown 编辑区 */}
				<WriteSidebar />  {/* 侧边栏（如封面设置、标签、分类等） */}
			</div>

			<WriteActions />      {/* 底部操作按钮（保存草稿、发布、预览等） */}
		</>
	)
}
