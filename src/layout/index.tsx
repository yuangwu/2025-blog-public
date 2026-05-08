'use client' // 声明这是一个客户端组件，可使用浏览器 API 和 React hooks

import { PropsWithChildren } from 'react'
import { useCenterInit } from '@/hooks/use-center' // 初始化页面居中相关的全局设置
import BlurredBubblesBackground from './backgrounds/blurred-bubbles' // 动态模糊气泡背景组件
import NavCard from '@/components/nav-card' // 导航卡片组件
import { Toaster } from 'sonner' // 轻量级 toast 通知库
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from 'lucide-react' // 图标库
import { useSize, useSizeInit } from '@/hooks/use-size' // 响应式尺寸检测 hook
import { useConfigStore } from '@/app/(home)/stores/config-store' // 全局配置状态管理 (Zustand)
import { ScrollTopButton } from '@/components/scroll-top-button' // 回到顶部按钮
import MusicCard from '@/components/music-card' // 音乐播放卡片组件

export default function Layout({ children }: PropsWithChildren) {
	// 执行页面初始化：居中布局初始化、尺寸监听初始化
	useCenterInit()
	useSizeInit()

	// 从全局配置 store 中获取卡片样式、站点内容和背景刷新 key
	const { cardStyles, siteContent, regenerateKey } = useConfigStore()
	// 获取当前屏幕是否小于 SM 断点以及尺寸 hook 是否已完成初始化
	const { maxSM, init } = useSize()

	// 背景图片数组（可能未配置，默认空数组）
	const backgroundImages = (siteContent.backgroundImages ?? []) as Array<{ id: string; url: string }>
	const currentBackgroundImageId = siteContent.currentBackgroundImageId
	// 尝试找到当前选中的背景图片对象，未选中或 ID 为空则返回 null
	const currentBackgroundImage =
		currentBackgroundImageId && currentBackgroundImageId.trim()
			? backgroundImages.find(item => item.id === currentBackgroundImageId)
			: null

	return (
		<>
			{/* Sonner toast 通知容器，配置位置、颜色以及自定义图标 */}
			<Toaster
				position='bottom-right'
				richColors
				icons={{
					success: <CircleCheckIcon className='size-4' />,
					info: <InfoIcon className='size-4' />,
					warning: <TriangleAlertIcon className='size-4' />,
					error: <OctagonXIcon className='size-4' />,
					loading: <Loader2Icon className='size-4 animate-spin' />
				}}
				style={
					{
						'--border-radius': '12px'
					} as React.CSSProperties
				}
			/>

			{/* 当前选中的背景图片：固定在视口底层，覆盖整个屏幕 */}
			{currentBackgroundImage && (
				<div
					className='fixed inset-0 z-0 overflow-hidden'
					style={{
						backgroundImage: `url(${currentBackgroundImage.url})`,
						backgroundSize: 'cover',
						backgroundPosition: 'center',
						backgroundRepeat: 'no-repeat'
					}}
				/>
			)}

			{/* 模糊气泡动画背景层，接收用户设置的背景颜色和刷新标识 */}
			<BlurredBubblesBackground colors={siteContent.backgroundColors} regenerateKey={regenerateKey} />

			{/* 主要内容区域，位于背景之上 */}
			<main className='relative z-10 h-full'>
				{children}       {/* 页面内容 */}
				<NavCard />      {/* 导航卡片，始终显示 */}

				{/* 在非小屏设备上，且音乐卡片未被显式禁用时显示 */}
				{!maxSM && cardStyles.musicCard?.enabled !== false && <MusicCard />}
			</main>

			{/* 小屏设备且尺寸监听初始化完成后，显示回到顶部的浮动按钮 */}
			{maxSM && init && <ScrollTopButton className='bg-brand/20 fixed right-6 bottom-8 z-50 shadow-md' />}
		</>
	)
}
