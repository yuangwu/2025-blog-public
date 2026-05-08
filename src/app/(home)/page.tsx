'use client'

// 引入首页各功能卡片组件
import HiCard from '@/app/(home)/hi-card'
import ArtCard from '@/app/(home)/art-card'
import ClockCard from '@/app/(home)/clock-card'
import CalendarCard from '@/app/(home)/calendar-card'
import SocialButtons from '@/app/(home)/social-buttons'
import ShareCard from '@/app/(home)/share-card'
// 注意：组件名 AritcleCard 可能是 ArticleCard 的拼写变体，此处保留原始引入路径
import AritcleCard from '@/app/(home)/aritcle-card'
import WriteButtons from '@/app/(home)/write-buttons'
// 以下组件从当前目录引入
import LikePosition from './like-position'
import HatCard from './hat-card'
import BeianCard from './beian-card'

// 引入响应式尺寸监听 Hook
import { useSize } from '@/hooks/use-size'
// 引入 framer-motion 动画库（注意：包名为 motion，已重命名为 motion/react）
import { motion } from 'motion/react'
// 引入布局编辑和配置状态管理
import { useLayoutEditStore } from './stores/layout-edit-store'
import { useConfigStore } from './stores/config-store'
// 引入 toast 通知组件
import { toast } from 'sonner'
// 引入配置对话框组件
import ConfigDialog from './config-dialog/index'
import { useEffect } from 'react'
// 引入圣诞雪花背景组件
import SnowfallBackground from '@/layout/backgrounds/snowfall'

export default function Home() {
	// 获取当前屏幕尺寸是否小于 sm 断点（移动端）
	const { maxSM } = useSize()
	// 从配置 store 中获取卡片显示配置、对话框状态以及站点内容配置
	const { cardStyles, configDialogOpen, setConfigDialogOpen, siteContent } = useConfigStore()
	// 从布局编辑 store 中获取编辑状态及相关方法
	const editing = useLayoutEditStore(state => state.editing)
	const saveEditing = useLayoutEditStore(state => state.saveEditing)
	const cancelEditing = useLayoutEditStore(state => state.cancelEditing)

	// 保存当前拖拽调整后的布局偏移
	const handleSave = () => {
		saveEditing()
		toast.success('首页布局偏移已保存（尚未提交到远程配置）')
	}

	// 取消本次拖拽修改，恢复之前的布局
	const handleCancel = () => {
		cancelEditing()
		toast.info('已取消此次拖拽布局修改')
	}

	// 注册键盘快捷键：Ctrl+L 或 Cmd+, 打开配置对话框
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// 判断是否按下 Ctrl (Windows/Linux) 或 Meta (Mac) 键，并且按下 L 或 , 键
			if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === ',')) {
				e.preventDefault()
				setConfigDialogOpen(true)
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		// 清理事件监听，避免内存泄漏
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [setConfigDialogOpen])

	return (
		<>
			{/* 若启用圣诞特效，则在底层渲染雪花背景（zIndex较低） */}
			{siteContent.enableChristmas && <SnowfallBackground zIndex={0} count={!maxSM ? 125 : 20} />}

			{/* 编辑模式下的浮动工具栏，用于保存或取消布局修改 */}
			{editing && (
				<div className='pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center pt-6'>
					<div className='pointer-events-auto flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-2 shadow-lg backdrop-blur'>
						<span className='text-xs text-gray-600'>正在编辑首页布局，拖拽卡片调整位置</span>
						<div className='flex gap-2'>
							<motion.button
								type='button'
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={handleCancel}
								className='rounded-xl border bg-white px-3 py-1 text-xs font-medium text-gray-700'>
								取消
							</motion.button>
							<motion.button
								type='button'
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={handleSave}
								className='brand-btn px-3 py-1 text-xs'>
								保存偏移
							</motion.button>
						</div>
					</div>
				</div>
			)}

			{/* 卡片区域，根据配置决定各卡片是否显示，移动端仅显示部分卡片 */}
			<div className='max-sm:flex max-sm:flex-col max-sm:items-center max-sm:gap-6 max-sm:pt-28 max-sm:pb-20'>
				{cardStyles.artCard?.enabled !== false && <ArtCard />}
				{cardStyles.hiCard?.enabled !== false && <HiCard />}
				{/* 以下卡片仅在非移动端（md及以上）显示 */}
				{!maxSM && cardStyles.clockCard?.enabled !== false && <ClockCard />}
				{!maxSM && cardStyles.calendarCard?.enabled !== false && <CalendarCard />}
				{cardStyles.socialButtons?.enabled !== false && <SocialButtons />}
				{!maxSM && cardStyles.shareCard?.enabled !== false && <ShareCard />}
				{cardStyles.articleCard?.enabled !== false && <AritcleCard />}
				{!maxSM && cardStyles.writeButtons?.enabled !== false && <WriteButtons />}
				{cardStyles.likePosition?.enabled !== false && <LikePosition />}
				{cardStyles.hatCard?.enabled !== false && <HatCard />}
				{cardStyles.beianCard?.enabled !== false && <BeianCard />}
			</div>

			{/* 若启用圣诞特效，则在顶层再渲染一层雪花（zIndex较高），形成层次感 */}
			{siteContent.enableChristmas && <SnowfallBackground zIndex={2} count={!maxSM ? 125 : 20} />}

			{/* 全局配置对话框 */}
			<ConfigDialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} />
		</>
	)
}
