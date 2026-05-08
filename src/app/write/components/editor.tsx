// 从 motion 库引入动画组件，用于给编辑器容器添加入场动画效果
import { motion } from 'motion/react'
// 引入写作编辑器的全局状态管理 store（基于 zustand）
import { useWriteStore } from '../stores/write-store'
// 动画初始延迟常量，用于协调多个元素的动画出现顺序
import { INIT_DELAY } from '@/consts'
import { useRef } from 'react'

// 没有选中文本时，用于加粗、斜体、链接插入的默认占位文字
const defaultText = 'text'

export function WriteEditor() {
	// 从 store 中获取表单数据、更新方法、图片列表和添加图片的方法
	const { form, updateForm, images, addFiles } = useWriteStore()
	// 获取文本域的 DOM 引用，用于直接操作光标和选区
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	/**
	 * 在文本域当前光标位置插入指定文本，并保持撤销/重做历史（优先使用 execCommand）
	 * @param text 要插入的文本
	 */
	const insertText = (text: string) => {
		const textarea = textareaRef.current
		if (!textarea) return

		textarea.focus()
		// 使用 execCommand 来插入文本，这样不会丢失浏览器的原生撤销/重做历史
		const success = document.execCommand('insertText', false, text)

		// 如果浏览器不支持 execCommand（例如某些移动浏览器），使用手动拼接字符串的降级方案
		if (!success) {
			const { selectionStart, selectionEnd, value } = textarea
			const before = value.substring(0, selectionStart)
			const after = value.substring(selectionEnd)
			// 手动更新 React 状态中的 Markdown 内容
			updateForm({ md: before + text + after })
			// 更新后需要重新设置光标位置到新插入文本之后
			setTimeout(() => {
				textarea.setSelectionRange(selectionStart + text.length, selectionStart + text.length)
				textarea.focus()
			}, 0)
		}
		// execCommand 成功时会自动触发 onChange，从而同步 React 状态，无需手动更新
	}

	/**
	 * 处理键盘快捷键事件：
	 * - Ctrl/Cmd + B：切换加粗
	 * - Ctrl/Cmd + I：切换斜体
	 * - Ctrl/Cmd + K：插入链接
	 * - Tab：缩进（插入制表符）
	 * - Shift + Tab：取消缩进
	 */
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		const textarea = textareaRef.current
		if (!textarea) return

		const { selectionStart, selectionEnd, value } = textarea
		const selectedText = value.substring(selectionStart, selectionEnd)

		// Ctrl/Cmd + B: 加粗切换
		if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
			e.preventDefault()
			const before = value.substring(0, selectionStart)
			const after = value.substring(selectionEnd)

			// 检测光标前后是否已有 ** 标记，且当前有选中文本时视为已加粗
			const isBold = before.endsWith('**') && after.startsWith('**')

			if (isBold && selectedText) {
				// 取消加粗：先扩大选区包含前后的 ** 标记，再用原文本替换
				textarea.setSelectionRange(selectionStart - 2, selectionEnd + 2)
				insertText(selectedText)
			} else {
				// 添加加粗：用 ** 包裹选中的文本或默认文字
				const text = selectedText || defaultText
				insertText(`**${text}**`)
				// 如果没有选中文本，则在插入后自动选中 defaultText 部分，方便用户直接修改
				if (!selectedText) {
					setTimeout(() => {
						textarea.setSelectionRange(selectionStart + 2, selectionStart + 2 + defaultText.length)
					}, 0)
				}
			}
			return
		}

		// Ctrl/Cmd + I: 斜体切换
		if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
			e.preventDefault()
			const before = value.substring(0, selectionStart)
			const after = value.substring(selectionEnd)

			// 检测斜体：前后各有一个 *，但要排除加粗的情况（前后是 **）
			const isItalic = before.endsWith('*') && after.startsWith('*') && !(before.endsWith('**') && after.startsWith('**'))

			if (isItalic && selectedText) {
				// 取消斜体：选区前后各扩大1个字符，替换为原文本
				textarea.setSelectionRange(selectionStart - 1, selectionEnd + 1)
				insertText(selectedText)
			} else {
				// 添加斜体
				const text = selectedText || defaultText
				insertText(`*${text}*`)
				if (!selectedText) {
					setTimeout(() => {
						textarea.setSelectionRange(selectionStart + 1, selectionStart + 1 + defaultText.length)
					}, 0)
				}
			}
			return
		}

		// Ctrl/Cmd + K: 插入链接
		if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
			e.preventDefault()
			const text = selectedText || defaultText
			insertText(`[${text}](url)`)
			// 插入后自动选中 "url" 部分，方便用户直接粘贴链接
			setTimeout(() => {
				const urlStart = selectionStart + text.length + 3 // 3 是 "[", "]", "(" 三个字符的长度
				textarea.setSelectionRange(urlStart, urlStart + 3)
			}, 0)
			return
		}

		// Tab: 缩进（插入一个制表符）
		if (e.key === 'Tab' && !e.shiftKey) {
			e.preventDefault()
			insertText('\t')
			return
		}

		// Shift + Tab: 取消缩进（删除行首的一个制表符或两个空格）
		if (e.key === 'Tab' && e.shiftKey) {
			e.preventDefault()
			const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
			const line = value.substring(lineStart, value.indexOf('\n', selectionStart))

			if (line.startsWith('\t')) {
				// 删除一个制表符
				textarea.setSelectionRange(lineStart, lineStart + 1)
				insertText('')
			} else if (line.startsWith('  ')) {
				// 删除两个空格
				textarea.setSelectionRange(lineStart, lineStart + 2)
				insertText('')
			}
			return
		}
	}

	/**
	 * 处理粘贴事件：如果剪贴板包含图片文件，则上传图片并自动插入对应的 Markdown 图片语法
	 */
	const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
		const items = e.clipboardData.items
		if (!items) return

		// 收集所有粘贴的图片文件
		const imageFiles: File[] = []
		for (let i = 0; i < items.length; i++) {
			const item = items[i]
			if (item.type.startsWith('image/')) {
				const file = item.getAsFile()
				if (file) {
					imageFiles.push(file)
				}
			}
		}

		// 存在图片文件时阻止默认粘贴行为，改为上传处理
		if (imageFiles.length > 0) {
			e.preventDefault()

			// 调用 store 的 addFiles 方法上传图片，返回处理后的结果（包含 id 或 url）
			const resultImages = await addFiles(imageFiles).catch(() => [])

			if (resultImages && resultImages.length > 0) {
				// 为每张图片生成对应的 Markdown 语法：网络图片使用 ![](url)，本地图片使用自定义协议
				const markdowns = resultImages
					.map(item =>
						item.type === 'url' ? `![](${item.url})` : `![](local-image:${item.id})`
					)
					.join('\n')
				// 将生成的 Markdown 插入到当前光标位置
				insertText(markdowns)
			}
		}
	}

	return (
		// 动画容器：带淡入和缩放入场效果
		<motion.div
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ delay: INIT_DELAY }}
			className='bg-card flex min-h-[800px] w-[800px] flex-col rounded-[40px] border p-6 shadow'
		>
			{/* 标题和别名输入行 */}
			<div className='mb-3 flex gap-3'>
				<input
					type='text'
					placeholder='标题'
					className='bg-card flex-1 rounded-lg border px-3 py-2 text-sm'
					value={form.title}
					onChange={e => updateForm({ title: e.target.value })}
				/>
				<input
					type='text'
					placeholder='slug（xx-xx）'
					className='bg-card w-[200px] rounded-lg border px-3 py-2 text-sm'
					value={form.slug}
					onChange={e => updateForm({ slug: e.target.value })}
				/>
			</div>
			{/* Markdown 编辑核心区域 */}
			<textarea
				ref={textareaRef}
				placeholder='Markdown 内容'
				className='bg-card h-[650px] w-full flex-1 resize-none rounded-xl border p-4 text-sm'
				value={form.md}
				// 用户手动输入时更新 store 中的 md 字段
				onChange={e => updateForm({ md: e.target.value })}
				// 绑定快捷键处理
				onKeyDown={handleKeyDown}
				// 绑定粘贴图片处理
				onPaste={handlePaste}
			/>
		</motion.div>
	)
}