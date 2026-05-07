// 导入 Card 组件，用于渲染卡片容器
import Card from '@/components/card'

// 中心位置状态 hook，用于获取当前整个布局的参考坐标
import { useCenterStore } from '@/hooks/use-center'

// 全局配置状态 hook，提供卡片样式、站点开关（如圣诞装饰）等
import { useConfigStore } from './stores/config-store'

// 卡片之间的默认间距常量
import { CARD_SPACING } from '@/consts'

// 日期处理库
import dayjs from 'dayjs'
// 导入中文语言包，使 dayjs 能输出中文星期等
import 'dayjs/locale/zh-cn'

// 工具函数，用于组合 CSS 类名（类似 classnames 库）
import { cn } from '@/lib/utils'

// 可拖拽的图层组件，使日历卡片能被用户拖动
import { HomeDraggableLayer } from './home-draggable-layer'

// 设置 dayjs 使用中文区域，这样 format('ddd') 会输出 "周一" ~ "周日"
dayjs.locale('zh-cn')

// 星期表头，从周一到周日
const dates = ['一', '二', '三', '四', '五', '六', '日']

/**
 * 日历卡片组件
 * 展示当月日历，并高亮今天日期和当前星期。
 * 支持动态位置偏移，以及可选的圣诞节装饰。
 */
export default function CalendarCard() {
	// 获取整个桌面布局的中心参考点坐标 { x, y }
	const center = useCenterStore()

	// 从配置状态中取出卡片样式和站点内容开关
	const { cardStyles, siteContent } = useConfigStore()

	// 当前日期时间对象
	const now = dayjs()

	// 今天是几号（1~31）
	const currentDate = now.date()

	// 本月第一天
	const firstDayOfMonth = now.startOf('month')

	// 计算本月第一天是周几（0=周一, 6=周日）
	// dayjs 的 .day() 返回 0=周日, 1=周一 ... 6=周六
	// 通过 (+6) % 7 转换为 0=周一 ... 6=周日，与上方 dates 数组对齐
	const firstDayWeekday = (firstDayOfMonth.day() + 6) % 7

	// 本月总天数
	const daysInMonth = now.daysInMonth()

	// 今天是周几，同样映射为 0=周一 ~ 6=周日
	const currentWeekday = (now.day() + 6) % 7

	// 提取日历卡片专属样式配置
	const styles = cardStyles.calendarCard

	// 用于计算相对位置的其他卡片样式
	const hiCardStyles = cardStyles.hiCard
	const clockCardStyles = cardStyles.clockCard

	// 计算卡片的 x 坐标
	// 若手动设置了 offsetX，则直接基于中心偏移；否则默认放置在 Hi 卡右侧，
	// 公式：中心 x + 卡片间距 + Hi 卡宽度的一半（让日历卡与 Hi 卡右侧保持合理距离）
	const x =
		styles.offsetX !== null
			? center.x + styles.offsetX
			: center.x + CARD_SPACING + hiCardStyles.width / 2

	// 计算卡片的 y 坐标
	// 若手动设置了 offsetY，则直接使用；否则默认放在时钟卡上方偏下位置，
	// 利用时钟卡的 offset 与卡片间距来确定
	const y =
		styles.offsetY !== null
			? center.y + styles.offsetY
			: center.y - clockCardStyles.offset + CARD_SPACING

	return (
		// 用可拖拽图层包裹，cardKey 标识该卡片，以便保存拖动后的位置
		<HomeDraggableLayer cardKey="calendarCard" x={x} y={y} width={styles.width} height={styles.height}>
			{/* 卡片容器，设定层级、尺寸和 flex 纵向排列 */}
			<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y} className="flex flex-col">
				{/* 如果启用了圣诞节装饰，显示一个漂浮的雪花图片 */}
				{siteContent.enableChristmas && (
					<>
						<img
							src="/images/christmas/snow-7.webp"
							alt="Christmas decoration"
							className="pointer-events-none absolute"
							style={{ width: 150, right: -12, top: -12, opacity: 0.8 }}
						/>
					</>
				)}

				{/* 标题行：显示完整日期和星期几 */}
				<h3 className="text-secondary text-sm">
					{now.format('YYYY/M/D')} {now.format('ddd')}
				</h3>

				{/* 日历网格，高度默认 206px，当卡片宽高较小时自动缩小字号 */}
				<ul
					className={cn(
						'text-secondary mt-3 grid h-[206px] flex-1 grid-cols-7 gap-2 text-sm',
						(styles.height < 240 || styles.width < 240) && 'text-xs'
					)}
				>
					{/* 第一行：星期表头 */}
					{new Array(7).fill(0).map((_, index) => {
						// 当前星期索引对应今天，高亮显示为品牌色
						const isCurrentWeekday = index === currentWeekday
						return (
							<li
								key={index}
								className={cn(
									'flex items-center justify-center font-medium',
									isCurrentWeekday && 'text-brand'
								)}
							>
								{dates[index]}
							</li>
						)
					})}

					{/* 用空 <li> 填充本月第一天前的空白星期 */}
					{new Array(firstDayWeekday).fill(0).map((_, index) => (
						<li key={`empty-${index}`} />
					))}

					{/* 渲染当月的日期数字 */}
					{new Array(daysInMonth).fill(0).map((_, index) => {
						const day = index + 1
						const isToday = day === currentDate
						return (
							<li
								key={day}
								className={cn(
									'flex items-center justify-center rounded-lg',
									// 当天日期添加渐变背景、边框和加粗效果
									isToday && 'bg-linear border font-medium'
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