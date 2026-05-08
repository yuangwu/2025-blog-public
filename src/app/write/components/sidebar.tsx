// 从各个子组件文件中导入所需的区块组件
import { CoverSection } from './sections/cover-section'   // 封面信息区块
import { MetaSection } from './sections/meta-section'     // 元数据信息区块
import { ImagesSection } from './sections/images-section' // 图片展示区块

// 从全局常量文件中导入动画延迟相关的配置
import { ANIMATION_DELAY, INIT_DELAY } from '@/consts'

/**
 * 写文章页面的侧边栏组件
 * 用于展示文章的封面、元数据和图片三个信息区域，
 * 每个区域会按照设定的动画延迟依次出现
 */
export function WriteSidebar() {
	return (
		// 外层容器：固定宽度320px，子元素之间垂直间距为24px（space-y-6）
		<div className='w-[320px] space-y-6'>
			{/* 封面区块：无额外延迟，基础延迟 + 0倍动画间隔 */}
			<CoverSection delay={INIT_DELAY + ANIMATION_DELAY * 0} />

			{/* 元数据区块：延迟一个动画间隔 */}
			<MetaSection delay={INIT_DELAY + ANIMATION_DELAY * 1} />

			{/* 图片区块：延迟两个动画间隔 */}
			<ImagesSection delay={INIT_DELAY + ANIMATION_DELAY * 2} />
		</div>
	)
}
