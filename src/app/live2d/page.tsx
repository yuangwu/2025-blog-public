'use client' // 此指令标记该组件为客户端组件，可在浏览器中运行（Next.js App Router）

// 从当前目录下的 live2d-viewer 模块导入 Live2DViewer 组件
import Live2DViewer from './live2d-viewer'

/**
 * Live2D 页面组件
 * 负责渲染一个居中显示的 Live2D 查看器
 */
export default function Live2DPage() {
	return (
		// 外层容器：使用 Flex 布局，高度占满父容器，内容水平垂直居中，并带上下内边距
		<div className='flex h-full items-center justify-center py-8'>
			{/* 实例化 Live2D 查看器组件 */}
			<Live2DViewer />
		</div>
	)
}
