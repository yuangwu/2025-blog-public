// 从 'next' 包中导入 NextConfig 类型，用于为配置对象提供类型安全
import { NextConfig } from 'next'
// 引入 code-inspector-plugin 插件，可在浏览器中通过快捷键快速定位源码位置
import { codeInspectorPlugin } from 'code-inspector-plugin'

// 定义 Next.js 项目配置对象，并指定类型为 NextConfig
const nextConfig: NextConfig = {
	// 禁用 Next.js 开发指示器（右下角的悬浮图标），避免干扰界面
	devIndicators: false,
	// 关闭 React 严格模式，避免开发环境下生命周期、副作用等被双重调用
	reactStrictMode: false,
	// 启用 React Compiler（实验性编译器），由 React 团队提供，可自动进行性能优化（如记忆化）
	reactCompiler: true,
	// 指定页面文件扩展名，包含 Markdown (.md, .mdx) 及常规 TypeScript/JavaScript 扩展名
	// 这样 Next.js 会把 .md/.mdx 文件当作页面组件处理
	pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
	// TypeScript 相关配置
	typescript: {
		// 构建时忽略 TypeScript 类型错误，即使有类型错误也能成功打包，风险自担
		ignoreBuildErrors: true
	},
	// 实验性功能配置
	experimental: {
		// 禁用滚动位置恢复，页面跳转时不自动恢复滚动条位置
		scrollRestoration: false
	},
	// Turbopack 打包器相关配置（Next.js 新式打包工具，用于开发环境或未来生产环境）
	turbopack: {
		// 定义文件匹配规则
		rules: {
			// 对所有 .svg 文件应用以下规则
			'*.svg': {
				// 使用的 loader 列表，这里用 @svgr/webpack 将 SVG 转换为 React 组件
				loaders: ['@svgr/webpack'],
				// 将转换后的资源视为 JavaScript 模块引入
				as: '*.js'
			}
			// 以下为 codeInspectorPlugin 的 turbopack 配置，当前已注释掉
			// 若启用，可在浏览器中通过快捷键（如 Alt + 点击）直接跳转到编辑器对应代码
			// ...codeInspectorPlugin({
			// 	bundler: 'turbopack'
			// })
		},

		// 配置文件模块解析时需要处理的扩展名列表，确保 Turbopack 能正确解析 .mdx 等文件
		resolveExtensions: ['.mdx', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.json', 'css']
	},
	// Webpack 配置（当使用传统 webpack 打包时生效，例如生产构建或未启用 turbopack）
	webpack: config => {
		// 在 webpack 的模块 rules 中添加新的规则
		config.module.rules.push({
			// 匹配所有 .svg 文件
			test: /\.svg$/i,
			// 使用 @svgr/webpack loader，并传递选项关闭 SVGO 优化（保留原始 SVG 结构）
			use: [{ loader: '@svgr/webpack', options: { svgo: false } }]
		})

		// 返回修改后的 webpack 配置
		return config
	},

	// 定义重定向规则，Next.js 会在请求匹配时自动进行 301 永久重定向
	async redirects() {
		return [
			{
				// 匹配 /zh 路径
				source: '/zh',
				// 重定向到首页
				destination: '/',
				// 永久重定向（HTTP 301）
				permanent: true
			},
			{
				// 匹配 /en 路径
				source: '/en',
				// 重定向到首页
				destination: '/',
				// 永久重定向
				permanent: true
			}
		]
	}
}

// 导出配置对象供 Next.js 使用
export default nextConfig