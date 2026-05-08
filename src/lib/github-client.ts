'use client'

import { useAuthStore } from '@/hooks/use-auth'
import { KJUR, KEYUTIL } from 'jsrsasign'
import { toast } from 'sonner'

// GitHub API 根地址
export const GH_API = 'https://api.github.com'

/**
 * 处理 401 未授权错误
 * 清除 sessionStorage 中的认证信息（仅在 sessionStorage 可用时执行）
 */
function handle401Error(): void {
	// 服务端渲染时 sessionStorage 不存在，直接返回
	if (typeof sessionStorage === 'undefined') return
	try {
		// 通过 useAuthStore 的 getState 方法获取 store 实例并清除认证数据
		useAuthStore.getState().clearAuth()
	} catch (error) {
		console.error('Failed to clear auth cache:', error)
	}
}

/**
 * 处理 422 请求过快错误
 * 弹出错误提示，要求用户放慢操作
 */
function handle422Error(): void {
	toast.error('操作太快了，请操作慢一点')
}

/**
 * 将字符串转换为 Base64 编码的 UTF-8 字节序列
 * 兼容非 ASCII 字符（例如中文）
 * @param input 原始字符串
 * @returns Base64 编码后的字符串
 */
export function toBase64Utf8(input: string): string {
	// 注意：unescape 已弃用，但在浏览器环境下仍可用
	// 先将字符串编码为 URI 组件，再用 unescape 转换成等价的字节序列，最后 btoa 得到 Base64
	return btoa(unescape(encodeURIComponent(input)))
}

/**
 * 使用 GitHub App 的私钥为其生成 JWT（用于后续 API 认证）
 * @param appId GitHub App 的 ID
 * @param privateKeyPem PEM 格式的 RSA 私钥
 * @returns 签名的 JWT 字符串
 */
export function signAppJwt(appId: string, privateKeyPem: string): string {
	const now = Math.floor(Date.now() / 1000)
	// JWT 头部
	const header = { alg: 'RS256', typ: 'JWT' }
	// JWT 载荷：签发时间 60 秒前，有效期 8 分钟，签发者 appId
	const payload = { iat: now - 60, exp: now + 8 * 60, iss: appId }
	// 从 PEM 私钥字符串获取密钥对象（注意：不可将其转为 string，否则签名会失败）
	const prv = KEYUTIL.getKey(privateKeyPem)
	// 使用 RS256 算法对头部和载荷签名
	return KJUR.jws.JWS.sign('RS256', JSON.stringify(header), JSON.stringify(payload), prv)
}

/**
 * 获取指定仓库的 GitHub App 安装 ID
 * @param jwt App 的 JWT
 * @param owner 仓库所有者
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
 * 为指定安装创建安装级别的访问令牌（installation access token）
 * @param jwt App 的 JWT
 * @param installationId 安装 ID
 * @returns 安装访问令牌
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
 * 获取指定文件最近提交的 SHA（用于后续更新时的冲突检测）
 * @param token 安装访问令牌
 * @param owner 仓库所有者
 * @param repo 仓库名称
 * @param path 文件路径
 * @param branch 分支名
 * @returns 文件 SHA，若不存在则返回 undefined
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
	if (res.status === 404) return undefined // 文件不存在
	if (!res.ok) throw new Error(`get file sha failed: ${res.status}`)
	const data = await res.json()
	return (data && data.sha) || undefined
}

/**
 * 创建或更新文件（通过 GitHub Contents API）
 * @param token 安装访问令牌
 * @param owner 仓库所有者
 * @param repo 仓库名称
 * @param path 文件路径
 * @param contentBase64 文件内容（Base64 编码）
 * @param message 提交信息
 * @param branch 分支名
 * @returns 服务器响应的 JSON 对象
 */
