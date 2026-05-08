// 导入卡片基础组件，用于承载日历内容的展示容器
import Card from '@/components/card'

// 引入中心点位置状态管理 hook，用于计算卡片放置的基准坐标
import { useCenterStore } from '@/hooks/use-center'

// 引入配置状态管理，包含卡片样式、站点内容（如圣诞主题）等全局配置
import { useConfigStore } from './stores/config-store'

// 卡片之间的默认间距常量
import { CARD_SPACING } from '@/consts'

// 日期处理库，用于格式化、计算日期信息
import dayjs from 'dayjs'
// 引入中文语言包，使 dayjs 支持中文星期等本地化格式
import 'dayjs/locale/zh-cn'

// 工具函数，用于方便拼接 className 字符串（类似 classnames 库）
import { cn } from '@/lib/utils'

// 可拖拽容器组件，使日历卡片能自由移动位置
import { HomeDraggableLayer } from './home-draggable-layer'

// 设置 dayjs 全局语言为中文，保证星期、月份等文本显示为中文
dayjs.locale('zh-cn')

// 日历卡片组件：展示当前月份日历，标记今天，支持圣诞主题装饰
export default function CalendarCard() {
	// 获取当前页面中心基准坐标
	const center = useCenterStore()
	// 从配置 store 中解构卡片样式配置和站点内容开关
	const { cardStyles, siteContent } = useConfigStore()

	// 获取当前时间 dayjs 实例
	const now = dayjs()
	// 今天的日期（几号）
	const currentDate = now.date()
	// 本月第一天
	const firstDayOfMonth = now.startOf('month')
	// 本月第一天是星期几（周一为 0，周日为 6），通过 day() 偏移计算实现周一作为一周开始
	const firstDayWeekday = (firstDayOfMonth.day() + 6) % 7
	// 本月总天数
	const daysInMonth = now.daysInMonth()
	// 今天是一周的第几天（周一为 0，周日为 6）
	const currentWeekday = (now.day() + 6) % 7

	// 提取各卡片样式配置，便于后续使用
	const styles = cardStyles.calendarCard
	const hiCardStyles = cardStyles.hiCard
	const clockCardStyles = cardStyles.clockCard

	// 计算卡片的 x 坐标：优先使用自定义偏移量，否则紧邻 hi 卡片右侧间距放置
	const x = styles.offsetX !== null
		? center.x + styles.offsetX
		: center.x + CARD_SPACING + hiCardStyles.width / 2

	// 计算卡片的 y 坐标：优先使用自定义偏移量，否则参照时钟卡片的偏移量加间距放置
	const y = styles.offsetY !== null
		? center.y + styles.offsetY
		: center.y - clockCardStyles.offset + CARD_SPACING

	return (
		// 可拖拽层，支持用户拖拽调整日历卡片位置，绑定唯一 cardKey 用于状态管理
		<HomeDraggableLayer cardKey='calendarCard' x={x} y={y} width={styles.width} height={styles.height}>
			{/* 卡片基础容器，应用配置中的层级、尺寸、位置，并设置纵向弹性布局 */}
			<Card
				order={styles.order}
				width={styles.width}
				height={styles.height}
				x={x}
				y={y}
				className='flex flex-col'
			>
				{/* 如果启用了圣诞主题装饰，则显示雪花图片 */}
				{siteContent.enableChristmas && (
					<>
						<img
							src='/images/christmas/snow-7.webp'
							alt='Christmas decoration'
							className='pointer-events-none absolute'
							style={{
								width: 150,
								right: -12,
								top: -12,
								opacity: 0.8,
							}}
						/>
					</>
				)}

				{/* 头部区域：显示当前日期，格式如 2026/5/8 周五 */}
				<h3 className='text-secondary text-sm'>
					{now.format('YYYY/M/D')} {now.format('ddd')}
				</h3>

				{/* 日历网格：7 列展示星期标题 + 空白填充 + 月份日期 */}
				<ul
					className={cn(
						'text-secondary mt-3 grid h-[206px] flex-1 grid-cols-7 gap-2 text-sm',
						// 当卡片尺寸较小时，缩小字体以适配
						(styles.height < 240 || styles.width < 240) && 'text-xs',
					)}
				>
					{/* 渲染星期标题行：周一 ~ 周日 */}
					{new Array(7).fill(0).map((_, index) => {
						// 标记当前星期列，高亮显示（如今天为周五，则“五”高亮）
						const isCurrentWeekday = index === currentWeekday
						return (
							<li
								key={index}
								className={cn(
									'flex items-center justify-center font-medium',
									isCurrentWeekday && 'text-brand',
								)}
							>
								{dates[index]}
							</li>
						)
					})}

					{/* 填充空白格子，使 1 号对齐到正确的星期列 */}
					{new Array(firstDayWeekday).fill(0).map((_, index) => (
						<li key={`empty-${index}`} />
					))}

					{/* 渲染本月所有日期，标记今天 */}
					{new Array(daysInMonth).fill(0).map((_, index) => {
						const day = index + 1
						const isToday = day === currentDate
						return (
							<li
								key={day}
								className={cn(
									'flex items-center justify-center rounded-lg',
									isToday && 'bg-linear border font-medium',
								)}
							>
								{day}
							</li>
						)
					})}
				</ul>
			</Card>
		</HomeDraggableLayer>
	)
}

// 中文星期数组，索引 0 为周一，6 为周日
const dates = ['一', '二', '三', '四', '五', '六', '日']
