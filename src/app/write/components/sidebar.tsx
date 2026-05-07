// 从当前目录下的 sections 子目录中导入三个独立的区块组件
// CoverSection：封面设置区域（如文章封面图）
// MetaSection：元信息设置区域（如标题、摘要、分类等）
// ImagesSection：图片管理区域（如内文配图）
import { CoverSection } from './sections/cover-section'
import { MetaSection } from './sections/meta-section'
import { ImagesSection } from './sections/images-section'

// 从全局常量模块中导入动画延迟相关的配置常量
// ANIMATION_DELAY：每个区块之间的动画间隔时长
// INIT_DELAY：整个侧边栏初始加载时的基础延迟
import { ANIMATION_DELAY, INIT_DELAY } from '@/consts'

/**
 * WriteSidebar 组件
 * 用于写作/编辑页面的侧边栏，依次展示封面、元信息、图片三个设置区块。
 * 通过传入逐级递增的 delay 属性，为每个区块实现错峰有序的进场动画效果。
 */
export function WriteSidebar() {
	return (
		// 固定宽度 320px 的容器，子元素垂直排列，间距为 1.5rem（space-y-6）
		<div className='w-[320px] space-y-6'>
			{/* 封面区块：延迟 = 基础延迟 + 0 * 动画间隔 → 最先显示 */}
			<CoverSection delay={INIT_DELAY + ANIMATION_DELAY * 0} />

			{/* 元信息区块：延迟 = 基础延迟 + 1 * 动画间隔 → 第二个显示 */}
			<MetaSection delay={INIT_DELAY + ANIMATION_DELAY * 1} />

			{/* 图片区块：延迟 = 基础延迟 + 2 * 动画间隔 → 最后显示 */}
			<ImagesSection delay={INIT_DELAY + ANIMATION_DELAY * 2} />
		</div>
	)
}