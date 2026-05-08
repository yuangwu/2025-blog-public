// 声明该文件为客户端组件（用于 Next.js App Router 的客户端边界）
'use client'

// 从自定义的 GitHub 客户端库中导入三个工具函数：
// - putFile：上传文件到 GitHub 仓库
// - toBase64Utf8：将 UTF-8 字符串转换为 Base64 编码（符合 GitHub API 要求）
// - readTextFileFromRepo：从 GitHub 仓库读取文本文件内容
import { putFile, toBase64Utf8, readTextFileFromRepo } from '@/lib/github-client'

// 导入博客索引项的类型定义
import type { BlogIndexItem } from '@/app/blog/types'

// 重新导出该类型，以便其他模块可以直接从这里导入
export type { BlogIndexItem } from '@/app/blog/types'

/**
 * 新增或更新博客索引文件（直接写入 GitHub 仓库）
 * 
 * 该函数会先读取远程仓库中的 public/blogs/index.json 文件，
 * 将其解析为索引列表，然后使用 slug 作为唯一键通过 Map 去重并更新指定项，
 * 再按日期降序排序，最后重新编码为 Base64 并提交到仓库。
 * 
 * @param token - GitHub 个人访问令牌（用于认证）
 * @param owner - 仓库所有者
 * @param repo - 仓库名称
 * @param item - 要新增或更新的博客索引项（通过 slug 判断）
 * @param branch - 目标分支名称
 */
export async function upsertBlogsIndex(
	token: string,
	owner: string,
	repo: string,
	item: BlogIndexItem,
	branch: string
): Promise<void> {
	// 索引文件在仓库中的固定路径
	const indexPath = 'public/blogs/index.json'
	let list: BlogIndexItem[] = []

	// 尝试读取现有的索引文件
	try {
		const txt = await readTextFileFromRepo(token, owner, repo, indexPath, branch)
		// 若读取到内容，则尝试解析为 JSON 数组
		if (txt) list = JSON.parse(txt)
	} catch {
		// 如果文件不存在或解析失败，则从空数组开始构建索引（忽略错误）
	}

	// 以 slug 为键构建 Map，保证每个 slug 在索引中唯一
	const map = new Map<string, BlogIndexItem>(list.map(i => [i.slug, i]))
	// 将新的或更新的项放入 Map（同 slug 会覆盖旧项）
	map.set(item.slug, item)

	// 从 Map 取值并按日期降序排列（较新的博客排在前面）
	const next = Array.from(map.values()).sort((a, b) =>
		(b.date || '').localeCompare(a.date || '')
	)

	// 将排序后的数组转为格式化 JSON 字符串，再转换为 Base64 编码
	const base64 = toBase64Utf8(JSON.stringify(next, null, 2))
	// 通过 GitHub API 提交更新索引文件
	await putFile(token, owner, repo, indexPath, base64, 'Update blogs index', branch)
}

/**
 * 准备（生成）更新后的博客索引 JSON 字符串（不写入仓库）
 * 
 * 与 `upsertBlogsIndex` 类似，区别在于该函数只返回排序并格式化后的 JSON 字符串，
 * 而不是直接提交到 GitHub。可用于预览或将结果交由其他流程处理。
 * 
 * @param token - GitHub 个人访问令牌
 * @param owner - 仓库所有者
 * @param repo - 仓库名称
 * @param item - 要新增或更新的博客索引项
 * @param branch - 目标分支名称
 * @returns 格式化后的索引 JSON 字符串
 */
export async function prepareBlogsIndex(
	token: string,
	owner: string,
	repo: string,
	item: BlogIndexItem,
	branch: string
): Promise<string> {
	const indexPath = 'public/blogs/index.json'
	let list: BlogIndexItem[] = []

	try {
		const txt = await readTextFileFromRepo(token, owner, repo, indexPath, branch)
		if (txt) list = JSON.parse(txt)
	} catch {
		// 忽略解析错误，从空列表开始
	}

	// 去重并更新指定项
	const map = new Map<string, BlogIndexItem>(list.map(i => [i.slug, i]))
	map.set(item.slug, item)

	// 按日期降序
	const next = Array.from(map.values()).sort((a, b) =>
		(b.date || '').localeCompare(a.date || '')
	)

	// 返回格式化后的 JSON 字符串，不提交到仓库
	return JSON.stringify(next, null, 2)
}

/**
 * 从博客索引中批量移除指定 slug 的条目（不直接提交，返回新索引字符串）
 * 
 * 该函数读取当前的索引，过滤掉需要删除的 slug 对应的项，
 * 然后返回过滤后的 JSON 字符串。由于不执行写操作，调用者可自行决定后续处理。
 * 如果传入的 slugs 数组为空或无有效值，则直接返回原索引的 JSON 字符串。
 * 
 * @param token - GitHub 个人访问令牌
 * @param owner - 仓库所有者
 * @param repo - 仓库名称
 * @param slugs - 要移除的博客 slug 列表
 * @param branch - 目标分支名称
 * @returns 移除指定项后的索引 JSON 字符串
 */
export async function removeBlogsFromIndex(
	token: string,
	owner: string,
	repo: string,
	slugs: string[],
	branch: string
): Promise<string> {
	const indexPath = 'public/blogs/index.json'
	let list: BlogIndexItem[] = []

	try {
		const txt = await readTextFileFromRepo(token, owner, repo, indexPath, branch)
		if (txt) list = JSON.parse(txt)
	} catch {
		// 忽略错误，保留空数组
	}

	// 过滤掉空字符串或无效值，构建要去除的 slug 集合
	const slugSet = new Set(slugs.filter(Boolean))
	// 如果没有需要删除的有效 slug，直接返回原始索引的 JSON 字符串
	if (slugSet.size === 0) {
		return JSON.stringify(list, null, 2)
	}

	// 过滤掉所有在 slugSet 中的条目
	const next = list.filter(item => !slugSet.has(item.slug))
	return JSON.stringify(next, null, 2)
}

/**
 * 从博客索引中移除单个 slug 的便捷方法
 * 
 * 直接调用 `removeBlogsFromIndex`，传入只包含一个 slug 的数组。
 * 
 * @param token - GitHub 个人访问令牌
 * @param owner - 仓库所有者
 * @param repo - 仓库名称
 * @param slug - 要移除的博客 slug
 * @param branch - 目标分支名称
 * @returns 移除该项后的索引 JSON 字符串
 */
export async function removeBlogFromIndex(
	token: string,
	owner: string,
	repo: string,
	slug: string,
	branch: string
): Promise<string> {
	return removeBlogsFromIndex(token, owner, repo, [slug], branch)
}