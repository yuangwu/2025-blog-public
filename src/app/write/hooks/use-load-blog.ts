import { useEffect } from 'react'
// 从写博客状态管理 store 中引入 hook
import { useWriteStore } from '../stores/write-store'
// 引入 sonner 的 toast 用于错误提示
import { toast } from 'sonner'

/**
 * 根据博客 slug 加载博客数据进行编辑的自定义 hook
 * @param slug - 博客的唯一标识（slug），可选，传入了才会加载
 * @returns 包含 loading 状态的对象，用于指示数据是否正在加载
 */
export function useLoadBlog(slug?: string) {
	// 从写博客 store 中获取加载博客的方法和加载状态
	const { loadBlogForEdit, loading } = useWriteStore()

	useEffect(() => {
		// 只有在 slug 存在时才触发加载
		if (slug) {
			// 调用异步加载方法，并捕获可能的错误
			loadBlogForEdit(slug).catch(err => {
				// 控制台输出错误详情，方便调试
				console.error('Failed to load blog:', err)
				// 使用 toast 弹出用户友好的错误提示
				toast.error('加载博客失败')
			})
		}
	// 当 slug 或 loadBlogForEdit 变化时重新执行
	// 注意：loadBlogForEdit 应该在 store 中保持引用稳定，以避免不必要的重复请求
	}, [slug, loadBlogForEdit])

	// 返回当前的 loading 状态
	return { loading }
}
