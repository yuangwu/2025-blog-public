// 导入 motion 动画组件，用于添加入场动画
import { motion } from 'motion/react'
// 导入 zustand 写文章状态管理 store，管理标题、slug 及 md 内容等
import { useWriteStore } from '../stores/write-store'
// 导入动画延迟常量，统一控制动画开始时间
import { INIT_DELAY } from '@/consts'
import { useRef } from 'react'

// 默认占位文本，当没有选中内容时用于快捷键插入的示例文字
const defaultText = 'text'

/**
 * WriteEditor 组件
 * 富文本编辑器（Markdown 编辑器），支持快捷键插入格式、缩进、粘贴图片等功能
 * 通过 zustand store 与外部状态同步
 */
export function WriteEditor() {
	// 从 store 获取表单数据、更新方法、图片列表和添加文件方法
	// 注意：images 当前未在组件中使用，可能为后续功能预留
	const { form, updateForm, images, addFiles } = useWriteStore()
	// textarea 引用，用于直接操作 DOM（光标、插入文本等）
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	/**
	 * 在当前光标位置插入文本，并保留撤销/重做记录
	 * 优先使用 execCommand，不支持时回退到手动拼接文本
	 */
	const insertText = (text: string) => {
		const textarea = textareaRef.current
		if (!textarea) return

		textarea.focus()
		// 尝试使用传统 execCommand 插入，这样可以在撤销栈中记录
		const success = document.execCommand('insertText', false, text)

		// 如果浏览器不支持 execCommand（如旧版浏览器），手动实现插入
		if (!success) {
			// 获取当前选区信息
			const { selectionStart, selectionEnd, value } = textarea
			// 将文本分成选区前、选区后两部分
			const before = value.substring(0, selectionStart)
			const after = value.substring(selectionEnd)
			// 更新 store 中的 md 内容，用新文本替换选中部分
			updateForm({ md: before + text + after })
			// 重置光标位置到插入文本之后
			setTimeout(() => {
				textarea.setSelectionRange(selectionStart + text.length, selectionStart + text.length)
				textarea.focus()
			}, 0)
		}
	}

	/**
	 * 键盘事件处理
	 * 实现常见的 Markdown 快捷键：
	 * Ctrl/Cmd + B → 加粗
	 * Ctrl/Cmd + I → 斜体
	 * Ctrl/Cmd + K → 插入链接
	 * Tab / Shift+Tab → 缩进/取消缩进
	 */
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		const textarea = textareaRef.current
		if (!textarea) return

		// 当前选中的文本与光标位置
		const { selectionStart, selectionEnd, value } = textarea
		const selectedText = value.substring(selectionStart, selectionEnd)

		// 1. 加粗快捷键 Ctrl/Cmd + B
		if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
			e.preventDefault()
			const before = value.substring(0, selectionStart)
			const after = value.substring(selectionEnd)
			// 检查光标前后是否已有 ** 标记（即文本是否已加粗）
			const isBold = before.endsWith('**') && after.startsWith('**')

			if (isBold && selectedText) {
				// 已加粗且有选中文本 → 移除加粗，同时选中原标记区域以便替换
				textarea.setSelectionRange(selectionStart - 2, selectionEnd + 2)
				insertText(selectedText) // 替换为去除 ** 的内容
			} else {
				// 未加粗 → 添加加粗标记
				const text = selectedText || defaultText
				insertText(`**${text}**`)
				// 如果没有选中文本，用默认词替换后，选中默认词以便直接修改
				if (!selectedText) {
					setTimeout(() => {
						textarea.setSelectionRange(selectionStart + 2, selectionStart + 2 + defaultText.length)
					}, 0)
				}
			}
			return
		}

		// 2. 斜体快捷键 Ctrl/Cmd + I
		if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
			e.preventDefault()
			const before = value.substring(0, selectionStart)
			const after = value.substring(selectionEnd)
			// 检查是否已斜体（注意排除 ** 粗体标记的干扰）
			const isItalic =
				before.endsWith('*') && after.startsWith('*') && !(before.endsWith('**') && after.startsWith('**'))

			if (isItalic && selectedText) {
				// 取消斜体，选中包含 * 标记的区域并替换为纯文本
				textarea.setSelectionRange(selectionStart - 1, selectionEnd + 1)
				insertText(selectedText)
			} else {
				// 添加斜体
				const text = selectedText || defaultText
				insertText(`*${text}*`)
				if (!selectedText) {
					// 没有选中则插入默认词并自动选中它
					setTimeout(() => {
						textarea.setSelectionRange(selectionStart + 1, selectionStart + 1 + defaultText.length)
					}, 0)
				}
			}
			return
		}

		// 3. 插入链接 Ctrl/Cmd + K
		if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
			e.preventDefault()
			const text = selectedText || defaultText
			// 插入 [文本](url) 格式，url 部分占位
			insertText(`[${text}](url)`)
			// 插入后自动选中 "url" 部分，方便用户直接输入链接
			setTimeout(() => {
				const urlStart = selectionStart + text.length + 3 // [文本]( 后的位置
				textarea.setSelectionRange(urlStart, urlStart + 3)
			}, 0)
			return
		}

		// 4. Tab 缩进（插入制表符）
		if (e.key === 'Tab' && !e.shiftKey) {
			e.preventDefault()
			insertText('\t')
			return
		}

		// 5. Shift+Tab 取消缩进（移除行首一个制表符或两个空格）
		if (e.key === 'Tab' && e.shiftKey) {
			e.preventDefault()
			// 找到当前行开始位置
			const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
			// 获取当前行内容
			const line = value.substring(lineStart, value.indexOf('\n', selectionStart))

			// 如果行首是制表符，移除一个 \t
			if (line.startsWith('\t')) {
				textarea.setSelectionRange(lineStart, lineStart + 1)
				insertText('') // 删除选中内容（即那个 \t）
			} else if (line.startsWith('  ')) {
				// 如果行首是两个空格，移除这两个空格
				textarea.setSelectionRange(lineStart, lineStart + 2)
				insertText('')
			}
			return
		}
	}

	/**
	 * 粘贴事件处理
	 * 如果剪贴板包含图片，则通过 addFiles 处理并插入 Markdown 图片语法
	 * 普通文本粘贴由 textarea 默认行为处理
	 */
	const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
		const items = e.clipboardData.items
		if (!items) return

		// 收集所有图片文件
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

		// 如果有图片，阻止默认粘贴，改为自定义处理
		if (imageFiles.length > 0) {
			e.preventDefault()

			// 调用 store 方法上传/处理图片，失败时返回空数组
			const resultImages = await addFiles(imageFiles).catch(() => [])

			// 成功获得处理后的图片信息，生成 Markdown
			if (resultImages && resultImages.length > 0) {
				const markdowns = resultImages
					.map(item =>
						item.type === 'url' 
							? `![](${item.url})` 
							: `![](local-image:${item.id})`
					)
					.join('\n')
				insertText(markdowns)
			}
		}
	}

	return (
		// 添加入场动画：透明度从 0 到 1，同时缩放从 0.8 到 1
		<motion.div
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ delay: INIT_DELAY }}
			className='bg-card flex min-h-[800px] w-[800px] flex-col rounded-[40px] border p-6 shadow'
		>
			{/* 标题和 slug 输入行 */}
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
			
			{/* Markdown 正文编辑区 */}
			<textarea
				ref={textareaRef}
				placeholder='Markdown 内容'
				className='bg-card h-[650px] w-full flex-1 resize-none rounded-xl border p-4 text-sm'
				value={form.md}
				onChange={e => updateForm({ md: e.target.value })}
				onKeyDown={handleKeyDown}
				onPaste={handlePaste}
			/>
		</motion.div>
	)
}
