import { marked } from 'marked'
import type { Tokens } from 'marked'

// 目录项的接口定义
export type TocItem = { id: string; text: string; level: number }

// Markdown 渲染结果接口，包含生成的 HTML 和目录
export interface MarkdownRenderResult {
	html: string
	toc: TocItem[]
}

/**
 * 生成可用于 HTML id 的 slug 字符串
 * 处理流程：转小写 → 移除非字母数字汉字及空格连字符的字符 → 去首尾空格 → 连续空格替换为单个连字符
 */
export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-')
}

// -------------------- 语法高亮模块的懒加载处理（适配 Cloudflare Workers 等环境）--------------------
// shiki 模块的缓存和加载状态
let shikiModule: typeof import('shiki') | null = null
let shikiLoadAttempted = false

/**
 * 异步加载 shiki 语法高亮库
 * 只在第一次调用时执行动态导入，失败则返回 null 而不抛出异常
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

// -------------------- KaTeX 数学公式渲染模块的懒加载处理 --------------------
let katexModule: typeof import('katex') | null = null
let katexLoadAttempted = false

/**
 * 异步加载 KaTeX 数学公式渲染库
 * 兼容 CJS/ESM 不同打包方式的导出：某些环境会挂在 default 下，此处做归一化处理
 */
async function loadKatex() {
	if (katexModule) return katexModule
	if (katexLoadAttempted) return null
	katexLoadAttempted = true

	try {
		// katex 以 CJS 格式发布；取决于打包工具或运行时，
		// 动态导入可能直接返回导出对象，也可能放在 default 属性中
		const mod: any = await import('katex')
		katexModule = (mod?.default ?? mod) as any
		return katexModule
	} catch (error) {
		console.warn('Failed to load katex module:', error)
		return null
	}
}

/**
 * 将 Markdown 文本渲染为 HTML 并提取目录
 * 支持：
 * - 代码块语法高亮（shiki，失败时降级为普通 <pre>）
 * - 数学公式（KaTeX，支持行内 $...$ 和块级 $$...$$，失败时保留原始标记）
 * - 自动生成标题 slug 并构建目录
 * - 任务列表项渲染
 *
 * @param markdown 原始 Markdown 字符串
 * @returns 包含渲染后的 HTML 和目录项的 Promise
 */
