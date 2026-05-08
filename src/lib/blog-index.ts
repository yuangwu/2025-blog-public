/**
 * 客户端指令，表明该文件中的代码会在浏览器端执行。
 * 该文件提供一系列管理博客索引（index.json）的函数，
 * 用于在 GitHub 仓库中增删改博客索引数据。
 */
'use client'

// 从 github-client 工具模块中导入必要的文件操作函数
import { putFile, toBase64Utf8, readTextFileFromRepo } from '@/lib/github-client'

// 导入博客索引条目的类型定义
import type { BlogIndexItem } from '@/app/blog/types'

// 将类型重导出，方便其他模块引用
export type { BlogIndexItem } from '@/app/blog/types'

/**
 * 更新或插入一条博客索引条目，并将更新后的索引推送到 GitHub 仓库。
 * 
 * @param token - GitHub 个人访问令牌
 * @param owner - 仓库所有者
 * @param repo - 仓库名
 * @param item - 要更新或新增的博客索引项
 * @param branch - 目标分支名
 * @returns Promise<void>
 */
export async function upsertBlogsIndex(
  token: string,
  owner: string,
  repo: string,
  item: BlogIndexItem,
  branch: string
): Promise<void> {
  // 博客索引文件在仓库中的路径
  const indexPath = 'public/blogs/index.json'
  let list: BlogIndexItem[] = []

  try {
    // 尝试读取现有的索引文件内容
    const txt = await readTextFileFromRepo(token, owner, repo, indexPath, branch)
    // 如果存在则解析为数组
    if (txt) list = JSON.parse(txt)
  } catch {
    // 忽略解析错误，如果文件不存在或内容非法，则从空列表开始构建
  }

  // 使用 Map 来保证 slug 唯一性，已有的条目会更新
  const map = new Map<string, BlogIndexItem>(list.map(i => [i.slug, i]))
  map.set(item.slug, item) // 新增或覆盖指定 slug 的条目

  // 按日期降序排序，日期缺失的排到后面
  const next = Array.from(map.values()).sort((a, b) =>
    (b.date || '').localeCompare(a.date || '')
  )

  // 将新索引转为 Base64 编码的 UTF-8 字符串，格式化为易读的 JSON
  const base64 = toBase64Utf8(JSON.stringify(next, null, 2))
  // 提交并推送索引文件到 GitHub
  await putFile(token, owner, repo, indexPath, base64, 'Update blogs index', branch)
}

/**
 * 准备更新后的博客索引内容，但不直接推送。
 * 该函数会基于现有索引合并新条目，并返回新的 JSON 字符串。
 * 
 * @param token - GitHub 个人访问令牌
 * @param owner - 仓库所有者
 * @param repo - 仓库名
 * @param item - 要合并的博客索引项
 * @param branch - 目标分支名
 * @returns 格式化后的 JSON 字符串
 */
export async function prepareBlogsIndex(
  token: string,
  owner: string,
  repo: string,
  item: BlogIndexItem,
  branch: string
): Promise<string> {
  // 索引文件路径
  const indexPath = 'public/blogs/index.json'
  let list: BlogIndexItem[] = []

  try {
    // 读取现有索引
    const txt = await readTextFileFromRepo(token, owner, repo, indexPath, branch)
    if (txt) list = JSON.parse(txt)
  } catch {
    // 忽略读取或解析错误，使用空列表
  }

  // 合并条目，确保 slug 唯一
  const map = new Map<string, BlogIndexItem>(list.map(i => [i.slug, i]))
  map.set(item.slug, item)

  // 按日期降序排列
  const next = Array.from(map.values()).sort((a, b) =>
    (b.date || '').localeCompare(a.date || '')
  )

  // 返回格式化 JSON，不执行实际推送
  return JSON.stringify(next, null, 2)
}

/**
 * 根据 slug 列表批量移除博客索引条目，并返回更新后的索引内容。
 * 该函数仅修改内存中的列表，不直接提交到仓库。
 * 
 * @param token - GitHub 个人访问令牌
 * @param owner - 仓库所有者
 * @param repo - 仓库名
 * @param slugs - 要移除的 slug 数组
 * @param branch - 目标分支名
 * @returns 移除条目后的索引 JSON 字符串
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
    // 尝试读取当前索引
    const txt = await readTextFileFromRepo(token, owner, repo, indexPath, branch)
    if (txt) list = JSON.parse(txt)
  } catch {
    // 忽略错误，保持空列表
  }

  // 构造需要移除的 slug 集合，并过滤掉空字符串
  const slugSet = new Set(slugs.filter(Boolean))
  // 如果没有需要移除的 slug，直接返回原始索引
  if (slugSet.size === 0) {
    return JSON.stringify(list, null, 2)
  }

  // 过滤掉所有匹配的条目
  const next = list.filter(item => !slugSet.has(item.slug))
  return JSON.stringify(next, null, 2)
}

/**
 * 移除单个博客索引条目，是 removeBlogsFromIndex 的包装函数。
 * 
 * @param token - GitHub 个人访问令牌
 * @param owner - 仓库所有者
 * @param repo - 仓库名
 * @param slug - 要移除的博客 slug
 * @param branch - 目标分支名
 * @returns 移除条目后的索引 JSON 字符串
 */
export async function removeBlogFromIndex(
  token: string,
  owner: string,
  repo: string,
  slug: string,
  branch: string
): Promise<string> {
  // 委托给批量删除函数，传入只包含一个 slug 的数组
  return removeBlogsFromIndex(token, owner, repo, [slug], branch)
}
