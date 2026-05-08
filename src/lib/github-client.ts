// 声明该文件为客户端组件（Next.js App Router），仅在浏览器端执行
'use client'

// 导入 Zustand 认证状态管理钩子，用于处理登录状态
import { useAuthStore } from '@/hooks/use-auth'
// 从 jsrsasign 库导入 JWT 创建和密钥处理工具
import { KJUR, KEYUTIL } from 'jsrsasign'
// 导入 toast 通知库，用于显示错误提示
import { toast } from 'sonner'

// GitHub API 根地址常量
export const GH_API = 'https://api.github.com'

/**
 * 处理 401 未授权错误
 * 清除 sessionStorage 中的认证信息（如果可用）
 */
function handle401Error(): void {
	// 仅在浏览器环境且 sessionStorage 可用时执行
	if (typeof sessionStorage === 'undefined') return
	try {
		// 调用 Zustand store 的 clearAuth 方法，清除内存中的认证状态
		useAuthStore.getState().clearAuth()
	} catch (error) {
		console.error('Failed to clear auth cache:', error)
	}
}

/**
 * 处理 422 验证失败错误
 * 通常由 GitHub 速率限制或操作冲突引发，提示用户放慢操作
 */
function handle422Error(): void {
	toast.error('操作太快了，请操作慢一点')
}

/**
 * 将字符串转换为 Base64 编码的 UTF-8 字符串
 * 使用 encodeURIComponent + unescape 实现 UTF-8 字节编码后再转 Base64
 * @param input 原始字符串
 * @returns Base64 编码后的字符串
 */
export function toBase64Utf8(input: string): string {
	// 先编码为 UTF-8 URI 序列，再用 unescape 将其转换为单字节字符，最终通过 btoa 编码为 Base64
	return btoa(unescape(encodeURIComponent(input)))
}

/**
 * 使用 GitHub App 私钥签发 JWT（JSON Web Token）
 * @param appId GitHub App 的 ID
 * @param privateKeyPem PEM 格式的私钥字符串
 * @returns 签发的 JWT 字符串
 */
export function signAppJwt(appId: string, privateKeyPem: string): string {
	// 获取当前秒级时间戳
	const now = Math.floor(Date.now() / 1000)
	// JWT 头部，指定 RS256 算法和 JWT 类型
	const header = { alg: 'RS256', typ: 'JWT' }
	// JWT 载荷，签发时间设为当前时间前 60 秒（容错），过期时间为 8 分钟后（GitHub 要求最长 10 分钟）
	const payload = { iat: now - 60, exp: now + 8 * 60, iss: appId }
	// 将 PEM 私钥转换为密钥对象
	const prv = KEYUTIL.getKey(privateKeyPem) as unknown as string
	// 签发 JWT，返回完整的 JWT 字符串
	return KJUR.jws.JWS.sign('RS256', JSON.stringify(header), JSON.stringify(payload), prv)
}

/**
 * 根据仓库所有者、名称获取 GitHub App 的安装 ID
 * @param jwt 由 App 私钥签发的 JWT
 * @param owner 仓库拥有者
 * @param repo 仓库名称
 * @returns 安装 ID
 */
