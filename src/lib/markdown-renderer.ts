// 从 marked 库导入 marked 解析器和 Tokens 类型
import { marked } from 'marked'
import type { Tokens } from 'marked'

// 目录项类型：包含锚点 id、显示文本和标题级别
export type TocItem = { id: string; text: string; level: number }

// Markdown 渲染结果接口：包含生成的 HTML 字符串和目录数组
export interface MarkdownRenderResult {
	html: string
	toc: TocItem[]
}

/**
 * 将文本转换为符合 URL 规范的 slug（用于标题锚点）
 * 规则：转为小写，移除非法字符（保留字母、数字、中文字符、空格和短横线），
 * 首尾去空格，最后将连续空格替换为单个短横线
 */
export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-')
}

// 延迟加载 shiki 高亮库，以应对某些不支持的环境（如 Cloudflare Workers）
let shikiModule: typeof import('shiki') | null = null
let shikiLoadAttempted = false

/**
 * 异步加载 shiki 模块（仅尝试一次）
 */
async function loadShiki() {
	if (shikiLoadAttempted) {
		return shikiModule
	}
	shikiLoadAttempted = true

	try {
		shikiModule = await import('shiki')
		return shikiModule
	} catch (error) {
		console.warn('Failed to load shiki module:', error)
		return null
	}
}

// 延迟加载 katex 数学公式渲染库，以应对不支持的环境
let katexModule: typeof import('katex') | null = null
let katexLoadAttempted = false

/**
 * 异步加载 katex 模块（仅尝试一次）
 * 注意：katex 发布为 CJS 模块，在不同打包器/运行时可能需要从 .default 获取
 */
async function loadKatex() {
	if (katexModule) return katexModule
	if (katexLoadAttempted) return null
	katexLoadAttempted = true

	try {
		// katex 是 CJS 模块；动态导入可能返回整个导出对象，也可能挂在 default 上
		const mod: any = await import('katex')
		katexModule = (mod?.default ?? mod) as any
		return katexModule
	} catch (error) {
		console.warn('Failed to load katex module:', error)
		return null
	}
}

/**
 * 主渲染函数：将 Markdown 字符串解析为 HTML，并提取目录
 * 支持 Shiki 代码高亮、Katex 数学公式、任务列表和自定义 slug
 */
