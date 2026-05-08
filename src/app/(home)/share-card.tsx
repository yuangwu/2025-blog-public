'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/card' // 引入卡片基础组件
import { useCenterStore } from '@/hooks/use-center' // 用于获取页面中心坐标的全局 store
import { useConfigStore } from './stores/config-store' // 当前模块的配置 store
import { CARD_SPACING } from '@/consts' // 卡片间距常量
import shareList from '@/app/share/list.json' // 推荐列表数据，来自静态 JSON 文件（⚠️ 需要确保此文件存在）
import Link from 'next/link' // Next.js 的 Link 组件
import { HomeDraggableLayer } from './home-draggable-layer' // 可拖拽容器组件（⚠️ 需确保该子组件存在）

// 定义共享推荐项的数据结构
type ShareItem = {
	name: string
	url: string
	logo: string
	description: string
	tags: string[]
	stars: number
}

export default function ShareCard() {
	const center = useCenterStore() // 获取中心位置
	const { cardStyles, siteContent } = useConfigStore() // 获取卡片样式与站点通用内容
	const [randomItem, setRandomItem] = useState<ShareItem | null>(null) // 随机选取的推荐项
	const styles = cardStyles.shareCard // 当前卡片的专属样式
	const hiCardStyles = cardStyles.hiCard // Hi卡片的样式（用于计算位置偏移）
	const socialButtonsStyles = cardStyles.socialButtons // 社交按钮的样式（用于计算位置偏移）

	useEffect(() => {
		// 首次渲染时从 shareList 中随机选取一项
		const randomIndex = Math.floor(Math.random() * shareList.length)
		setRandomItem(shareList[randomIndex])
	}, [])

	// 如果还未选取到随机项，不渲染任何内容
	if (!randomItem) {
		return null
	}

	// 计算卡片的 x 坐标：优先使用配置的偏移量，若无则基于 hiCard 和社交按钮宽度计算
	const x = styles.offsetX !== null
		? center.x + styles.offsetX
		: center.x + hiCardStyles.width / 2 - socialButtonsStyles.width

	// 计算卡片的 y 坐标：优先使用配置的偏移量，若无则依次累加 hiCard 高度、间距、社交按钮高度、再一个间距
	const y = styles.offsetY !== null
		? center.y + styles.offsetY
		: center.y + hiCardStyles.height / 2 + CARD_SPACING + socialButtonsStyles.height + CARD_SPACING

	return (
		<HomeDraggableLayer cardKey='shareCard' x={x} y={y} width={styles.width} height={styles.height}>
			{/* 使用可拖拽容器包裹，卡片可以在首页自由拖动 */}
			<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y}>
				{/* 如果启用了圣诞主题，显示装饰图（⚠️ 需确保图片 /images/christmas/snow-12.webp 存在） */}
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

				<h2 className='text-secondary text-sm'>随机推荐</h2>

				{/* 点击整个区域跳转到 /share 分享页面 */}
				<Link href='/share' className='mt-2 block space-y-2'>
					<div className='flex items-center'>
						<div className='relative mr-3 h-12 w-12 shrink-0 overflow-hidden rounded-xl'>
							{/* 推荐项的 logo 图片，假设 logo 为有效的图片地址 */}
							<img src={randomItem.logo} alt={randomItem.name} className='h-full w-full object-contain' />
						</div>
						<h3 className='text-sm font-medium'>{randomItem.name}</h3>
					</div>

					{/* 推荐描述，最多显示 3 行 */}
					<p className='text-secondary line-clamp-3 text-xs'>{randomItem.description}</p>
				</Link>
			</Card>
		</HomeDraggableLayer>
	)
}
