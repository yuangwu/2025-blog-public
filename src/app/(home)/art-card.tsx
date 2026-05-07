// 引入自定义卡片容器组件，用于统一卡片的样式和布局
import Card from '@/components/card'
// 获取中心点坐标的 store，用于计算卡片的绝对位置
import { useCenterStore } from '@/hooks/use-center'
// 获取最新一篇博客的 hook，返回 blog 数据和 loading 状态
import { useLatestBlog } from '@/hooks/use-blog-index'
// 全局配置 store，包含卡片样式配置、站点内容开关（如圣诞节特效）等
import { useConfigStore } from './stores/config-store'
// 卡片之间的默认间距常量
import { CARD_SPACING } from '@/consts'
// 日期处理库
import dayjs from 'dayjs'
// Next.js 的 Link 组件，用于客户端导航
import Link from 'next/link'
// 可拖拽容器组件，包裹卡片使其可被用户拖动并持久化位置
import { HomeDraggableLayer } from './home-draggable-layer'

// 默认导出：首页“最新文章”卡片组件
export default function ArticleCard() {
	// 获取当前中心参考点的坐标（通常是屏幕中心或其他锚点）
	const center = useCenterStore()
	// 从配置 store 中获取所有卡片的样式配置，以及站点内容开关
	const { cardStyles, siteContent } = useConfigStore()
	// 获取最新博客数据和加载状态
	const { blog, loading } = useLatestBlog()
	// 以下为各个卡片预设的样式数据（宽高、偏移量、层级等）
	const styles = cardStyles.articleCard       // 本卡片样式
	const hiCardStyles = cardStyles.hiCard     // 用于相对位置计算的“Hi”卡片样式
	const socialButtonsStyles = cardStyles.socialButtons // 社交按钮卡片样式

	// 计算卡片的 x 坐标：
	// 如果配置中指定了固定偏移量 offsetX，则直接用中心点加偏移；
	// 否则自动计算：居中在该卡片应当出现的位置（Hi卡片的右下方），
	// 公式：中心点.x + Hi卡片宽度的一半 - 社交按钮卡片宽度 - 间距 - 本卡片宽度的一半（这里用全宽是让其左对齐？注意这里直接减了 styles.width，
	// 实际效果是让文章卡片的右边缘与 Hi 卡片右边缘保持一定间距，但原逻辑可能为实现特定的布局排列。）
	const x = styles.offsetX !== null 
		? center.x + styles.offsetX 
		: center.x + hiCardStyles.width / 2 - socialButtonsStyles.width - CARD_SPACING - styles.width

	// 计算 y 坐标：
	// 如果指定了 offsetY，则 center.y + offsetY；
	// 否则放在 Hi卡片的下方，距 Hi 卡片底部一个 CARD_SPACING 的距离。
	const y = styles.offsetY !== null 
		? center.y + styles.offsetY 
		: center.y + hiCardStyles.height / 2 + CARD_SPACING

	// 返回 JSX 结构
	return (
		// 外层使用 HomeDraggableLayer，让整个卡片可以被拖拽，
		// cardKey 用于标识并记录位置，x、y 为初始或计算后的坐标，
		// width/height 为卡片尺寸，用于边界判断等。
		<HomeDraggableLayer cardKey='articleCard' x={x} y={y} width={styles.width} height={styles.height}>
			{/* Card 组件提供统一的视觉样式，比如背景、阴影、圆角等，并应用 order 层级 */}
			<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y} className='space-y-2 max-sm:static'>
				{/* 如果站点启用了圣诞节装饰，则在卡片左上角展示一个装饰图片 */}
				{siteContent.enableChristmas && (
					<>
						<img
							src='/images/christmas/snow-9.webp'
							alt='Christmas decoration'
							className='pointer-events-none absolute'
							style={{ width: 140, left: -12, top: -16, opacity: 0.8 }}
						/>
					</>
				)}

				{/* 卡片标题 */}
				<h2 className='text-secondary text-sm'>最新文章</h2>

				{/* 根据加载状态和博客数据展示不同内容 */}
				{loading ? (
					// 加载中显示提示文字
					<div className='flex h-[60px] items-center justify-center'>
						<span className='text-secondary text-xs'>加载中...</span>
					</div>
				) : blog ? (
					// 存在博客时，整个区域为可点击的 Link，跳转到文章详情页
					<Link href={`/blog/${blog.slug}`} className='flex transition-opacity hover:opacity-80'>
						{/* 如果有封面图，则显示；否则显示一个占位符（加号方框） */}
						{blog.cover ? (
							<img src={blog.cover} alt='cover' className='mr-3 h-12 w-12 shrink-0 rounded-xl border object-cover' />
						) : (
							<div className='text-secondary mr-3 grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/60'>+</div>
						)}
						{/* 右侧的文字区域 */}
						<div className='flex-1'>
							{/* 标题，超长则截断显示一行 */}
							<h3 className='line-clamp-1 text-sm font-medium'>{blog.title || blog.slug}</h3>
							{/* 如果存在文章摘要，则最多显示三行 */}
							{blog.summary && <p className='text-secondary mt-1 line-clamp-3 text-xs'>{blog.summary}</p>}
							{/* 发布日期，使用 dayjs 格式化 */}
							<p className='text-secondary mt-3 text-xs'>{dayjs(blog.date).format('YYYY/M/D')}</p>
						</div>
					</Link>
				) : (
					// 没有博客且加载完毕时，显示空状态
					<div className='flex h-[60px] items-center justify-center'>
						<span className='text-secondary text-xs'>暂无文章</span>
					</div>
				)}
			</Card>
		</HomeDraggableLayer>
	)
}