export async function renderMarkdown(markdown: string): Promise<MarkdownRenderResult> {
	// 用于存储代码块的原始内容和渲染后的 HTML，key 为占位符标识
	const codeBlockMap = new Map<string, { html: string; original: string }>()
	// 提前并行加载可选渲染器，确保在第一次解析（lex）前已注册扩展
	const [shiki, katex] = await Promise.all([loadShiki(), loadKatex()])

	// 创建自定义的 marked 渲染器实例
	const renderer = new marked.Renderer()

	// 自定义标题渲染：自动添加 id 属性（基于标题文本生成 slug）
	renderer.heading = (token: Tokens.Heading) => {
		const id = slugify(token.text || '')
		return `<h${token.depth} id="${id}">${token.text}</h${token.depth}>`
	}

	// 自定义代码块渲染：优先使用 Shiki 高亮，同时携带原始代码（用于复制功能）
	renderer.code = (token: Tokens.Code) => {
		// 检查当前代码块是否已被预处理并放入 codeBlockMap
		const codeData = codeBlockMap.get(token.text)
		if (codeData) {
			// 转义 HTML 特殊字符，防止 XSS
			const escapedCode = codeData.original.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
			if (codeData.html) {
				// 使用 Shiki 渲染的 HTML
				return `<pre data-code="${escapedCode}">${codeData.html}</pre>`
			}
			// Shiki 不可用或渲染失败的降级方案
			return `<pre data-code="${escapedCode}"><code>${codeData.original}</code></pre>`
		}
		// 默认内联代码渲染（正常情况下代码块都会经过预处理，此处为兜底）
		return `<code>${token.text}</code>`
	}

	// 自定义列表项渲染：支持任务列表和列表内联 Markdown 解析
	renderer.listitem = (token: Tokens.ListItem) => {
		let inner = token.text
		let tokens = token.tokens

		// 任务列表标记常作为额外 token 存在，需移除
		if (token.task) tokens = tokens.slice(1)
		// 重新解析 tokens 为内联 HTML，保留链接、强调等
		inner = marked.parser(tokens) as string

		if (token.task) {
			const checkbox = token.checked ? '<input type="checkbox" checked disabled />' : '<input type="checkbox" disabled />'
			return `<li class="task-list-item">${checkbox} ${inner}</li>\n`
		}

		return `<li>${inner}</li>\n`
	}

	// 数学公式渲染函数（行内或块级）
	const renderMath = (content: string, displayMode: boolean) => {
		if (!katex) {
			// Katex 未加载时保留原始分隔符
			return displayMode ? `$$${content}$$` : `$${content}$`
		}

		try {
			return katex.renderToString(content, {
				displayMode,
				throwOnError: false,  // 出错不抛异常，返回错误信息
				output: 'html',
				strict: 'ignore'      // 忽略严格模式下的警告
			})
		} catch {
			// 极端情况下的兜底
			return displayMode ? `$$${content}$$` : `$${content}$`
		}
	}

	// 注册 marked 扩展（包括渲染器和数学公式标记识别）
	// 扩展必须在 lex 之前注册，否则冷刷新时数学公式不会被识别
	marked.use({
		renderer,
		extensions: [
			// 块级数学公式：$$ ... $$
			{
				name: 'mathBlock',
				level: 'block',
				start(src: string) {
					return src.indexOf('$$')
				},
				tokenizer(src: string) {
					const match = src.match(/^\$\$([\s\S]+?)\$\$(?:\n+|$)/)
					if (!match) return
					return {
						type: 'mathBlock',
						raw: match[0],
						text: match[1].trim()
					} as any
				},
				renderer(token: any) {
					return `${renderMath(token.text || '', true)}\n`
				}
			},
			// 行内数学公式：$ ... $
			{
				name: 'mathInline',
				level: 'inline',
				start(src: string) {
					const idx = src.indexOf('$')
					return idx === -1 ? undefined : idx
				},
				tokenizer(src: string) {
					// 避免匹配块级公式（$$）和转义美元符号（\$）
					if (src.startsWith('$$')) return
					if (src.startsWith('\\$')) return

					const match = src.match(/^\$([^\n$]+?)\$/)
					if (!match) return

					const inner = match[1]
					// 启发式规则：确保内部不是全空白
					if (!inner || !inner.trim()) return

					return {
						type: 'mathInline',
						raw: match[0],
						text: inner.trim()
					} as any
				},
				renderer(token: any) {
					return renderMath(token.text || '', false)
				}
			}
		]
	})

	// 先使用 marked lexer 解析（此时扩展已注册，数学标记会被正确 tokenize）
	const tokens = marked.lexer(markdown)

	// 从解析后的 tokens 中提取目录（只提取 <= 3 级标题，且会忽略代码块内的内容）
	const toc: TocItem[] = []
	function extractHeadings(tokenList: typeof tokens) {
		for (const token of tokenList) {
			if (token.type === 'heading' && token.depth <= 3) {
				// 使用已解析的纯文本（链接、代码等标记已被去除）
				const text = token.text
				const id = slugify(text)
				toc.push({ id, text, level: token.depth })
			}
			// 递归处理嵌套 token（如引用块、列表内的标题）
			if ('tokens' in token && token.tokens) {
				extractHeadings(token.tokens as typeof tokens)
			}
		}
	}
	extractHeadings(tokens)

	// 预处理代码块：将每个 code token 替换为占位符，并尝试使用 Shiki 高亮
	for (const token of tokens) {
		if (token.type === 'code') {
			const codeToken = token as Tokens.Code
			const originalCode = codeToken.text
			const key = `__SHIKI_CODE_${codeBlockMap.size}__`

			if (shiki) {
				try {
					const html = await shiki.codeToHtml(originalCode, {
						lang: codeToken.lang || 'text',
						theme: 'one-light'
					})
					codeBlockMap.set(key, { html, original: originalCode })
					codeToken.text = key  // 将 token 文本替换为占位符，之后渲染时再从 map 中取回
				} catch {
					// 高亮失败时保留原始代码
					codeBlockMap.set(key, { html: '', original: originalCode })
					codeToken.text = key
				}
			} else {
				// Shiki 不可用时的降级方案
				codeBlockMap.set(key, { html: '', original: originalCode })
				codeToken.text = key
			}
		}
	}
	// 最终解析为 HTML 字符串
	const html = (marked.parser(tokens) as string) || ''

	return { html, toc }
}