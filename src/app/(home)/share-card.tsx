'use client' // 声明该文件是一个客户端组件，在 Next.js App Router 中使用

import { useEffect, useState } from 'react'
import Card from '@/components/card'
import { useCenterStore } from '@/hooks/use-center'
import { useConfigStore } from './stores/config-store'
import { CARD_SPACING } from '@/consts'
import shareList from '@/app/share/list.json' // 导入分享列表的 JSON 数据
import Link from 'next/link'
import { HomeDraggableLayer } from './home-draggable-layer'

// 定义分享项的数据结构
type ShareItem = {
	name: string          // 名称
	url: string           // 链接地址
	logo: string          // 图标路径
	description: string   // 描述
	tags: string[]        // 标签数组
	stars: number         // 星标数
}

export default function ShareCard() {
	// 获取页面中心坐标（来自全局 store）
	const center = useCenterStore()
	// 获取卡片样式配置与其他站点内容配置
	const { cardStyles, siteContent } = useConfigStore()
	// 随机推荐项的状态，初始为 null
	const [randomItem, setRandomItem] = useState<ShareItem | null>(null)
	// 解构当前卡片的样式设置
	const styles = cardStyles.shareCard
	const hiCardStyles = cardStyles.hiCard
	const socialButtonsStyles = cardStyles.socialButtons

	// 组件挂载时随机选取一个分享项
	useEffect(() => {
		const randomIndex = Math.floor(Math.random() * shareList.length)
		setRandomItem(shareList[randomIndex])
	}, []) // 空依赖数组表示仅在组件首次渲染后执行一次

	// 随机数据未加载完成时不渲染任何内容
	if (!randomItem) {
		return null
	}

	// 计算卡片的 x 坐标
	// 若配置中指定了 offsetX 则使用该值，否则根据 hiCard 宽度和社交按钮宽度自动计算（居中布局）
	const x = styles.offsetX !== null
		? center.x + styles.offsetX
		: center.x + hiCardStyles.width / 2 - socialButtonsStyles.width

	// 计算卡片的 y 坐标
	// 若配置中指定了 offsetY 则使用该值，否则放在 hiCard 下方（通过高度和间距推算）
	const y = styles.offsetY !== null
		? center.y + styles.offsetY
		: center.y + hiCardStyles.height / 2 + CARD_SPACING + socialButtonsStyles.height + CARD_SPACING

	return (
		// HomeDraggableLayer 使卡片可以在页面上拖拽，cardKey 用于标识并保存位置
		<HomeDraggableLayer cardKey='shareCard' x={x} y={y} width={styles.width} height={styles.height}>
			{/* Card 组件根据样式显示卡片，order 控制堆叠顺序（z-index） */}
			<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y}>
				{/* 若启用了圣诞节主题，则显示圣诞装饰图片 */}
				{siteContent.enableChristmas && (
					<>
						<img
							src='/images/christmas/snow-12.webp'
							alt='Christmas decoration'
							className='pointer-events-none absolute'
							style={{ width: 120, left: -12, top: -12, opacity: 0.8 }}
						/>
					</>
				)}

				{/* 卡片标题 */}
				<h2 className='text-secondary text-sm'>随机推荐</h2>

				{/* 可点击区域，跳转到 /share 页面 */}
				<Link href='/share' className='mt-2 block space-y-2'>
					<div className='flex items-center'>
						{/* 图标容器，圆角方形 */}
						<div className='relative mr-3 h-12 w-12 shrink-0 overflow-hidden rounded-xl'>
							<img src={randomItem.logo} alt={randomItem.name} className='h-full w-full object-contain' />
						</div>
						{/* 项目名称 */}
						<h3 className='text-sm font-medium'>{randomItem.name}</h3>
					</div>

					{/* 项目描述，最多显示三行 */}
					<p className='text-secondary line-clamp-3 text-xs'>{randomItem.description}</p>
				</Link>
			</Card>
		</HomeDraggableLayer>
	)
}