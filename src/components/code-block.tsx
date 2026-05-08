'use client'

// 从 React 中导入 useState 钩子，用于管理组件的本地状态
import { useState } from 'react'
// 从 lucide-react 图标库中导入 Copy 和 Check 图标组件
import { Copy, Check } from 'lucide-react'

// 定义 CodeBlock 组件的 Props 类型
type CodeBlockProps = {
	children: React.ReactNode // 组件包裹的子节点（例如语法高亮后的代码元素）
	code: string // 原始代码字符串，用于复制功能
}

// 代码块包装组件，提供一键复制能力
export function CodeBlock({ children, code }: CodeBlockProps) {
	// 定义 copied 状态，用来控制复制按钮图标的切换（复制/已复制）
	const [copied, setCopied] = useState(false)

	// 处理复制按钮点击事件的异步函数
	const handleCopy = async () => {
		try {
			// 将代码文本写入系统剪贴板
			await navigator.clipboard.writeText(code)
			// 设置 copied 为 true，临时显示“已复制”图标
			setCopied(true)
			// 2 秒后恢复为未复制状态，切换回复制图标
			setTimeout(() => setCopied(false), 2000)
		} catch (error) {
			// 如果复制失败，在控制台打印错误信息（通常因非安全上下文或权限问题）
			console.error('Failed to copy code:', error)
		}
	}

	return (
		// 外层容器，用于包裹代码块和复制按钮
		<div className='code-block-wrapper'>
			{/* 复制按钮，绝对定位在代码块右上角等样式由 className 控制 */}
			<button
				type='button'
				onClick={handleCopy}
				className='code-block-copy-btn'
				aria-label='Copy code' // 提供无障碍访问标签
			>
				{/* 根据 copied 状态动态显示不同图标：已复制显示 Check，未复制显示 Copy */}
				{copied ? <Check size={16} /> : <Copy size={16} />}
			</button>
			{/* 渲染传入的子节点，即被包装的代码内容 */}
			{children}
		</div>
	)
}
