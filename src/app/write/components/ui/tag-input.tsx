import { useState } from 'react'

// 定义 TagInput 组件接收的 props 类型
type TagInputProps = {
	tags: string[] // 当前标签列表
	onChange: (tags: string[]) => void // 标签列表变化时的回调函数
}

/**
 * 标签输入组件
 * 支持显示已有标签、按回车添加新标签、点击叉号删除标签
 */
export function TagInput({ tags, onChange }: TagInputProps) {
	// 输入框内的文本状态
	const [tagInput, setTagInput] = useState<string>('')

	// 处理添加标签：非空且不重复时，将新标签加入列表，并清空输入框
	const handleAddTag = () => {
		if (tagInput.trim() && !tags.includes(tagInput.trim())) {
			onChange([...tags, tagInput.trim()])
			setTagInput('')
		}
	}

	// 处理删除标签：根据索引过滤掉对应标签
	const handleRemoveTag = (index: number) => {
		onChange(tags.filter((_, i) => i !== index))
	}

	return (
		<div className='bg-card w-full rounded-lg border px-3 py-2'>
			{/* 当标签列表不为空时，展示标签区域 */}
			{tags.length > 0 && (
				<div className='mb-2 flex flex-wrap gap-2'>
					{tags.map((tag, index) => (
						<span
							key={index} // 使用 index 作为 key，确保稳定（标签顺序不会随意变动）
							className='flex items-center gap-1.5 rounded-md bg-blue-100 px-2 py-1 text-sm text-blue-700'
						>
							#{tag}
							{/* 删除按钮，点击时调用 handleRemoveTag 删除对应标签 */}
							<button
								type='button'
								onClick={() => handleRemoveTag(index)}
								className='text-secondary'
							>
								×
							</button>
						</span>
					))}
				</div>
			)}

			{/* 标签输入框：按回车键添加标签 */}
			<input
				type='text'
				placeholder='添加标签（按回车）'
				className='w-full bg-transparent text-sm outline-none'
				value={tagInput}
				onChange={e => setTagInput(e.target.value)} // 受控组件，更新输入值
				onKeyDown={e => {
					if (e.key === 'Enter') {
						e.preventDefault() // 阻止回车默认提交表单行为
						handleAddTag()      // 执行添加标签逻辑
					}
				}}
			/>
		</div>
	)
}
