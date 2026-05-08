import { useEffect, useState, type ReactElement, Fragment } from 'react'
import parse, { type HTMLReactParserOptions, Element, type DOMNode } from 'html-react-parser'
import { renderMarkdown, type TocItem } from '@/lib/markdown-renderer'
import { MarkdownImage } from '@/components/markdown-image'
import { CodeBlock } from '@/components/code-block'

/**
 * useMarkdownRender 钩子的返回类型
 */
type MarkdownRenderResult = {
	/** 解析后的 React 元素，如果渲染失败则为 null */
	content: ReactElement | null
	/** 从 Markdown 提取的目录项列表 */
	toc: TocItem[]
	/** 是否正在异步渲染 */
	loading: boolean
}

/**
 * 自定义钩子：将 Markdown 字符串渲染为 React 组件，并从中提取目录
 * @param markdown - 待渲染的原始 Markdown 文本
 * @returns 包含渲染内容、目录和加载状态的对象
 */
export function useMarkdownRender(markdown: string): MarkdownRenderResult {
	// 渲染后的 React 元素
	const [content, setContent] = useState<ReactElement | null>(null)
	// 目录项
	const [toc, setToc] = useState<TocItem[]>([])
	// 加载状态
	const [loading, setLoading] = useState<boolean>(true)

	useEffect(() => {
		// 用于取消异步操作的标志，防止在组件卸载后设置状态
		let cancelled = false

		/**
		 * 异步渲染函数，执行 Markdown 转换和 HTML 后处理
		 */
		async function render() {
			setLoading(true)
			try {
				// 调用底层的 Markdown 渲染器，同步或异步返回 HTML 字符串和目录
				const { html, toc } = await renderMarkdown(markdown)

				if (!cancelled) {
					/**
					 * 存储所有提取出的代码块信息
					 * - placeholder: 在 HTML 中用于占位的唯一字符串
					 * - code: 解码后的原始代码字符串（用于 CodeBlock 组件）
					 * - preHtml: <pre> 标签内去除属性后的内容（用于保留原始结构，如语法高亮 span）
					 */
					const codeBlocks: Array<{ placeholder: string; code: string; preHtml: string }> = []

					/**
					 * 替换所有带有 data-code 属性的 <pre> 标签为占位符，
					 * 并将其中的代码和解码后的内容存入 codeBlocks 数组。
					 * 正则解释：
					 *   <pre\s+data-code="([^"]*)"  匹配 data-code 属性并捕获其值（已 HTML 实体编码）
					 *   ([^>]*)>                   匹配剩余属性
					 *   ([\s\S]*?)                捕获 <pre>...</pre> 内部全部内容（非贪婪）
					 *   <\/pre>                   结束标签
					 */
					let processedHtml = html.replace(
						/<pre\s+data-code="([^"]*)"([^>]*)>([\s\S]*?)<\/pre>/g,
						(match, codeAttr, attrs, content) => {
							const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`

							// 对 data-code 属性值进行 HTML 实体解码，得到实际代码字符串
							const code = codeAttr
								.replace(/&quot;/g, '"')
								.replace(/&#39;/g, "'")
								.replace(/&lt;/g, '<')
								.replace(/&gt;/g, '>')
								.replace(/&amp;/g, '&')

							codeBlocks.push({
								placeholder,
								code,
								preHtml: `${content}`
								// 保留 <pre> 内部原始 HTML（例如语法高亮的 <span>）
							})
							return placeholder
						}
					)

					/**
					 * 配置 html-react-parser 的替换规则
					 */
					const options: HTMLReactParserOptions = {
						replace(domNode: DOMNode) {
							// 1. 所有 <img> 标签替换为自定义的 MarkdownImage 组件
							if (domNode instanceof Element && domNode.name === 'img') {
								const { src, alt, title } = domNode.attribs
								return <MarkdownImage src={src} alt={alt} title={title} />
							}

							// 2. 处理文本节点中可能出现的代码块占位符
							if (domNode.type === 'text' && domNode.data && domNode.data.includes('__CODE_BLOCK_')) {
								const text = domNode.data

								// 按占位符分割文本，保留占位符作为独立片段
								const result = text.split(/(__CODE_BLOCK_\d+__)/).filter(Boolean)

								// 将分割后的片段映射为 React 元素：
								//   - 占位符替换为 CodeBlock 组件，并传入原始代码和解析后的 <pre> 子元素
								//   - 普通文本用 Fragment 包裹以保证正确渲染
								return (
									<>
										{result.map((item, index) => {
											if (item.startsWith('__CODE_BLOCK_')) {
												const block = codeBlocks.find(b => b.placeholder === item)
												if (block) {
													// 将保存的 preHtml（可能包含语法高亮标签）解析为 React 元素
													const preElement = parse(block.preHtml) as ReactElement
													return (
														<CodeBlock key={block.placeholder} code={block.code}>
															{preElement}
														</CodeBlock>
													)
												}
											} else {
												// 普通文本片段，用 Fragment 包裹并添加 key
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

					// 解析处理后的 HTML 字符串为 React 元素树
					const reactContent = parse(processedHtml, options) as ReactElement

					// 更新状态
					setContent(reactContent)
					setToc(toc)
				}
			} catch (error) {
				console.error('Markdown render error:', error)
				if (!cancelled) {
					// 出错时清空内容和目录
					setContent(null)
					setToc([])
				}
			} finally {
				if (!cancelled) {
					setLoading(false)
				}
			}
		}

		// 启动异步渲染
		render()

		// 清理函数：组件卸载或 markdown 变化时取消未完成的操作
		return () => {
			cancelled = true
		}
	}, [markdown])
	// 依赖 markdown，内容变化时重新渲染

	return { content, toc, loading }
}
