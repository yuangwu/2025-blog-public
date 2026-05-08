// 'use client' 指令，表明该组件仅在客户端渲染（用于 Next.js App Router 等框架）。
'use client'

// 从 React 库中导入 useState 钩子，用于管理组件内的本地状态。
import { useState } from 'react'
// 从 lucide-react 图标库导入 Copy 和 Check 图标组件。
import { Copy, Check } from 'lucide-react'

// 定义 CodeBlock 组件的 props 类型。
// children: 用于展示代码的 React 节点（通常是代码高亮后的 <pre> 或 <code> 元素）。
// code: 纯文本格式的代码字符串，供复制功能使用。
type CodeBlockProps = {
	children: React.ReactNode
	code: string
}

// 声明并导出 CodeBlock 函数组件。
// 接收 children 和 code 两个属性。
export function CodeBlock({ children, code }: CodeBlockProps) {
	// 使用 useState 创建一个 copied 状态，初始值为 false。
	// 该状态用于控制按钮图标的变化（复制成功显示勾号）。
	const [copied, setCopied] = useState(false)

	// handleCopy 是点击按钮时调用的异步函数，负责将代码复制到剪贴板。
	const handleCopy = async () => {
		try {
			// 调用浏览器剪贴板 API 将 code 文本写入系统剪贴板。
			await navigator.clipboard.writeText(code)
			// 复制成功后设置 copied 为 true，让按钮显示“已复制”图标。
			setCopied(true)
			// 2 秒后将 copied 重置为 false，图标恢复为复制图标。
			setTimeout(() => setCopied(false), 2000)
		} catch (error) {
			// 若复制失败，在控制台输出错误信息。
			console.error('Failed to copy code:', error)
		}
	}

	// 返回组件的 JSX 结构。
	return (
		// 外层 div 作为包装容器，添加自定义类名，可用于后续样式定制。
		<div className='code-block-wrapper'>
			{/* 复制按钮，类型为 button（避免在表单中意外提交）。 */}
			<button
				type='button'
				// 点击事件绑定 handleCopy 函数。
				onClick={handleCopy}
				// 添加按钮样式类。
				className='code-block-copy-btn'
				// aria-label 提供无障碍标签，屏幕阅读器可识别为“复制代码”。
				aria-label='Copy code'
			>
				{/* 根据 copied 状态动态渲染图标：
				    - 如果 copied 为 true，显示 Check（勾号图标），表示已复制；
				    - 否则显示 Copy（复制图标），表示可以复制。
				    size={16} 设置图标尺寸为 16 像素。 */}
				{copied ? <Check size={16} /> : <Copy size={16} />}
			</button>
			{/* 渲染 children，即调用该组件时传入的代码展示内容。 */}
			{children}
		</div>
	)
}