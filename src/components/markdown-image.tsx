'use client' // 声明该文件为客户端组件，仅在浏览器端渲染和交互

import { useState } from 'react' // 引入 React 的 useState 钩子，用于管理组件内部状态
import { DialogModal } from '@/components/dialog-modal' // 引入自定义的模态对话框组件

// 定义 MarkdownImage 组件接收的属性类型
type MarkdownImageProps = {
	src: string // 图片源地址，必传
	alt?: string // 图片替代文本，可选
	title?: string // 图片标题，可选（通常作为 tooltip 显示）
}

/**
 * MarkdownImage 组件
 * 用于渲染一个懒加载的缩略图，点击该图会通过模态框展示原图大图。
 * 适用于 Markdown 渲染中嵌入图片时，提供点击放大预览的能力。
 */
export function MarkdownImage({ src, alt = '', title = '' }: MarkdownImageProps) {
	// 控制模态框显示与否的状态，初始为 false（不显示）
	const [display, setDisplay] = useState(false)

	return (
		<>
			{/* 缩略图：懒加载，点击后将 display 设为 true 以打开模态框 */}
			<img
				src={src}
				alt={alt}
				title={title}
				loading='lazy' // 启用浏览器原生懒加载，优化初始加载性能
				onClick={() => setDisplay(true)} // 点击时打开弹窗
				className='cursor-pointer transition-opacity hover:opacity-80' // 鼠标变手型，悬停时透明度变化
			/>

			{/* 大图模态框：当 display 为 true 时显示，关闭时设回 false */}
			<DialogModal
				open={display} // 控制显示/隐藏
				onClose={() => setDisplay(false)} // 关闭时更新状态
				className='max-w-none bg-transparent p-0' // 覆盖弹窗默认样式：无最大宽度、透明背景、无内边距
			>
				{/* 大图：限制最大高度为视口 90%，保持圆角和对象适配 */}
				<img
					src={src}
					alt={alt}
					className='max-h-[90vh] max-w-full rounded-2xl object-contain' // 响应式尺寸，圆角，图片不拉伸裁剪
				/>
			</DialogModal>
		</>
	)
}