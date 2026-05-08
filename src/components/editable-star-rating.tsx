'use client'

// 导入工具函数 cn，通常用于条件性地合并 CSS 类名
import { cn } from '@/lib/utils'

// 定义组件的 props 接口
interface EditableStarRatingProps {
	stars: number // 当前评星数（1～5）
	editable?: boolean // 是否允许用户点击修改评星
	onChange?: (stars: number) => void // 当用户点击星星时触发的回调，返回所选星级
}

// 可编辑的星级评分组件
// 默认不可编辑，避免未传入 editable 时出现非预期交互
export default function EditableStarRating({ stars, editable = false, onChange }: EditableStarRatingProps) {
	// 处理点击星星的事件
	// 只在可编辑状态并且传入了 onChange 回调时才触发
	const handleClick = (index: number) => {
		if (editable && onChange) {
			onChange(index)
		}
	}

	return (
		// 使用 flex 布局水平排列星星，间距 0.5（2px）
		<div className='flex items-center gap-0.5'>
			{[1, 2, 3, 4, 5].map(index => {
				// 判断当前星星是否应被点亮：index 小于等于当前星级时点亮
				const filled = index <= stars
				return (
					<div
						key={index}
						onClick={() => handleClick(index)}
						// 仅在可编辑状态下显示手型指针，提示可点击
						className={cn(editable && 'cursor-pointer')}
					>
						{/* 渲染单个星星图标，filled 控制填充颜色 */}
						<StarIcon filled={filled} />
					</div>
				)
			})}
		</div>
	)
}

// 星星图标组件
// filled 为 true 时显示黄色填充，否则显示灰色填充
function StarIcon({ filled }: { filled: boolean }) {
	return (
		<svg width='16' height='16' viewBox='0 0 24 24' className={cn(filled ? 'fill-yellow-400' : 'fill-gray-300')}>
			<path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' />
		</svg>
	)
}
