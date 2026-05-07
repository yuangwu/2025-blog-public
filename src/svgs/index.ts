// 该文件由 scripts/gen-svgs-index.js 自动生成
// 请勿手动编辑

// 导入所有 SVG 文件，每个文件被当作一个 React 组件
import Svg0 from './about-filled.svg'
import Svg1 from './about-outline.svg'
import Svg2 from './email.svg'
import Svg3 from './github.svg'
import Svg4 from './juejin.svg'
import Svg5 from './music.svg'
import Svg6 from './pen.svg'
import Svg7 from './play.svg'
import Svg8 from './projects-filled.svg'
import Svg9 from './projects-outline.svg'
import Svg10 from './scroll-filled.svg'
import Svg11 from './scroll-outline.svg'
import Svg12 from './share-filled.svg'
import Svg13 from './share-outline.svg'
import Svg14 from './short-line.svg'
import Svg15 from './top.svg'
import Svg16 from './website-filled.svg'
import Svg17 from './website-outline.svg'

// 定义 SvgComponent 类型，表示一个接收 SVGProps 的 React 组件
export type SvgComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>

// 导出包含所有 SVG 组件的数组，每个元素包含文件路径标识 key 和对应的组件 Component
// 这样可以在运行时动态选择和渲染需要的图标
export const svgItems: { key: string; Component: SvgComponent }[] = [
	{ key: './about-filled.svg', Component: Svg0 },
	{ key: './about-outline.svg', Component: Svg1 },
	{ key: './email.svg', Component: Svg2 },
	{ key: './github.svg', Component: Svg3 },
	{ key: './juejin.svg', Component: Svg4 },
	{ key: './music.svg', Component: Svg5 },
	{ key: './pen.svg', Component: Svg6 },
	{ key: './play.svg', Component: Svg7 },
	{ key: './projects-filled.svg', Component: Svg8 },
	{ key: './projects-outline.svg', Component: Svg9 },
	{ key: './scroll-filled.svg', Component: Svg10 },
	{ key: './scroll-outline.svg', Component: Svg11 },
	{ key: './share-filled.svg', Component: Svg12 },
	{ key: './share-outline.svg', Component: Svg13 },
	{ key: './short-line.svg', Component: Svg14 },
	{ key: './top.svg', Component: Svg15 },
	{ key: './website-filled.svg', Component: Svg16 },
	{ key: './website-outline.svg', Component: Svg17 }
]