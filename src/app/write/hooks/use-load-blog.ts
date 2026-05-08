// 从 react 引入 useEffect，用于处理副作用（如数据请求）
import { useEffect } from 'react'
// 从项目的状态管理 store 中引入写文章相关的 hook
// 这里假设使用 zustand 或其他状态管理库
import { useWriteStore } from '../stores/write-store'
// sonner：一个轻量级的 toast 通知库，用于向用户显示弹窗消息
import { toast } from 'sonner'

/**
 * 自定义 Hook：根据博客的 slug（唯一标识）加载博客内容用于编辑
 * @param slug - 可选参数，博客的短链接标识；未传入或为空时不执行加载
 * @returns { loading: boolean } 返回加载状态，供组件使用以显示加载动画等
 */
export function useLoadBlog(slug?: string) {
	// 从 write-store 中解构出加载博客的方法和当前加载状态
	const { loadBlogForEdit, loading } = useWriteStore()

	// 副作用：监听 slug 的变化，自动加载对应博客
	useEffect(() => {
		// 仅当 slug 存在（非空字符串）时才发起请求
		if (slug) {
			// 调用异步加载方法，失败时捕获异常
			loadBlogForEdit(slug).catch(err => {
				// 在控制台输出错误详情，便于开发调试
				console.error('Failed to load blog:', err)
				// 向用户展示友好的错误提示
				toast.error('加载博客失败')
			})
		}
		// 依赖数组：当 slug 或 loadBlogForEdit 发生变化时重新执行副作用
	}, [slug, loadBlogForEdit])

	// 返回当前加载状态，调用方可以据此渲染加载指示器
	return { loading }
}