export async function getInstallationId(jwt: string, owner: string, repo: string): Promise<number> {
	const res = await fetch(`${GH_API}/repos/${owner}/${repo}/installation`, {
		headers: {
			Authorization: `Bearer ${jwt}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28'
		}
	})
	if (res.status === 401) handle401Error()
	if (res.status === 422) handle422Error()
	if (!res.ok) throw new Error(`installation lookup failed: ${res.status}`)
	const data = await res.json()
	return data.id
}

/**
 * 使用 JWT 和安装 ID 创建临时安装访问令牌
 * @param jwt App 的 JWT
 * @param installationId 安装 ID
 * @returns 返回的安装访问令牌（token 字符串）
 */
export async function createInstallationToken(jwt: string, installationId: number): Promise<string> {
	const res = await fetch(`${GH_API}/app/installations/${installationId}/access_tokens`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${jwt}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28'
		}
	})
	if (res.status === 401) handle401Error()
	if (res.status === 422) handle422Error()
	if (!res.ok) throw new Error(`create token failed: ${res.status}`)
	const data = await res.json()
	return data.token as string
}

/**
 * 获取指定文件在 GitHub 仓库中的 SHA（用于后续更新文件时的冲突检测）
 * @param token 安装访问令牌
 * @param owner 仓库拥有者
 * @param repo 仓库名称
 * @param path 文件路径
 * @param branch 分支名
 * @returns 文件的 SHA 字符串，如果文件不存在则返回 undefined
 */
export async function getFileSha(token: string, owner: string, repo: string, path: string, branch: string): Promise<string | undefined> {
	const res = await fetch(`${GH_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`, {
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28'
		}
	})
	if (res.status === 401) handle401Error()
	if (res.status === 422) handle422Error()
	// 404 表示文件不存在，返回 undefined
	if (res.status === 404) return undefined
	if (!res.ok) throw new Error(`get file sha failed: ${res.status}`)
	const data = await res.json()
	return (data && data.sha) || undefined
}

/**
 * 创建或更新仓库中的单个文件（使用 Content API）
 * @param token 安装访问令牌
 * @param owner 仓库拥有者
 * @param repo 仓库名称
 * @param path 文件路径
 * @param contentBase64 文件内容的 Base64 编码
 * @param message 提交信息
 * @param branch 分支名
 * @returns GitHub API 响应 JSON
 */
export async function putFile(token: string, owner: string, repo: string, path: string, contentBase64: string, message: string, branch: string) {
	// 先获取现有文件的 SHA（如果文件已存在）
	const sha = await getFileSha(token, owner, repo, path, branch)
	const res = await fetch(`${GH_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			'Content-Type': 'application/json'
		},
		// 若文件已存在，必须附带 sha 参数以允许更新；否则创建新文件
		body: JSON.stringify({ message, content: contentBase64, branch, ...(sha ? { sha } : {}) })
	})
	if (res.status === 401) handle401Error()
	if (res.status === 422) handle422Error()
	if (!res.ok) throw new Error(`put file failed: ${res.status}`)
	return res.json()
}

// ---------- 批量提交 API（底层的 Git 数据 API） ----------

/**
 * 获取指定引用的 SHA（如 heads/main）
 * @param token 安装访问令牌
 * @param owner 仓库拥有者
 * @param repo 仓库名称
 * @param ref 引用名，例如 "heads/main" 或 "tags/v1.0"
 * @returns 包含 sha 属性的对象
 */
export async function getRef(token: string, owner: string, repo: string, ref: string): Promise<{ sha: string }> {
	const res = await fetch(`${GH_API}/repos/${owner}/${repo}/git/ref/${encodeURIComponent(ref)}`, {
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28'
		}
	})
	if (res.status === 401) handle401Error()
	if (res.status === 422) handle422Error()
	if (!res.ok) throw new Error(`get ref failed: ${res.status}`)
	const data = await res.json()
	return { sha: data.object.sha }
}

/**
 * 树条目类型定义
 */
export type TreeItem = {
	path: string          // 文件路径
	mode: '100644' | '100755' | '040000' | '160000' | '120000'  // 文件模式
	type: 'blob' | 'tree' | 'commit'   // 对象类型
	content?: string      // 新文件内容（跳过创建 blob）
	sha?: string | null   // 对象的 SHA，可留空由 API 处理
}

/**
 * 创建 Git 树对象
 * @param token 安装访问令牌
 * @param owner 仓库拥有者
 * @param repo 仓库名称
 * @param tree 树条目数组
 * @param baseTree 可选的基础树 SHA（用于增量构建）
 * @returns 新树的 SHA
 */
export async function createTree(token: string, owner: string, repo: string, tree: TreeItem[], baseTree?: string): Promise<{ sha: string }> {
	const res = await fetch(`${GH_API}/repos/${owner}/${repo}/git/trees`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ tree, base_tree: baseTree })
	})
	if (res.status === 401) handle401Error()
	if (res.status === 422) handle422Error()
	if (!res.ok) throw new Error(`create tree failed: ${res.status}`)
	const data = await res.json()
	return { sha: data.sha }
}

/**
 * 创建 Git 提交对象
 * @param token 安装访问令牌
 * @param owner 仓库拥有者
 * @param repo 仓库名称
 * @param message 提交信息
 * @param tree 树 SHA
 * @param parents 父提交 SHA 数组（通常是当前分支顶端提交）
 * @returns 新提交的 SHA
 */
export async function createCommit(token: string, owner: string, repo: string, message: string, tree: string, parents: string[]): Promise<{ sha: string }> {
	const res = await fetch(`${GH_API}/repos/${owner}/${repo}/git/commits`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ message, tree, parents })
	})
	if (res.status === 401) handle401Error()
	if (res.status === 422) handle422Error()
	if (!res.ok) throw new Error(`create commit failed: ${res.status}`)
	const data = await res.json()
	return { sha: data.sha }
}

