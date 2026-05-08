// 从 GitHub 客户端库导入所需的工具函数和类型
import { toBase64Utf8, getRef, createTree, createCommit, updateRef, createBlob, type TreeItem } from '@/lib/github-client'
// 文件处理工具：将文件转为不含前缀的 Base64，计算文件 SHA256 哈希
import { fileToBase64NoPrefix, hashFileSHA256 } from '@/lib/file-utils'
// 获取认证 token 的函数
import { getAuthToken } from '@/lib/auth'
// GitHub 仓库相关配置（所有者、仓库名、分支等）
import { GITHUB_CONFIG } from '@/consts'
// 分享卡片数据类型
import type { Share } from '../components/share-card'
// 图标上传对话框中的图标项类型
import type { LogoItem } from '../components/logo-upload-dialog'
// 文件扩展名提取工具
import { getFileExt } from '@/lib/utils'
// toast 通知库
import { toast } from 'sonner'

/**
 * pushShares 函数的参数类型
 * @property shares - 需要推送的分享列表
 * @property logoItems - 可选的图标文件映射，键为原始 URL，值为图标项
 */
export type PushSharesParams = {
	shares: Share[]
	logoItems?: Map<string, LogoItem>
}

/**
 * 将分享列表及可能的图标文件推送到 GitHub 仓库
 * 流程：获取最新 commit → 处理图标上传（如有）→ 创建分享列表 JSON blob → 创建树 → 创建提交 → 更新分支引用
 * @param params - 包含 shares 和可选 logoItems 的参数对象
 */
export async function pushShares(params: PushSharesParams): Promise<void> {
	const { shares, logoItems } = params

	// 获取当前用户的 GitHub 认证 token
	const token = await getAuthToken()

	// 获取目标分支的最新 commit SHA，用于后续操作的基础
	toast.info('正在获取分支信息...')
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha

	// 提交信息固定为“更新分享列表”
	const commitMessage = `更新分享列表`

	toast.info('正在准备文件...')

	// 用于构建 Git 树的条目数组
	const treeItems: TreeItem[] = []
	// 记录已经上传的图标文件哈希，避免重复上传
	const uploadedHashes = new Set<string>()
	// 可变的分享列表副本，用于在需要时更新 logo 路径
	let updatedShares = [...shares]

	// 处理图标上传：如果提供了 logoItems，则将其中的文件上传到仓库
	if (logoItems && logoItems.size > 0) {
		toast.info('正在上传图标...')
		for (const [url, logoItem] of logoItems.entries()) {
			// 只处理文件类型的图标项（忽略 URL 等其他类型）
			if (logoItem.type === 'file') {
				// 计算图标文件的 SHA256 哈希（用于去重和命名）
				const hash = logoItem.hash || (await hashFileSHA256(logoItem.file))
				// 获取文件扩展名（含点，如 .png）
				const ext = getFileExt(logoItem.file.name)
				// 组成唯一文件名：哈希值 + 扩展名
				const filename = `${hash}${ext}`
				// 博客中的公共访问路径
				const publicPath = `/images/share/${filename}`

				// 如果该哈希尚未上传，则创建 Git blob 并加入树条目
				if (!uploadedHashes.has(hash)) {
					// 仓库中的文件路径
					const path = `public/images/share/${filename}`
					// 将图标文件转为不含前缀的 Base64 字符串
					const contentBase64 = await fileToBase64NoPrefix(logoItem.file)
					// 创建 Git blob 对象，返回其 SHA
					const blobData = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, contentBase64, 'base64')
					// 添加到树条目中，代表一个要新建或更新的文件
					treeItems.push({
						path,
						mode: '100644', // 普通文件模式
						type: 'blob',
						sha: blobData.sha
					})
					// 记录哈希，避免后续重复上传
					uploadedHashes.add(hash)
				}

				// 更新分享列表中对应项的 logo 字段为新的公共路径
				updatedShares = updatedShares.map(s => (s.url === url ? { ...s, logo: publicPath } : s))
			}
		}
	}

	// 构建分享列表 JSON 字符串（使用制表符缩进）
	const sharesJson = JSON.stringify(updatedShares, null, '\t')
	// 将 JSON 内容转为 Base64 并创建 Git blob
	const sharesBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(sharesJson), 'base64')
	// 将分享列表文件加入树条目
	treeItems.push({
		path: 'src/app/share/list.json', // 仓库中存储分享数据的位置
		mode: '100644',
		type: 'blob',
		sha: sharesBlob.sha
	})

	// 基于收集的树条目创建 Git 树对象，基础树为当前分支最新 commit 的树
	toast.info('正在创建文件树...')
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)

	// 创建新的 commit，父提交为之前的最新 commit
	toast.info('正在创建提交...')
	const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitMessage, treeData.sha, [latestCommitSha])

	// 将分支引用更新到新 commit，完成推送
	toast.info('正在更新分支...')
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

	// 操作成功提示
	toast.success('发布成功！')
}