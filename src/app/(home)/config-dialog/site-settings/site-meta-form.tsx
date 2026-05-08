// 🔧 Next.js 13+ App Router 指令：标记此组件为「客户端组件」
// （必须放在文件第一行，用于启用 useState、useEffect 等 React 客户端特性）
'use client'

// 📦 类型导入：从全局状态管理文件中导入「站点内容」的 TypeScript 类型定义
import type { SiteContent } from '../../stores/config-store'

// 📝 定义组件 Props 的 TypeScript 接口
interface SiteMetaFormProps {
	// formData：当前表单的状态数据，类型为 SiteContent
	formData: SiteContent
	// setFormData：更新 formData 状态的函数
	// React.Dispatch<React.SetStateAction<T>> 是 React useState setter 的标准类型
	setFormData: React.Dispatch<React.SetStateAction<SiteContent>>
}

// 🚀 导出组件：SiteMetaForm 是一个受控表单组件
export function SiteMetaForm({ formData, setFormData }: SiteMetaFormProps) {
	return (
		<> {/* React Fragment：用于包裹多个子元素而不额外生成 DOM 节点 */}
			
			{/* 🎨 使用 Tailwind CSS 实现网格布局：2列，间距为 2 */}
			<div className='grid grid-cols-2 gap-2'>
				
				{/* 表单项 1：站点标题 */}
				<div>
					{/* 标签：block 表示独占一行，mb-2 是底部间距 */}
					<label className='mb-2 block text-sm font-medium'>站点标题</label>
					<input
						type='text'
						// 📌 受控组件：值绑定到 formData.meta.title
						value={formData.meta.title}
						// 🔄 状态更新：使用展开运算符（...）保持其他数据不变，仅更新 title
						onChange={e => setFormData({ ...formData, meta: { ...formData.meta, title: e.target.value } })}
						// 🎨 Tailwind 样式：半透明背景、全宽、圆角、边框、内边距
						className='bg-secondary/10 w-full rounded-lg border px-4 py-2 text-sm'
					/>
				</div>

				{/* 表单项 2：用户名 */}
				<div>
					<label className='mb-2 block text-sm font-medium'>用户名</label>
					<input
						type='text'
						// 📌 受控组件：值绑定到 formData.meta.username，若为空则显示空字符串
						value={formData.meta.username || ''}
						// 🔄 状态更新：仅更新 username 字段
						onChange={e => setFormData({ ...formData, meta: { ...formData.meta, username: e.target.value } })}
						className='bg-secondary/10 w-full rounded-lg border px-4 py-2 text-sm'
					/>
				</div>
			</div>

			{/* 表单项 3：站点描述（多行文本框） */}
			<div>
				<label className='mb-2 block text-sm font-medium'>站点描述</label>
				<textarea
					// 📌 受控组件：值绑定到 formData.meta.description
					value={formData.meta.description}
					// 🔄 状态更新：仅更新 description 字段
					onChange={e => setFormData({ ...formData, meta: { ...formData.meta, description: e.target.value } })}
					rows={3} // 文本框默认显示 3 行高度
					className='bg-secondary/10 w-full rounded-lg border px-4 py-2 text-sm'
				/>
			</div>
		</>
	)
}