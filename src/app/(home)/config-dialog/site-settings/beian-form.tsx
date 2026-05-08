'use client'

// 从配置状态管理模块中导入 SiteContent 类型（仅用于类型检查）
import type { SiteContent } from '../../stores/config-store'

// 备案表单组件的属性接口定义
interface BeianFormProps {
	// 当前表单数据（包含备案信息等）
	formData: SiteContent
	// 用于更新父组件中表单状态的函数
	setFormData: React.Dispatch<React.SetStateAction<SiteContent>>
}

/**
 * 备案信息编辑表单组件
 * 允许用户输入 ICP 备案号和对应的链接（可选），
 * 并通过 setFormData 实时同步到父组件的表单状态中。
 */
export function BeianForm({ formData, setFormData }: BeianFormProps) {
	return (
		<div className='space-y-2'>
			{/* 表单区域标题 */}
			<label className='mb-2 block text-sm font-medium'>备案信息</label>
			<div className='grid grid-cols-2 gap-2'>
				{/* 备案号输入字段 */}
				<div>
					<label className='mb-1 block text-xs text-gray-600'>备案号</label>
					<input
						type='text'
						// 安全读取备案文本，不存在时显示空字符串
						value={formData.beian?.text || ''}
						onChange={e =>
							setFormData({
								...formData,
								beian: {
									// 如果 beian 不存在则提供默认结构，再更新 text 字段
									...(formData.beian || { text: '', link: '' }),
									text: e.target.value,
								},
							})
						}
						placeholder='例如：京ICP备12345678号'
						className='bg-secondary/10 w-full rounded-lg border px-4 py-2 text-sm'
					/>
				</div>
				{/* 备案链接输入字段（可选） */}
				<div>
					<label className='mb-1 block text-xs text-gray-600'>备案链接（可选）</label>
					<input
						type='url'
						// 安全读取备案链接，不存在时显示空字符串
						value={formData.beian?.link || ''}
						onChange={e =>
							setFormData({
								...formData,
								beian: {
									// 同理，更新 link 字段时也保证 beian 对象结构完整
									...(formData.beian || { text: '', link: '' }),
									link: e.target.value,
								},
							})
						}
						placeholder='https://beian.miit.gov.cn/'
						className='bg-secondary/10 w-full rounded-lg border px-4 py-2 text-sm'
					/>
				</div>
			</div>
		</div>
	)
}
