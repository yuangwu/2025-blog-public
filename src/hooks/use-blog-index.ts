// 引入 SWR 的数据获取/缓存库，用于客户端数据请求
import useSWR from 'swr'

// 引入基于 zustand 的认证状态钩子，获取用户登录状态
import { useAuthStore } from '@/hooks/use-auth'

// 引入博客列表项的类型定义
import type { BlogIndexItem } from '@/app/blog/types'

// 重新导出类型，供外部模块使用
export type { BlogIndexItem } from '@/app/blog/types'

/**
 * 自定义 fetch 封装，用于 SWR 的数据获取器（fetcher）
 * 增强了对 HTTP 错误状态码的处理，并将错误传播到 SWR 的 error 对象中
 */
const fetcher = async (url: string) => {
	// 发起请求，禁用缓存以确保每次都获取最新数据
	const res = await fetch(url, { cache: 'no-store' })

	// 如果响应状态不正常（如 404、500 等），构造错误并抛出
	if (!res.ok) {
		const error: any = new Error('Fetch failed')
		// 将 HTTP 状态码附加到错误对象上，便于上层区分不同错误
		error.status = res.status
		throw error
	}

	// 解析 JSON 数据
	const data = await res.json()
	// 确保返回数组，若数据不是数组则返回空数组，避免非数组数据导致后续 filter/sort 异常
	return Array.isArray(data) ? data : []
}

/**
 * 自定义 Hook：获取博客文章索引列表
 * 会根据用户认证状态自动过滤隐藏文章
 */
export function useBlogIndex() {
	// 获取用户是否已登录
	const { isAuth } = useAuthStore()

	// 使用 SWR 请求 '/blogs/index.json'，并通过 fetcher 获取数据
	const { data, error, isLoading } = useSWR<BlogIndexItem[]>(
		'/blogs/index.json',
		fetcher,
		{
			// 窗口重新获得焦点时不重新验证，减少不必要请求
			revalidateOnFocus: false,
			// 网络重新连接时自动重新验证，保持数据新鲜度
			revalidateOnReconnect: true
		}
	)

	// 获取到的数据，若无数据则使用空数组
	let result = data || []

	// 未登录用户需过滤掉标记为 hidden 的文章，实现简单的权限隐藏逻辑
	if (!isAuth) {
		result = result.filter(item => !item.hidden)
	}

	return {
		items: result,   // 处理后的博客列表
		loading: isLoading, // 加载状态
		error             // 错误对象（包含状态码等信息）
	}
}

/**
 * 自定义 Hook：获取最新一篇博客
 * 基于 useBlogIndex 的数据进行本地排序，避免额外请求
 */
export function useLatestBlog() {
	// 复用博客列表数据和状态
	const { items, loading, error } = useBlogIndex()

	// 按发布日期降序排序后取第一篇作为最新博客
	// 若无文章则返回 null
	const latestBlog = items.length > 0
		? items.sort(
			(a, b) =>
				new Date(b.date).getTime() - new Date(a.date).getTime()
		)[0]
		: null

	return {
		blog: latestBlog, // 最新博客对象，可能为 null
		loading,          // 加载状态
		error             // 错误信息
	}
}