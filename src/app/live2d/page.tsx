// 'use client' 指令：标记该文件为客户端组件（Client Component）
// 意味着该组件及其子组件会在浏览器端渲染并执行，可以使用浏览器 API 和 React Hooks（如 useState、useEffect 等）
'use client'

// 从当前目录下的 live2d-viewer 模块中导入 Live2DViewer 组件
// 这个组件很可能是负责加载和渲染 Live2D 模型的客户端组件
import Live2DViewer from './live2d-viewer'

// 默认导出一个名为 Live2DPage 的 React 函数组件，作为某个页面路由的渲染内容
export default function Live2DPage() {
	// 返回组件的 JSX 结构
	return (
		// 最外层 div 作为容器
		// className 使用 Tailwind CSS 工具类：
		// flex：将容器设为弹性盒子
		// h-full：高度占满父元素
		// items-center：子元素在交叉轴（垂直方向）上居中
		// justify-center：子元素在主轴（水平方向）上居中
		// py-8：上下内边距为 2rem（8 × 0.25rem），留出呼吸空间
		<div className='flex h-full items-center justify-center py-8'>
			{/* 渲染 Live2DViewer 组件，展示 Live2D 模型 */}
			<Live2DViewer />
		</div>
	)
}