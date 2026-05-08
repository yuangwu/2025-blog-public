'use client' // 启用客户端组件模式（Next.js 13+ 必需，确保在 Vercel 上正确运行）

// 确保以下路径存在：src/stores/config-store.ts 或相应位置，并正确导出 SiteContent 类型
// 若缺少该类型定义，Vercel 构建时将因 TypeScript 检查失败而报错
import type { SiteContent } from '../../stores/config-store'

// 组件 Props 类型定义
interface HatSectionProps {
	formData: SiteContent // 全局配置数据，必须包含 currentHatIndex、hatFlipped 等字段
	setFormData: React.Dispatch<React.SetStateAction<SiteContent>> // 更新配置数据的函数
}

// 帽子选择组件：允许用户从 24 种帽子中选择，并支持左右翻转
export function HatSection({ formData, setFormData }: HatSectionProps) {
	// 当前选中的帽子索引，默认值为 1（若未定义或为空）
	const currentHatIndex = formData.currentHatIndex ?? 1
	// 帽子总数（必须确保 public/images/hats/ 目录下存在 1.webp 到 24.webp 的图片资源）
	const hatCount = 24

	// 安全更新帽子索引（使用函数式更新避免状态覆盖）
	const handleSetHatIndex = (index: number) => {
		setFormData(prev => ({
			...prev,
			currentHatIndex: index
		}))
	}

	return (
		<div>
			{/* 标签：帽子图片选择器 */}
			<label className='mb-2 block text-sm font-medium'>帽子图片</label>
			{/* 网格布局：默认 6 列，移动端 4 列 */}
			<div className='grid grid-cols-6 gap-3 max-sm:grid-cols-4'>
				{/* 动态生成 1 到 hatCount 的帽子按钮 */}
				{Array.from({ length: hatCount }, (_, i) => i + 1).map(index => {
					const isActive = currentHatIndex === index

					return (
						<div key={index} className='relative'>
							<button
								type='button'
								onClick={() => handleSetHatIndex(index)}
								className={`block w-full overflow-hidden rounded-xl border bg-white/60 transition-all ${
									isActive ? 'ring-brand shadow-md ring-2' : 'hover:border-brand/60'
								}`}>
								{/* 图片路径：必须保证 public/images/hats/ 目录下存在对应 .webp 文件 */}
								{/* 若图片缺失，不会导致构建失败，但运行时会出现加载错误 */}
								<img src={`/images/hats/${index}.webp`} alt={`hat ${index}`} className='h-20 w-full object-contain' />
							</button>
							{/* 当前使用标记（仅选中项显示） */}
							{isActive && (
								<span className='bg-brand pointer-events-none absolute top-1 left-1 rounded-full px-2 py-0.5 text-[10px] text-white shadow'>当前使用</span>
							)}
						</div>
					)
				})}
			</div>
			{/* 翻转复选框 */}
			<div className='mt-3'>
				<label className='flex items-center gap-2'>
					<input
						type='checkbox'
						checked={formData.hatFlipped ?? false} // 确保未定义时仍为 false
						onChange={e => setFormData({ ...formData, hatFlipped: e.target.checked })} // 浅拷贝更新，保留其他字段
						className='accent-brand h-4 w-4 rounded' // accent-brand 需在 Tailwind 配置中定义，若无则样式失效但构建不受影响
					/>
					<span className='text-sm font-medium'>左右翻转</span>
				</label>
			</div>
		</div>
	)
}
