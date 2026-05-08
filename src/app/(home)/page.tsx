'use client' // 标记为客户端组件，可以使用浏览器 API、事件、状态等

// 导入首页各个卡片组件
import HiCard from '@/app/(home)/hi-card' // 欢迎卡片
import ArtCard from '@/app/(home)/art-card' // 文章/艺术卡片
import ClockCard from '@/app/(home)/clock-card' // 时钟卡片
import CalendarCard from '@/app/(home)/calendar-card' // 日历卡片
import SocialButtons from '@/app/(home)/social-buttons' // 社交按钮
import ShareCard from '@/app/(home)/share-card' // 分享卡片
import AritcleCard from '@/app/(home)/aritcle-card' // 文章卡片（注意拼写可能与 Article 不同，保持原始导入名）
import WriteButtons from '@/app/(home)/write-buttons' // 写作按钮

// 导入当前目录下的特殊卡片与布局相关组件
import LikePosition from './like-position' // 点赞位置卡片
import HatCard from './hat-card' // 帽子卡片（可能是圣诞帽等装饰）
import BeianCard from './beian-card' // 备案信息卡片

// 自定义 hook：响应式大小判断（例如判断是否移动端）
import { useSize } from '@/hooks/use-size'

// 从 motion/react 导入 motion，用于添加动画交互
import { motion } from 'motion/react'

// 布局编辑状态管理（拖拽调整卡片位置）
import { useLayoutEditStore } from './stores/layout-edit-store'

// 全局配置状态管理（控制卡片显示/隐藏、站点内容等）
import { useConfigStore } from './stores/config-store'

// 轻量 toast 通知库
import { toast } from 'sonner'

// 配置对话框组件，用于修改网站设置
import ConfigDialog from './config-dialog/index'

import { useEffect } from 'react'

// 雪花背景组件（圣诞节特效）
import SnowfallBackground from '@/layout/backgrounds/snowfall'

export default function Home() {
	// 判断是否为小屏幕（移动端）
	const { maxSM } = useSize()

	// 从配置 store 中提取卡片可见性配置、对话框开关状态、站点内容
	const { cardStyles, configDialogOpen, setConfigDialogOpen, siteContent } = useConfigStore()

	// 布局编辑状态：是否正在编辑，以及保存/取消编辑方法
	const editing = useLayoutEditStore(state => state.editing)
	const saveEditing = useLayoutEditStore(state => state.saveEditing)
	const cancelEditing = useLayoutEditStore(state => state.cancelEditing)

	// 保存布局调整，弹出提示
	const handleSave = () => {
		saveEditing()
		toast.success('首页布局偏移已保存（尚未提交到远程配置）')
	}

	// 取消布局调整，弹出提示并恢复原状
	const handleCancel = () => {
		cancelEditing()
		toast.info('已取消此次拖拽布局修改')
	}

	// 监听快捷键 Ctrl/Cmd + L 或 Ctrl/Cmd + , 打开配置对话框
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === ',')) {
				e.preventDefault()
				setConfigDialogOpen(true)
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [setConfigDialogOpen])

	return (
		<>
			{/* 如果开启了圣诞节特效，在背景最底层显示雪花（zIndex: 0） */}
			{siteContent.enableChristmas && <SnowfallBackground zIndex={0} count={!maxSM ? 125 : 20} />}

			{/* 布局编辑模式提示条：固定在页面顶部中央，提示用户操作 */}
			{editing && (
				<div className='pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center pt-6'>
					<div className='pointer-events-auto flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-2 shadow-lg backdrop-blur'>
						<span className='text-xs text-gray-600'>正在编辑首页布局，拖拽卡片调整位置</span>
						<div className='flex gap-2'>
							{/* 取消按钮：带有微动效 */}
							<motion.button
								type='button'
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={handleCancel}
								className='rounded-xl border bg-white px-3 py-1 text-xs font-medium text-gray-700'>
								取消
							</motion.button>
							{/* 保存按钮：带有动效和品牌色 */}
							<motion.button type='button' whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSave} className='brand-btn px-3 py-1 text-xs'>
								保存偏移
							</motion.button>
						</div>
					</div>
				</div>
			)}

			{/* 卡片容器：在小屏幕上变为 flex 纵向排列，统一间距和内边距 */}
			<div className='max-sm:flex max-sm:flex-col max-sm:items-center max-sm:gap-6 max-sm:pt-28 max-sm:pb-20'>
				{/* 根据配置决定卡片是否显示，enabled !== false 表示默认显示 */}
				{cardStyles.artCard?.enabled !== false && <ArtCard />}
				{cardStyles.hiCard?.enabled !== false && <HiCard />}
				{/* 时钟和日历卡片仅在大屏（非移动端）显示 */}
				{!maxSM && cardStyles.clockCard?.enabled !== false && <ClockCard />}
				{!maxSM && cardStyles.calendarCard?.enabled !== false && <CalendarCard />}
				{cardStyles.socialButtons?.enabled !== false && <SocialButtons />}
				{!maxSM && cardStyles.shareCard?.enabled !== false && <ShareCard />}
				{cardStyles.articleCard?.enabled !== false && <AritcleCard />}
				{!maxSM && cardStyles.writeButtons?.enabled !== false && <WriteButtons />}
				{cardStyles.likePosition?.enabled !== false && <LikePosition />}
				{cardStyles.hatCard?.enabled !== false && <HatCard />}
				{/* 备案卡片通常在大陆站点显示 */}
				{cardStyles.beianCard?.enabled !== false && <BeianCard />}
			</div>

			{/* 如果开启了圣诞节特效，在顶层再添加一层雪花（zIndex: 2），可形成层次感 */}
			{siteContent.enableChristmas && <SnowfallBackground zIndex={2} count={!maxSM ? 125 : 20} />}

			{/* 全局配置对话框，通过 open 控制显隐 */}
			<ConfigDialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} />
		</>
	)
}