export async function renderMarkdown(markdown: string): Promise<MarkdownRenderResult> {
	// 存储已经过 shiki 处理的代码块，键为占位符，值为 { html, original }
	const codeBlockMap = new Map<string, { html: string; original: string }>()

	// 并行加载 shiki 和 katex，尽可能在首次解析前完成扩展注册
	const [shiki, katex] = await Promise.all([loadShiki(), loadKatex()])

	// 创建自定义渲染器，覆盖默认的标题、代码块、列表项渲染逻辑
	const renderer = new marked.Renderer()

	// 标题渲染：自动添加 slug 作为 id，方便锚点定位
	renderer.heading = (token: Tokens.Heading) => {
		const id = slugify(token.text || '')
		return `<h${token.depth} id="${id}">${token.text}</h${token.depth}>`
	}

	// 代码块渲染：如果有预处理的 shiki 结果则使用高亮 HTML，否则降级展示
	renderer.code = (token: Tokens.Code) => {
		// 检查该代码块是否已被预处理替换为占位符
		const codeData = codeBlockMap.get(token.text)
		if (codeData) {
			// 将原始代码写入 data-code 属性，方便前端实现复制功能
			// 同时对属性值中的 HTML 特殊字符进行转义
			const escapedCode = codeData.original
				.replace(/&/g, '&amp;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#39;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
			if (codeData.html) {
				// shiki 成功生成的高亮片段
				return `<pre data-code="${escapedCode}">${codeData.html}</pre>`
			}
			// shiki 高亮失败或无结果，使用普通 <code> 包裹原始代码
			return `<pre data-code="${escapedCode}"><code>${codeData.original}</code></pre>`
		}
		// 理论上不会进入此分支（所有 code token 均已被预处理），作为安全回退
		return `<code>${token.text}</code>`
	}

	// 列表项渲染：支持任务列表（勾选框）以及列表中嵌套的行内 Markdown（如链接、强调）
	renderer.listitem = (token: Tokens.ListItem) => {
		let inner = token.text
		let tokens = token.tokens

		// 任务列表面在 tokens 的首位会有一个勾选框标记，需要跳过它来解析内容
		if (token.task) tokens = tokens.slice(1)

		// 使用 marked 的 parser 重新解析 tokens 以支持内联格式
		inner = marked.parser(tokens) as string

		if (token.task) {
			const checkbox = token.checked
				? '<input type="checkbox" checked disabled />'
				: '<input type="checkbox" disabled />'
			return `<li class="task-list-item">${checkbox} ${inner}</li>\n`
		}

		return `<li>${inner}</li>\n`
	}

	/**
	 * 使用 KaTeX 渲染数学公式
	 * @param content 公式内容（不含定界符）
	 * @param displayMode 是否为块级公式
	 * @returns 渲染后的 HTML 字符串，失败时返回原始定界符包裹的内容
	 */
	const renderMath = (content: string, displayMode: boolean) => {
		if (!katex) {
			// 未加载 KaTeX 时保留原始语法
			return displayMode ? `$$${content}$$` : `$${content}$`
		}

		try {
			return katex.renderToString(content, {
				displayMode,
				throwOnError: false, // 即使有错误也不抛出，返回错误信息 HTML
				output: 'html',
				strict: 'ignore'       // 忽略不严格的 LaTeX 语法警告
			})
		} catch {
			return displayMode ? `$$${content}$$` : `$${content}$`
		}
	}

	// 注册自定义扩展（数学公式块/行内）以及覆盖的渲染器
	// 必须在 lexer 解析之前注册，否则冷刷新时数学 token 不会被生成
	marked.use({
		renderer,
		extensions: [
			// 块级数学公式 $$ ... $$
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
			// 行内数学公式 $ ... $
			{
				name: 'mathInline',
				level: 'inline',
				start(src: string) {
					const idx = src.indexOf('$')
					return idx === -1 ? undefined : idx
				},
				tokenizer(src: string) {
					// 避免匹配块级公式 $$ 和转义后的 \$
					if (src.startsWith('$$')) return
					if (src.startsWith('\\$')) return

					const match = src.match(/^\$([^\n$]+?)\$/)
					if (!match) return

					const inner = match[1]
					// 简单的启发式检查：要求公式内有非空白字符，避免空公式
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

	// 第一步：将 Markdown 解析为 token 流（已应用自定义扩展）
	const tokens = marked.lexer(markdown)

	// 从 token 流中提取目录（只取 h1 ~ h3）
	const toc: TocItem[] = []
	function extractHeadings(tokenList: typeof tokens) {
		for (const token of tokenList) {
			if (token.type === 'heading' && token.depth <= 3) {
				// 标题文本中的 Markdown 语法（如链接、行内代码）在此时已经被解析为纯文本
				const text = token.text
				const id = slugify(text)
				toc.push({ id, text, level: token.depth })
			}
			// 递归处理嵌套的 token 结构（如 blockquote、列表中的标题）
			if ('tokens' in token && token.tokens) {
				extractHeadings(token.tokens as typeof tokens)
			}
		}
	}
	extractHeadings(tokens)

	// 第二步：对代码块进行 shiki 预处理，将其 token text 替换为占位键
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
					codeToken.text = key
				} catch {
					// 高亮失败时仍保留原始代码以供渲染器降级处理
					codeBlockMap.set(key, { html: '', original: originalCode })
					codeToken.text = key
				}
			} else {
				// shiki 不可用时同样设置占位符，后续在渲染器中只会展示 <code>
				codeBlockMap.set(key, { html: '', original: originalCode })
				codeToken.text = key
			}
		}
	}

	// 最终解析 token 流生成 HTML
	const html = (marked.parser(tokens) as string) || ''

	return { html, toc }
}
