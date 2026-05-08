'use client'

// 从 motion/react 库导入 motion 组件，用于实现高性能动画
import { motion } from 'motion/react'
// 从项目常量文件中导入初始动画延迟时间
import { INIT_DELAY } from '@/consts'

/**
 * WIP (Work In Progress) 组件
 * 用于展示“开发中”的提示页面，包含动画效果
 */
export default function WIP() {
	return (
		// 外层容器：弹性布局，垂直排列，内容居中，设置水平内边距、顶部和底部间距
		<div className='flex flex-col items-center justify-center px-6 pt-32 pb-12'>
			{/* 内容最大宽度限制为600px，保证在大屏幕上不会过宽 */}
			<div className='w-full max-w-[600px]'>
				{/* 使用 motion.div 实现进场动画：从透明且缩放0.9过渡到完全显示并缩放为1 */}
				<motion.div
					initial={{ opacity: 0, scale: 0.9 }} // 初始状态：透明，缩小到90%
					animate={{ opacity: 1, scale: 1 }} // 动画结束状态：完全显示，原始大小
					transition={{ delay: INIT_DELAY }} // 动画延迟启动时间，由全局常量控制
					className='card relative flex flex-col items-center gap-6 p-12 text-center'>
					{/* 施工标志图标 */}
					<div className='text-6xl'>🚧</div>
					{/* 主标题 */}
					<h1 className='text-3xl font-bold'>开发中</h1>
					{/* 描述文本，使用次要文本颜色，较大字号，舒适行高 */}
					<p className='text-secondary text-lg leading-relaxed'>这个功能正在努力开发中，敬请期待！</p>
					{/* 三个小圆点组成的加载动画 */}
					<div className='mt-4 flex gap-2'>
						<div 
							className='h-2 w-2 animate-bounce rounded-full bg-black/20' 
							style={{ animationDelay: '0ms' }} // 第一个圆点无延迟
						></div>
						<div 
							className='h-2 w-2 animate-bounce rounded-full bg-black/20' 
							style={{ animationDelay: '150ms' }} // 第二个圆点延迟150毫秒
						></div>
						<div 
							className='h-2 w-2 animate-bounce rounded-full bg-black/20' 
							style={{ animationDelay: '300ms' }} // 第三个圆点延迟300毫秒，形成连续跳动
						></div>
					</div>
				</motion.div>
			</div>
		</div>
	)
}
