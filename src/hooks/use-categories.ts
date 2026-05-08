// 声明该文件为客户端组件，仅在 Next.js App Router 中有效。
// 这允许文件在浏览器环境中运行，可以使用浏览器 API 和 React hooks。
'use client'

// 引入 SWR 库，用于数据获取和缓存管理。
import useSWR from 'swr'

// 定义分类配置的类型，包含一个 categories 数组，元素为字符串。
export type CategoriesConfig = {
	categories: string[]
}

// 数据获取函数（fetcher），接受 URL 并返回符合 CategoriesConfig 格式的数据。
// 使用 async/await 处理异步请求。
const fetcher = async (url: string): Promise<CategoriesConfig> => {
	// 发起 GET 请求，禁用 HTTP 缓存以始终获取最新数据（适合内容频繁更新的场景）。
	const res = await fetch(url, { cache: 'no-store' })
	
	// 如果响应状态不正常（如 404、500），返回空分类数组，防止应用崩溃。
	if (!res.ok) {
		return { categories: [] }
	}
	
	// 解析 JSON 响应体。
	const data = await res.json()
	
	// 处理第一种 JSON 结构：data 本身就是一个字符串数组。
	if (Array.isArray(data)) {
		// 过滤掉非字符串元素，并借助类型守卫确保类型安全。
		return { categories: data.filter((item): item is string => typeof item === 'string') }
	}
	
	// 处理第二种 JSON 结构：data 包含一个 categories 属性，且该属性是数组。
	// 使用 (data as any) 绕过严格类型检查，因为 API 返回结构可能未知。
	if (Array.isArray((data as any)?.categories)) {
		// 同样进行类型安全过滤，仅保留字符串成员。
		return { categories: (data as any).categories.filter((item: unknown): item is string => typeof item === 'string') }
	}
	
	// 如果 JSON 结构不符合预期，返回空数组作为安全的默认值。
	return { categories: [] }
}

// 自定义 React Hook：useCategories，用于获取和管理博客分类数据。
export function useCategories() {
	// 使用 SWR 进行数据请求，key 为 '/blogs/categories.json'，fetcher 为上面的函数。
	// 泛型指定 SWR 缓存的数据类型为 CategoriesConfig。
	const { data, error, isLoading } = useSWR<CategoriesConfig>('/blogs/categories.json', fetcher, {
		revalidateOnFocus: false,
		// 当浏览器窗口重新获得焦点时不重新请求（节省请求次数）。
		revalidateOnReconnect: true
		// 当网络重新连接时自动重新验证数据（保证数据及时性）。
	})

	// 返回规范化后的数据、加载状态和错误信息。
	return {
		// 如果 data 存在则使用其中的 categories，否则返回空数组（提供安全的默认值）。
		categories: data?.categories ?? [],
		loading: isLoading,
		// SWR 的加载状态（首次请求或没有缓存时）。
		error
		// 如果请求失败，这里会包含错误对象，可用于错误提示。
	}
}