/**
 * 更新引用（分支或标签）指向新的提交
 * @param token 安装访问令牌
 * @param owner 仓库拥有者
 * @param repo 仓库名称
 * @param ref 引用名，如 "heads/main"
 * @param sha 要指向的提交 SHA
 * @param force 是否强制更新（默认 false）
 */
export async function updateRef(token: string, owner: string, repo: string, ref: string, sha: string, force = false): Promise<void> {
	const res = await fetch(`${GH_API}/repos/${owner}/${repo}/git/refs/${encodeURIComponent(ref)}`, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ sha, force })
	})
	if (res.status === 401) handle401Error()
	if (res.status === 422) handle422Error()
	if (!res.ok) throw new Error(`update ref failed: ${res.status}`)
}

/**
 * 从仓库中读取文本文件内容（自动处理 Base64 解码）
 * @param token 安装访问令牌
 * @param owner 仓库拥有者
 * @param repo 仓库名称
 * @param path 文件路径
 * @param ref 分支/标签/提交 SHA
 * @returns 文件文本内容，若文件不存在返回 null
 */
export async function readTextFileFromRepo(token: string, owner: string, repo: string, path: string, ref: string): Promise<string | null> {
	const res = await fetch(`${GH_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`, {
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28'
		}
	})
	if (res.status === 401) handle401Error()
	if (res.status === 422) handle422Error()
	if (res.status === 404) return null
	if (!res.ok) throw new Error(`read file failed: ${res.status}`)
	const data: any = await res.json()
	// 如果是数组（目录）或无内容，返回 null
	if (Array.isArray(data) || !data.content) return null
	try {
		// 尝试将 Base64 内容解码为 UTF-8 文本
		return decodeURIComponent(escape(atob(data.content)))
	} catch {
		// 如果解码失败（如纯 ASCII），直接返回 atob 结果
		return atob(data.content)
	}
}

/**
 * 递归列出仓库指定目录下的所有文件路径（扁平化列表）
 * @param token 安装访问令牌
 * @param owner 仓库拥有者
 * @param repo 仓库名称
 * @param path 起始目录路径
 * @param ref 分支/标签/提交 SHA
 * @returns 文件路径字符串数组
 */
export async function listRepoFilesRecursive(token: string, owner: string, repo: string, path: string, ref: string): Promise<string[]> {
	// 内部递归函数，获取指定路径下的内容
	async function fetchPath(targetPath: string): Promise<string[]> {
		const res = await fetch(`${GH_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(targetPath)}?ref=${encodeURIComponent(ref)}`, {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: 'application/vnd.github+json',
				'X-GitHub-Api-Version': '2022-11-28'
			}
		})
		if (res.status === 401) handle401Error()
		if (res.status === 422) handle422Error()
		// 路径不存在返回空数组
		if (res.status === 404) return []
		if (!res.ok) throw new Error(`read directory failed: ${res.status}`)
		const data: any = await res.json()
		if (Array.isArray(data)) {
			const files: string[] = []
			for (const item of data) {
				if (item.type === 'file') {
					files.push(item.path)
				} else if (item.type === 'dir') {
					// 递归处理子目录
					const nested = await fetchPath(item.path)
					files.push(...nested)
				}
			}
			return files
		}
		// 单文件或单目录的情况
		if (data?.type === 'file') return [data.path]
		if (data?.type === 'dir') return fetchPath(data.path)
		return []
	}

	return fetchPath(path)
}

/**
 * 创建 Git Blob 对象（用于批量提交）
 * @param token 安装访问令牌
 * @param owner 仓库拥有者
 * @param repo 仓库名称
 * @param content 文件内容
 * @param encoding 编码方式，默认为 'base64'（也可以是 'utf-8'）
 * @returns 新 Blob 的 SHA
 */
export async function createBlob(
	token: string,
	owner: string,
	repo: string,
	content: string,
	encoding: 'utf-8' | 'base64' = 'base64'
): Promise<{ sha: string }> {
	const res = await fetch(`${GH_API}/repos/${owner}/${repo}/git/blobs`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ content, encoding })
	})
	if (res.status === 401) handle401Error()
	if (res.status === 422) handle422Error()
	if (!res.ok) throw new Error(`create blob failed: ${res.status}`)
	const data = await res.json()
	return { sha: data.sha }
}