export async function putFile(token: string, owner: string, repo: string, path: string, contentBase64: string, message: string, branch: string) {
	// 如果当前存在文件，获取其 SHA 以进行覆盖更新；否则为创建操作
	const sha = await getFileSha(token, owner, repo, path, branch)
	const res = await fetch(`${GH_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			'Content-Type': 'application/json'
		},
		// 若 sha 存在则加入 body，否则只传其余字段
		body: JSON.stringify({ message, content: contentBase64, branch, ...(sha ? { sha } : {}) })
	})
	if (res.status === 401) handle401Error()
	if (res.status === 422) handle422Error()
	if (!res.ok) throw new Error(`put file failed: ${res.status}`)
	return res.json()
}

// ======================
// 批量提交相关 API
// ======================

/**
 * 获取指定引用的对象信息（通常是分支的 HEAD 信息）
 * @param token 安装访问令牌
 * @param owner 仓库所有者
 * @param repo 仓库名称
 * @param ref 引用，如 "heads/main"
 * @returns 包含 SHA 的对象（指向该引用最新的 commit）
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

/** 树对象的条目类型 */
export type TreeItem = {
	path: string
	mode: '100644' | '100755' | '040000' | '160000' | '120000' // 文件/目录 权限模式
	type: 'blob' | 'tree' | 'commit' // 对象类型
	content?: string // 仅当 type 为 blob 时，可以直接提供内容
	sha?: string | null // 对象的 SHA，若提供 content 则可为空
}

/**
 * 在 Git 数据库中创建一棵 tree 对象
 * @param token 安装访问令牌
 * @param owner 仓库所有者
 * @param repo 仓库名称
 * @param tree tree 条目数组，每个条目代表一个文件或子目录
 * @param baseTree 可选的基准树 SHA，通常来自现有 ref 所指向的 commit 的 tree
 * @returns 新创建的 tree 对象的 SHA
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
 * 创建一个 commit 对象
 * @param token 安装访问令牌
 * @param owner 仓库所有者
 * @param repo 仓库名称
 * @param message 提交信息
 * @param tree 新 tree 对象的 SHA
 * @param parents 父提交的 SHA 数组（通常为当前 ref 指向的 commit）
 * @returns 新 commit 对象的 SHA
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
 * 更新引用指向新的 commit SHA（快进或强制更新）
 * @param token 安装访问令牌
 * @param owner 仓库所有者
 * @param repo 仓库名称
 * @param ref 引用，如 "heads/main"
 * @param sha 新 commit 的 SHA
 * @param force 是否强制更新，默认为 false
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
 * 从仓库中读取指定文件的文本内容（自动解码 Base64 或普通文本）
 * @param token 安装访问令牌
 * @param owner 仓库所有者
 * @param repo 仓库名称
 * @param path 文件路径
 * @param ref 分支或标签引用
 * @returns 文件文本内容，若文件不存在则返回 null
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
	// 响应如果是数组（目录）或没有内容字段，返回 null
	if (Array.isArray(data) || !data.content) return null
	try {
		// 尝试进行 UTF-8 解码，兼容中文文件名场景
		return decodeURIComponent(escape(atob(data.content)))
	} catch {
		// 如果解码失败，直接返回原始 base64 解码内容
		return atob(data.content)
	}
}

/**
 * 递归列出仓库指定目录下所有文件的路径
 * @param token 安装访问令牌
 * @param owner 仓库所有者
 * @param repo 仓库名称
 * @param path 目录路径
 * @param ref 分支或标签引用
 * @returns 文件路径字符串数组
 */
export async function listRepoFilesRecursive(token: string, owner: string, repo: string, path: string, ref: string): Promise<string[]> {
	/**
	 * 内部递归函数，用于获取指定路径下的所有文件
	 */
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
		if (res.status === 404) return [] // 路径不存在
		if (!res.ok) throw new Error(`read directory failed: ${res.status}`)
		const data: any = await res.json()
		// 若为数组，说明是目录内容列表
		if (Array.isArray(data)) {
			const files: string[] = []
			for (const item of data) {
				if (item.type === 'file') {
					files.push(item.path)
				} else if (item.type === 'dir') {
					// 递归查询子目录
					const nested = await fetchPath(item.path)
					files.push(...nested)
				}
			}
			return files
		}
		// 单个文件直接返回其路径
		if (data?.type === 'file') return [data.path]
		// 单个目录（极少情况）递归
		if (data?.type === 'dir') return fetchPath(data.path)
		return []
	}

	return fetchPath(path)
}

/**
 * 在 Git 数据库中创建一个 Blob 对象（用于存储文件内容）
 * @param token 安装访问令牌
 * @param owner 仓库所有者
 * @param repo 仓库名称
 * @param content 文件内容
 * @param encoding 编码方式，默认 'base64'
 * @returns 新 blob 对象的 SHA
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
