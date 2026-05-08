// 从 react 库中导入 useState 钩子，用于管理组件内部状态
import { useState } from 'react'

// 定义组件的 Props 类型
type TagInputProps = {
	// 当前已有的标签数组，由父组件控制
	tags: string[]
	// 当标签发生变化时的回调函数，接收新的标签数组
	onChange: (tags: string[]) => void
}

// 导出 TagInput 组件，接收 tags 和 onChange 作为 props
export function TagInput({ tags, onChange }: TagInputProps) {
	// 管理输入框中的临时文本内容
	const [tagInput, setTagInput] = useState<string>('')

	// 处理添加标签的逻辑
	const handleAddTag = () => {
		// 去除首尾空格，并确保不添加空标签、不重复添加已存在的标签
		if (tagInput.trim() && !tags.includes(tagInput.trim())) {
			// 调用父组件的 onChange，将新标签追加到现有标签数组的末尾
			onChange([...tags, tagInput.trim()])
			// 清空输入框
			setTagInput('')
		}
	}

	// 处理移除标签的逻辑，接收要移除的标签在数组中的索引
	const handleRemoveTag = (index: number) => {
		// 过滤掉对应索引的标签，生成新数组并传给父组件
		onChange(tags.filter((_, i) => i !== index))
	}

	// 渲染组件 UI
	return (
		<div className='bg-card w-full rounded-lg border px-3 py-2'>
			{/* 只有当已有标签数量大于 0 时，才渲染标签展示区域 */}
			{tags.length > 0 && (
				<div className='mb-2 flex flex-wrap gap-2'>
					{/* 遍历 tags 数组，渲染每一个标签 */}
					{tags.map((tag, index) => (
						<span
							key={index}
							className='flex items-center gap-1.5 rounded-md bg-blue-100 px-2 py-1 text-sm text-blue-700'
						>
							{/* 显示标签文本，前面加 # 号 */}
							#{tag}
							{/* 删除按钮，点击时调用 handleRemoveTag 并传入当前索引 */}
							<button
								type='button' // 明确指定为普通按钮，避免在表单内触发表单提交
								onClick={() => handleRemoveTag(index)}
								className='text-secondary'
							>
								×
							</button>
						</span>
					))}
				</div>
			)}
			{/* 标签输入框 */}
			<input
				type='text'
				// 占位提示文字，告诉用户按回车键添加标签
				placeholder='添加标签（按回车）'
				className='w-full bg-transparent text-sm outline-none'
				// 输入框值绑定到 tagInput 状态
				value={tagInput}
				// 输入内容变化时更新 tagInput 状态
				onChange={e => setTagInput(e.target.value)}
				// 监听键盘按下事件
				onKeyDown={e => {
					// 如果按下的是回车键
					if (e.key === 'Enter') {
						// 阻止默认行为，避免触发表单提交等
						e.preventDefault()
						// 执行添加标签操作
						handleAddTag()
					}
				}}
			/>
		</div>
	)
}