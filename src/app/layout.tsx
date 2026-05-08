// 导入全局样式（Tailwind CSS 或自定义样式），确保在组件渲染前加载
import '@/styles/globals.css'

// 从 Next.js 导入 Metadata 类型，用于定义页面元数据（SEO）
import type { Metadata } from 'next'
// 引入自定义布局组件（包裹页面的整体结构）
import Layout from '@/layout'
// 自定义 Head 组件，可能用于注入额外的 <head> 内容（如 meta、link、script）
import Head from '@/layout/head'
// 站点静态配置文件，集中管理文本与主题变量，方便维护和修改
import siteContent from '@/config/site-content.json'

// 从站点配置中解构出 meta 信息和主题变量
const {
	meta: { title, description },
	theme
} = siteContent

// 导出静态元数据对象，Next.js 会自动生成 <title> 和 Open Graph / Twitter 卡片标签
// 在 Vercel 部署时，该元数据会直接渲染到服务端 HTML 中，对 SEO 非常有利
export const metadata: Metadata = {
	title,
	description,
	openGraph: {
		title,
		description
	},
	twitter: {
		title,
		description
	}
}

// 内联样式对象，将主题颜色通过 CSS 自定义属性（变量）注入到 <html> 元素
// 这样可以方便地在组件和全局样式中使用 var(--color-brand) 等变量
const htmlStyle = {
	// 自定义光标图标（SVG），2 1 表示热点偏移
	cursor: 'url(/images/cursor.svg) 2 1, auto',
	'--color-brand': theme.colorBrand,
	'--color-primary': theme.colorPrimary,
	'--color-secondary': theme.colorSecondary,
	'--color-brand-secondary': theme.colorBrandSecondary,
	'--color-bg': theme.colorBg,
	'--color-border': theme.colorBorder,
	'--color-card': theme.colorCard,
	'--color-article': theme.colorArticle
}

// 根布局组件，必须为服务端组件（默认），包裹所有页面
// 该组件在每次路由变化时不会重新渲染，保持持久布局
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		// suppressHydrationWarning 用于抑制因浏览器扩展或客户端脚本造成的初始 HTML 差异警告
		// style 属性将主题变量直接写入 HTML，无需额外的 CSS-in-JS 运行时，对 Vercel 的静态优化友好
		<html lang='en' suppressHydrationWarning style={htmlStyle}>
			{/* 自定义 Head 组件，可能包含字体、favicon、viewport 等设置 */}
			<Head />

			<body>
				{/* 内联脚本：检测 Windows 操作系统，为 <html> 添加特定 class，用于处理平台差异样式 */}
				{/* 使用 dangerouslySetInnerHTML 直接注入脚本，在页面加载早期执行，避免闪烁 */}
				{/* 注意：Vercel 的边缘网络会缓存该页面，脚本也会被缓存，客户端执行不会影响缓存 */}
				<script
					dangerouslySetInnerHTML={{
						__html: `
					if (/windows|win32/i.test(navigator.userAgent)) {
						document.documentElement.classList.add('windows');
					}
		      `
					}}
				/>

				{/* Layout 组件包含页面的实际内容，如导航、侧边栏、页脚等 */}
				{/* 在 Vercel 上，该部分会被服务端渲染，并可能通过 ISR 或 SSR 动态生成 */}
				<Layout>{children}</Layout>
			</body>
		</html>
	)
}
