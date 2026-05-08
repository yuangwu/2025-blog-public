// 导入全局样式文件，确保所有页面都应用这些基础样式
import '@/styles/globals.css'

// 从 Next.js 导入 Metadata 类型，用于为页面元数据提供类型安全
import type { Metadata } from 'next'
// 导入自定义的页面布局组件
import Layout from '@/layout'
// 导入自定义的 Head 组件，用于向 <head> 中注入额外的标签
import Head from '@/layout/head'
// 导入站点内容的 JSON 配置文件，集中管理可维护的文案和主题
import siteContent from '@/config/site-content.json'

// 从配置中解构出需要在组件中使用的元数据和主题变量
const {
	meta: { title, description },
	theme
} = siteContent

// 导出 Next.js 的元数据对象，它会自动生成对应的 <meta>、OG 和 Twitter 卡片标签
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

// 定义一组 CSS 自定义属性（变量）和全局样式，会被直接注入到 <html> 标签上
const htmlStyle = {
	// 设置自定义光标，使用 SVG 图片，热点坐标为 (2,1)，兜底为浏览器默认光标
	cursor: 'url(/images/cursor.svg) 2 1, auto',
	// 以下将主题配置中的颜色映射为 CSS 变量，供整个应用通过 var(--xxx) 使用
	'--color-brand': theme.colorBrand,
	'--color-primary': theme.colorPrimary,
	'--color-secondary': theme.colorSecondary,
	'--color-brand-secondary': theme.colorBrandSecondary,
	'--color-bg': theme.colorBg,
	'--color-border': theme.colorBorder,
	'--color-card': theme.colorCard,
	'--color-article': theme.colorArticle
}

// RootLayout 是 Next.js App Router 的根布局组件，所有页面都会被包裹在这里
// 函数是异步的，允许在布局中进行数据获取等异步操作
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		// lang 属性声明页面语言
		// suppressHydrationWarning 用来抑制因浏览器扩展等导致的水合不匹配警告
		// style 属性直接注入上面定义的全局样式和 CSS 变量
		<html lang='en' suppressHydrationWarning style={htmlStyle}>
			{/* 
        Head 组件用于向 <head> 区域添加一些静态或动态标签，
        例如 favicon、字体预加载、外部脚本等，
        这些是 Next.js 的 metadata 对象无法覆盖的场景 
      */}
			<Head />

			<body>
				{/* 
          内联脚本：检测当前用户操作系统是否为 Windows，
          如果检测到，就为 <html> 元素添加 class "windows"。
          这通常用于处理 Windows 系统下特有的样式微调（如滚动条、字体渲染等）。
          这里使用 dangerouslySetInnerHTML 来直接写入脚本内容，
          注意这种方式没有依赖 React 的状态管理，可以避免闪烁。
        */}
				<script
					dangerouslySetInnerHTML={{
						__html: `
					if (/windows|win32/i.test(navigator.userAgent)) {
						document.documentElement.classList.add('windows');
					}
		      `
					}}
				/>

				{/* 核心布局组件，包裹所有子页面内容（children） */}
				<Layout>{children}</Layout>
			</body>
		</html>
	)
}