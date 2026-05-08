// 标记该组件为客户端组件（Next.js 13+ App Router 语法）
// 表示该组件会在浏览器端执行，可使用 useState、useEffect 等 React 客户端特性
'use client'

// 从配置存储中导入 SiteContent 类型定义，用于规范表单数据结构
import type { SiteContent } from '../../stores/config-store'

// 定义组件 Props 的 TypeScript 接口
interface BeianFormProps {
	// 表单数据，类型为 SiteContent
	formData: SiteContent
	// 用于更新表单数据的状态设置函数
	setFormData: React.Dispatch<React.SetStateAction<SiteContent>>
}

// 导出备案信息表单组件
export function BeianForm({ formData, setFormData }: BeianFormProps) {
	return (
		// 容器 div，设置子元素垂直间距为 2
		<div className='space-y-2'>
			{/* 表单标题标签 */}
			<label className='mb-2 block text-sm font-medium'>备案信息</label>
			
			{/* 网格布局容器，2 列布局，列间距为 2 */}
			<div className='grid grid-cols-2 gap-2'>
				
				{/* 左侧：备案号输入框 */}
				<div>
					{/* 输入框标签 */}
					<label className='mb-1 block text-xs text-gray-600'>备案号</label>
					{/* 文本输入框 */}
					<input
						type='text'
						// 绑定表单数据中的备案号文本，若不存在则为空字符串
						value={formData.beian?.text || ''}
						// 输入变化时的处理函数
						onChange={e => setFormData({
							// 展开原有表单数据
							...formData,
							// 更新备案信息
							beian: {
								// 展开原有的备案信息（若不存在则初始化 text 和 link 为空字符串）
								...(formData.beian || { text: '', link: '' }),
								// 更新备案号文本为输入框当前值
								text: e.target.value
							}
						})}
						// 输入框占位提示文本
						placeholder='例如：京ICP备12345678号'
						// 输入框样式类
						className='bg-secondary/10 w-full rounded-lg border px-4 py-2 text-sm'
					/>
				</div>

				{/* 右侧：备案链接输入框（可选） */}
				<div>
					{/* 输入框标签 */}
					<label className='mb-1 block text-xs text-gray-600'>备案链接（可选）</label>
					{/* URL 类型输入框 */}
					<input
						type='url'
						// 绑定表单数据中的备案链接，若不存在则为空字符串
						value={formData.beian?.link || ''}
						// 输入变化时的处理函数
						onChange={e => setFormData({
							// 展开原有表单数据
							...formData,
							// 更新备案信息
							beian: {
								// 展开原有的备案信息（若不存在则初始化 text 和 link 为空字符串）
								...(formData.beian || { text: '', link: '' }),
								// 更新备案链接为输入框当前值
								link: e.target.value
							}
						})}
						// 输入框占位提示文本（工信部备案查询官网）
						placeholder='https://beian.miit.gov.cn/'
						// 输入框样式类
						className='bg-secondary/10 w-full rounded-lg border px-4 py-2 text-sm'
					/>
				</div>
			</div>
		</div>
	)
}