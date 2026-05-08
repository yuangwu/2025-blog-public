'use client'
// 标记这是一个 React 客户端组件（Next.js 13+ App Router 语法）

// 导入类型定义：SiteContent 是全局状态的类型结构
import type { SiteContent } from '../../stores/config-store'

// 定义组件 Props 的类型接口
interface HatSectionProps {
	formData: SiteContent // 当前表单数据（包含帽子索引、翻转状态等）
	setFormData: React.Dispatch<React.SetStateAction<SiteContent>> // 更新表单数据的状态函数
}

// 导出 HatSection 组件
export function HatSection({ formData, setFormData }: HatSectionProps) {
	// 获取当前选中的帽子索引，默认值为 1
	const currentHatIndex = formData.currentHatIndex ?? 1
	// 帽子总数：24 顶
	const hatCount = 24

	// 处理帽子索引切换的函数
	const handleSetHatIndex = (index: number) => {
		// 使用函数式更新状态，保留之前的所有数据，只更新 currentHatIndex
		setFormData(prev => ({
			...prev,
			currentHatIndex: index
		}))
	}

	return (
		<div>
			{/* 帽子图片选择区域的标题 */}
			<label className='mb-2 block text-sm font-medium'>帽子图片</label>
			
			{/* 帽子网格布局：默认 6 列，小屏幕（max-sm）4 列，间距 3 */}
			<div className='grid grid-cols-6 gap-3 max-sm:grid-cols-4'>
				{/* 生成 1 到 hatCount（24）的数组并遍历 */}
				{Array.from({ length: hatCount }, (_, i) => i + 1).map(index => {
					// 判断当前帽子是否被选中
					const isActive = currentHatIndex === index

					return (
						<div key={index} className='relative'>
							{/* 帽子选择按钮 */}
							<button
								type='button'
								onClick={() => handleSetHatIndex(index)} // 点击时切换到该索引
								// 动态类名：选中时显示品牌色边框和阴影，未选中时悬停显示半透明品牌色边框
								className={`block w-full overflow-hidden rounded-xl border bg-white/60 transition-all ${
									isActive ? 'ring-brand shadow-md ring-2' : 'hover:border-brand/60'
								}`}>
								{/* 帽子图片：路径为 /images/hats/{index}.webp */}
								<img src={`/images/hats/${index}.webp`} alt={`hat ${index}`} className='h-20 w-full object-contain' />
							</button>
							
							{/* 如果是当前选中的帽子，显示“当前使用”标签 */}
							{isActive && (
								<span className='bg-brand pointer-events-none absolute top-1 left-1 rounded-full px-2 py-0.5 text-[10px] text-white shadow'>当前使用</span>
							)}
						</div>
					)
				})}
			</div>

			{/* 左右翻转复选框区域 */}
			<div className='mt-3'>
				<label className='flex items-center gap-2'>
					{/* 复选框：绑定 formData.hatFlipped，默认 false */}
					<input
						type='checkbox'
						checked={formData.hatFlipped ?? false}
						onChange={e => setFormData({ ...formData, hatFlipped: e.target.checked })} // 切换翻转状态
						className='accent-brand h-4 w-4 rounded'
					/>
					{/* 复选框文字 */}
					<span className='text-sm font-medium'>左右翻转</span>
				</label>
			</div>
		</div>
	)
}
