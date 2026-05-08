import useSWR from 'swr'
import { useAuthStore } from '@/hooks/use-auth'
import type { BlogIndexItem } from '@/app/blog/types'

// 重新导出 BlogIndexItem 类型，方便其他模块使用
export type { BlogIndexItem } from '@/app/blog/types'

/**
 * 数据抓取函数（fetcher）
 * 使用 fetch 请求指定 URL，并直接抛出带状态码的错误，便于 SWR 处理 404 等异常。
 * 注意：请确保在 Vercel 部署时 public 目录下存在 /blogs/index.json 文件，
 * 否则请求会失败并返回 404，不过本 fetcher 会将其捕获为错误，不会导致页面崩溃。
 */
const fetcher = async (url: string) => {
	// 强制不缓存，确保每次获取最新数据
	const res = await fetch(url, { cache: 'no-store' })
	if (!res.ok) {
		// 构造一个带有 HTTP 状态码的错误对象，方便上层判断错误类型
		const error: any = new Error('Fetch failed')
		error.status = res.status
		throw error
	}
	const data = await res.json()
	// 确保返回值始终是数组，避免后续使用时报错
	return Array.isArray(data) ? data : []
}

/**
 * 博客列表 Hook
 * 从 /blogs/index.json 获取所有博客条目，并根据登录状态过滤掉隐藏博客。
 * 使用 SWR 进行客户端数据请求，默认不聚焦时重新验证，断线重连时会重新验证。
 * 依赖：
 * - swr 包（需要安装）
 * - useAuthStore（需要确保 '@/hooks/use-auth' 路径存在且导出了包含 isAuth 的 store）
 * - BlogIndexItem 类型（需确保 '@/app/blog/types' 存在并导出该类型）
 */
export function useBlogIndex() {
	// 从认证 store 中获取登录状态
	const { isAuth } = useAuthStore()
	const { data, error, isLoading } = useSWR<BlogIndexItem[]>('/blogs/index.json', fetcher, {
		revalidateOnFocus: false,    // 窗口获得焦点时不自动重新请求
		revalidateOnReconnect: true  // 网络重新连接时重新请求
	})

	// 使用 data，若未获取到则使用空数组，避免 undefined 引发错误
	let result = data || []
	// 未登录时，过滤掉标记为 hidden 的博客
	if (!isAuth) {
		result = result.filter(item => !item.hidden)
	}

	return {
		items: result,    // 根据登录状态过滤后的博客列表
		loading: isLoading,
		error             // 请求错误（可由 SWR 错误处理机制捕获）
	}
}

/**
 * 最新博客 Hook
 * 基于 useBlogIndex 获取的博客列表，按日期降序排序后取出第一条作为最新博客。
 * 若列表为空，则返回 null。
 */
export function useLatestBlog() {
	const { items, loading, error } = useBlogIndex()

	// 按日期降序排序，返回第一个（即日期最新的博客），若无则返回 null
	const latestBlog = items.length > 0
		? items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
		: null

	return {
		blog: latestBlog,
		loading,
		error
	}
}
