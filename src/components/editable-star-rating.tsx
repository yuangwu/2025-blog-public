'use client'
// ↑ Next.js 13+ 客户端组件声明，表明该组件在浏览器端运行（可使用事件、状态等）

import { cn } from '@/lib/utils'
// 引入工具函数 cn，通常用于合并/条件化 CSS 类名（类似 classnames 库）

// 组件的 Props 类型定义
interface EditableStarRatingProps {
	stars: number // 当前展示的星级数量（1~5）
	editable?: boolean // 是否允许用户点击修改，默认 false（只读）
	onChange?: (stars: number) => void // 当用户点击修改星级时的回调，传递新的星级
}

/**
 * 可交互的星级评分组件
 * 默认只读展示，开启 editable 后可通过点击进行评分
 */
export default function EditableStarRating({
	stars,
	editable = false,
	onChange,
}: EditableStarRatingProps) {
	/**
	 * 处理点击星星的事件
	 * @param index 被点击的星星对应的数字（1~5）
	 */
	const handleClick = (index: number) => {
		// 只有在可编辑且提供了回调函数时才执行
		if (editable && onChange) {
			onChange(index)
		}
	}

	return (
		<div className='flex items-center gap-0.5'> {/* 使用 flex 布局，星星之间有小间距 */}
			{/* 遍历 1 到 5，生成 5 颗星星 */}
			{[1, 2, 3, 4, 5].map(index => {
				// 判断当前星星是否应该被填充（点亮）
				const filled = index <= stars
				return (
					<div
						key={index}
						onClick={() => handleClick(index)} // 点击时调用处理函数
						// 当 editable 为 true 时增加手型光标样式，暗示可点击
						className={cn(editable && 'cursor-pointer')}
					>
						{/* 渲染单颗星星图标，传入是否填充的状态 */}
						<StarIcon filled={filled} />
					</div>
				)
			})}
		</div>
	)
}

/**
 * 单颗星星图标组件
 * @param filled 是否高亮填充（true 为黄色，false 为灰色）
 */
function StarIcon({ filled }: { filled: boolean }) {
	return (
		<svg
			width='16'
			height='16'
			viewBox='0 0 24 24' // SVG 视口坐标系
			// 根据 filled 动态切换填充颜色：填充为黄色，否则为灰色
			className={cn(filled ? 'fill-yellow-400' : 'fill-gray-300')}
		>
			{/* 五角星形状的路径 */}
			<path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' />
		</svg>
	)
}