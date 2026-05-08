'use client'
// 声明该组件为客户端组件，以便使用浏览器 API 和 React hooks

import { PropsWithChildren } from 'react'
import { useCenterInit } from '@/hooks/use-center'
import BlurredBubblesBackground from './backgrounds/blurred-bubbles'
import NavCard from '@/components/nav-card'
import { Toaster } from 'sonner'
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from 'lucide-react'
import { useSize, useSizeInit } from '@/hooks/use-size' // 响应式尺寸监听相关 hook
import { useConfigStore } from '@/app/(home)/stores/config-store'
import { ScrollTopButton } from '@/components/scroll-top-button'
import MusicCard from '@/components/music-card'

export default function Layout({ children }: PropsWithChildren) {
	// 初始化中心点相关的全局状态或逻辑（如背景泡泡的位置/动画）
	useCenterInit()
	// 初始化屏幕尺寸监听，注入 CSS 断点信息
	useSizeInit()
	// 从全局配置 store 中取出卡片样式、站点内容和用于强制刷新的 key
	const { cardStyles, siteContent, regenerateKey } = useConfigStore()
	// 获取是否小于 SM 断点以及尺寸 hook 是否已完成初始化
	const { maxSM, init } = useSize()

	// 将站点内容中的 backgroundImages 断言为带有 id 和 url 的对象数组，若不存在则为空数组
	const backgroundImages = (siteContent.backgroundImages ?? []) as Array<{ id: string; url: string }>
	// 当前选中的背景图片 ID
	const currentBackgroundImageId = siteContent.currentBackgroundImageId
	// 根据 ID 查找当前应显示的背景图片对象，若 ID 无效或为空则返回 null
	const currentBackgroundImage =
		currentBackgroundImageId && currentBackgroundImageId.trim()
			? backgroundImages.find(item => item.id === currentBackgroundImageId)
			: null

	return (
		<>
			{/* Sonner 的 Toaster 容器：用于全局 toast 弹出，并自定义图标样式 */}
			<Toaster
				position='bottom-right'
				richColors
				// 启用富颜色模式
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
			{/* 当存在选中的自定义背景图片时，渲染一个固定定位的背景图层 */}
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
			{/* 模糊泡泡动态背景组件，传入背景颜色数组和强制刷新 key */}
			<BlurredBubblesBackground colors={siteContent.backgroundColors} regenerateKey={regenerateKey} />

			{/* 主内容区域，相对定位以建立层叠上下文，使内容在背景之上 */}
			<main className='relative z-10 h-full'>
				{children}
				{/* 导航卡片组件，通常位于页面固定位置 */}
				<NavCard />

				{/* 在非小屏设备 且 音乐卡片未被手动禁用时，显示音乐卡片 */}
				{!maxSM && cardStyles.musicCard?.enabled !== false && <MusicCard />}
			</main>

			{/* 在移动端（小屏）且尺寸初始化完成后，显示回到顶部的浮动按钮 */}
			{maxSM && init && <ScrollTopButton className='bg-brand/20 fixed right-6 bottom-8 z-50 shadow-md' />}
		</>
	)
}
