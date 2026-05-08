// 声明该组件为客户端组件，仅在浏览器端渲染
'use client'

// 引入写作用户输入状态管理 store（包含文章表单数据、封面等）
import { useWriteStore } from './stores/write-store'
// 引入预览模式状态管理 store（控制预览的显示/关闭）
import { usePreviewStore } from './stores/preview-store'
// 引入编辑器组件
import { WriteEditor } from './components/editor'
// 引入侧边栏组件（如设置、发布选项等）
import { WriteSidebar } from './components/sidebar'
// 引入底部操作栏组件（如保存草稿、发布等按钮）
import { WriteActions } from './components/actions'
// 引入预览组件
import { WritePreview } from './components/preview'
// 引入 React 的 useEffect 钩子
import { useEffect } from 'react'

export default function WritePage() {
	// 从 writeStore 中获取表单数据、封面信息以及重置方法
	const { form, cover, reset } = useWriteStore()
	
	// 组件挂载时调用 reset，清空/初始化写作状态（避免残留数据）
	useEffect(() => reset(), [])
	
	// 从 previewStore 获取预览开关状态和关闭预览的方法
	const { isPreview, closePreview } = usePreviewStore()

	// 计算封面预览地址：
	// 如果封面类型是 url，则直接使用该 url；
	// 如果是其他类型（如上传文件），则使用生成的预览地址；
	// 若没有封面则返回 null
	const coverPreviewUrl = cover 
		? (cover.type === 'url' ? cover.url : cover.previewUrl) 
		: null

	// 根据预览状态决定渲染哪个视图
	return isPreview ? (
		// 预览模式：渲染 WritePreview 组件，并传入表单数据、封面预览地址和关闭回调
		<WritePreview 
			form={form} 
			coverPreviewUrl={coverPreviewUrl} 
			onClose={closePreview} 
		/>
	) : (
		// 编辑模式：渲染编辑界面
		<>
			{/* 主内容区：水平居中，包含编辑器与侧边栏 */}
			<div className='flex h-full justify-center gap-6 px-6 pt-24 pb-12'>
				<WriteEditor />
				<WriteSidebar />
			</div>

			{/* 底部操作区域 */}
			<WriteActions />
		</>
	)
}