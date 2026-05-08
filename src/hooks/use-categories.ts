'use client'

import useSWR from 'swr'

/**
 * 分类配置的数据结构
 * @property categories 分类名称数组
 */
export type CategoriesConfig = {
	categories: string[]
}

/**
 * 数据获取函数（SWR 的 fetcher）
 * 注意：该函数访问 `/blogs/categories.json`，该文件必须放置在项目的 `public/blogs/` 目录下，
 * 否则接口返回 404，本函数会安全降级返回空数组，不会导致页面崩溃。
 */
const fetcher = async (url: string): Promise<CategoriesConfig> => {
	// 发起请求，设置 cache: 'no-store' 确保始终获取最新数据（适用于 Vercel 静态部署后更新内容）
	const res = await fetch(url, { cache: 'no-store' })
	if (!res.ok) {
		// 请求失败时返回空数组，避免页面异常
		return { categories: [] }
	}
	const data = await res.json()
	// 如果返回的数据本身就是字符串数组
	if (Array.isArray(data)) {
		return { categories: data.filter((item): item is string => typeof item === 'string') }
	}
	// 如果返回的是包含 categories 字段的对象
	if (Array.isArray((data as any)?.categories)) {
		return { categories: (data as any).categories.filter((item: unknown): item is string => typeof item === 'string') }
	}
	// 其他格式均视为无效数据，返回空数组
	return { categories: [] }
}

/**
 * 自定义 Hook：获取博客分类列表
 * 使用 SWR 进行客户端数据请求，支持自动重连时重新验证，但不自动在焦点变化时重新验证。
 */
export function useCategories() {
	const { data, error, isLoading } = useSWR<CategoriesConfig>('/blogs/categories.json', fetcher, {
		revalidateOnFocus: false,      // 标签页重新获得焦点时不重新请求
		revalidateOnReconnect: true    // 网络恢复时重新请求
	})

	return {
		// 返回分类数组，若尚未加载返回空数组，保证组件不会因为 undefined 而报错
		categories: data?.categories ?? [],
		loading: isLoading, // 加载状态
		error               // 错误信息（请求失败或 JSON 解析失败时会包含错误对象）
	}
}
