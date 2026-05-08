// 声明该文件为客户端组件，确保在 Next.js App Router 中可以安全使用 React Hooks（如 useState、useEffect）
'use client'

import { useEffect, useState, type ReactElement, Fragment } from 'react'
import parse, { type HTMLReactParserOptions, Element, type DOMNode } from 'html-react-parser'
import { renderMarkdown, type TocItem } from '@/lib/markdown-renderer'
import { MarkdownImage } from '@/components/markdown-image'
import { CodeBlock } from '@/components/code-block'

// useMarkdownRender 的返回值类型
type MarkdownRenderResult = {
	content: ReactElement | null // 渲染后的 React 元素
	toc: TocItem[]                // 目录项列表
	loading: boolean              // 加载状态
}

/**
 * 自定义 Hook：将 Markdown 文本渲染为 React 元素，并提取目录 (TOC)
 * @param markdown 原始 Markdown 字符串
 * @returns {MarkdownRenderResult} 包含渲染内容、目录和加载状态
 */
export function useMarkdownRender(markdown: string): MarkdownRenderResult {
	// 保存最终渲染的 React 内容
	const [content, setContent] = useState<ReactElement | null>(null)
	// 保存文章目录
	const [toc, setToc] = useState<TocItem[]>([])
	// 加载状态标识
	const [loading, setLoading] = useState<boolean>(true)

	useEffect(() => {
		// 用于取消过时的异步操作，避免在组件卸载后设置状态
		let cancelled = false

		async function render() {
			// 开始新的渲染，先置为加载中
			setLoading(true)
			try {
				// 调用 renderMarkdown 将 Markdown 转为 HTML 和目录
				const { html, toc } = await renderMarkdown(markdown)
				if (!cancelled) {
					// 在解析 HTML 之前，提取所有 <pre> 标签并用占位符替换，
					// 这样可以避免 html-react-parser 对代码块进行默认处理，
					// 从而让我们能够使用自定义的 CodeBlock 组件渲染。
					const codeBlocks: Array<{ placeholder: string; code: string; preHtml: string }> = []
					let processedHtml = html.replace(
						/<pre\s+data-code="([^"]*)"([^>]*)>([\s\S]*?)<\/pre>/g,
						(match, codeAttr, attrs, content) => {
							// 生成唯一占位符，稍后在解析文本节点时还原为组件
							const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`
							// 解码 data-code 属性中的 HTML 实体，得到原始代码字符串
							const code = codeAttr
								.replace(/&quot;/g, '"')
								.replace(/&#39;/g, "'")
								.replace(/&lt;/g, '<')
								.replace(/&gt;/g, '>')
								.replace(/&amp;/g, '&')
							// 存储原始 pre 内部 HTML（包含语法高亮等标记），供 CodeBlock 子元素使用
							codeBlocks.push({
								placeholder,
								code,
								preHtml: `${content}`
							})
							// 返回占位符，以便后续在文本节点中识别
							return placeholder
						}
					)

					// 配置 html-react-parser 的替换规则
					const options: HTMLReactParserOptions = {
						replace(domNode: DOMNode) {
							// 将普通 <img> 替换为自定义的 MarkdownImage 组件
							if (domNode instanceof Element && domNode.name === 'img') {
								const { src, alt, title } = domNode.attribs
								return <MarkdownImage src={src} alt={alt} title={title} />
							}
							// 处理文本节点中的代码块占位符
							if (domNode.type === 'text' && domNode.data && domNode.data.includes('__CODE_BLOCK_')) {
								const text = domNode.data
								// 按占位符拆分文本，保留占位符本身
								const result = text
									.split(/(__CODE_BLOCK_\d+__)/)
									.filter(Boolean)

								return (
									<>
										{result.map((item, index) => {
											// 是占位符，找出对应的代码块信息
											if (item.startsWith('__CODE_BLOCK_')) {
												const block = codeBlocks.find(b => b.placeholder === item)
												if (block) {
													// 将 pre 内部的 HTML 解析为 React 元素，作为 CodeBlock 的子内容
													const preElement = parse(block.preHtml) as ReactElement
													return (
														<CodeBlock key={block.placeholder} code={block.code}>
															{preElement}
														</CodeBlock>
													)
												}
											} else {
												// 普通文本片段，用 Fragment 包裹以保持正确的 key
												return item
													? <Fragment key={index}>{item}</Fragment>
													: null
											}
										})}
									</>
								)
							}
						}
					}

					// 使用自定义选项解析处理后的 HTML，得到 React 元素
					const reactContent = parse(processedHtml, options) as ReactElement
					setContent(reactContent)
					setToc(toc)
				}
			} catch (error) {
				// 发生错误时记录日志，并在未取消的情况下清空内容与目录
				console.error('Markdown render error:', error)
				if (!cancelled) {
					setContent(null)
					setToc([])
				}
			} finally {
				// 只要异步操作未被取消，都将加载状态置为 false
				if (!cancelled) {
					setLoading(false)
				}
			}
		}

		// 执行渲染
		render()

		// 清理函数：当 markdown 变化或组件卸载时，取消仍在进行的任务
		return () => {
			cancelled = true
		}
	}, [markdown]) // 当 markdown 内容变化时重新渲染

	// 将渲染结果暴露给调用方
	return { content, toc, loading }
}
