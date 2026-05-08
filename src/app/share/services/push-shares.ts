// 导入 GitHub API 相关方法：用于 Base64 转换、获取分支引用、创建树、创建提交、更新引用、创建 Blob，以及 TreeItem 类型
import { toBase64Utf8, getRef, createTree, createCommit, updateRef, createBlob, type TreeItem } from '@/lib/github-client'
// 导入文件处理工具：将文件转为无前缀 Base64、计算文件 SHA256 哈希
import { fileToBase64NoPrefix, hashFileSHA256 } from '@/lib/file-utils'
// 导入认证方法：自动从全局状态获取 GitHub Token
import { getAuthToken } from '@/lib/auth'
// 导入 GitHub 配置常量（如仓库 owner、repo、分支名等）
import { GITHUB_CONFIG } from '@/consts'
// 导入数据类型：分享卡片项 Share 和 logo 上传项 LogoItem
import type { Share } from '../components/share-card'
import type { LogoItem } from '../components/logo-upload-dialog'
// 导入工具函数：从文件名获取扩展名
import { getFileExt } from '@/lib/utils'
// 导入 Sonner 轻量级 toast 通知库（注意：该函数依赖浏览器环境，请确保在客户端组件或客户端事件中调用）
import { toast } from 'sonner'

// pushShares 函数的参数类型
export type PushSharesParams = {
	shares: Share[] // 要推送的分享数组
	logoItems?: Map<string, LogoItem> // 可选，需要上传的 logo 文件映射（URL -> LogoItem）
}

/**
 * 将分享数据与可选的 logo 文件推送到 GitHub 仓库
 * 注意：该函数内部使用了 sonner 的 toast 通知和浏览器文件 API（如 hashFileSHA256、fileToBase64NoPrefix），
 * 请确保在客户端环境（如浏览器事件处理、客户端组件）中调用，否则可能导致运行时错误。
 * 在 Vercel 部署时，如果服务端调用（如 Server Components/Server Actions）会因缺少 DOM/浏览器 API 而失败。
 */
export async function pushShares(params: PushSharesParams): Promise<void> {
	const { shares, logoItems } = params

	// 获取认证 token（会根据当前环境的认证状态自动获取，例如从 cookie 或本地存储中读取）
	const token = await getAuthToken()

	// 提示：开始获取分支最新提交信息
	toast.info('正在获取分支信息...')
	// 获取目标分支的最新引用（返回包含 sha 的对象）
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha

	// 构建本次提交的提交信息
	const commitMessage = `更新分享列表`

	// 提示：准备要提交的文件列表
	toast.info('正在准备文件...')

	// 收集所有要创建的树项（TreeItem）
	const treeItems: TreeItem[] = []
	// 记录已上传过的文件哈希，避免重复上传相同文件
	const uploadedHashes = new Set<string>()
	// 复制一份 shares 用于可能的 logo URL 更新
	let updatedShares = [...shares]

	// 处理 logo 文件上传（如果有）
	if (logoItems && logoItems.size > 0) {
		toast.info('正在上传图标...')
		// 遍历所有需要处理的 logo
		for (const [url, logoItem] of logoItems.entries()) {
			// 仅处理用户上传的新文件（type 为 'file'）
			if (logoItem.type === 'file') {
				// 计算文件哈希（若 LogoItem 中已提供则直接用，否则实时计算）
				const hash = logoItem.hash || (await hashFileSHA256(logoItem.file))
				// 获取原始文件的扩展名，保证最终文件名统一
				const ext = getFileExt(logoItem.file.name)
				const filename = `${hash}${ext}`
				// 构造 logo 在站点上的公开访问路径（假设静态资源放在 public/images/share 目录下）
				const publicPath = `/images/share/${filename}`

				// 如果该文件尚未上传，则创建 Git Blob 并准备加入树
				if (!uploadedHashes.has(hash)) {
					// 注意：GitHub 仓库中对应的路径为 public/images/share/...
					const path = `public/images/share/${filename}`
					// 将文件内容转换为无前缀的 Base64 字符串（GitHub API 要求）
					const contentBase64 = await fileToBase64NoPrefix(logoItem.file)
					// 创建 Blob 对象，返回包含 sha 的数据
					const blobData = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, contentBase64, 'base64')
					// 将新文件添加到树项中（模式 100644 表示普通文件）
					treeItems.push({
						path,
						mode: '100644',
						type: 'blob',
						sha: blobData.sha
					})
					// 标记此哈希已处理
					uploadedHashes.add(hash)
				}

				// 更新对应分享项的 logo URL 为新的公开路径（即使文件是重复的，也要确保引用正确）
				updatedShares = updatedShares.map(s => (s.url === url ? { ...s, logo: publicPath } : s))
			}
		}
	}

	// 将最终的 shares 数组序列化为 JSON 字符串（使用制表符缩进，便于阅读）
	const sharesJson = JSON.stringify(updatedShares, null, '\t')
	// 为 list.json 创建 Blob，内容需要转成 UTF-8 的 Base64 编码
	const sharesBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(sharesJson), 'base64')
	// 将 list.json 加入到树中，注意路径必须与仓库中实际位置一致
	treeItems.push({
		path: 'src/app/share/list.json',
		mode: '100644',
		type: 'blob',
		sha: sharesBlob.sha
	})

	// 提示：创建文件树
	toast.info('正在创建文件树...')
	// 基于当前最新提交和待提交的树项创建 Git 树对象
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)

	// 提示：创建提交
	toast.info('正在创建提交...')
	// 用刚创建的树对象和父提交创建新提交
	const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitMessage, treeData.sha, [latestCommitSha])

	// 提示：更新分支引用，将分支指针指向新提交
	toast.info('正在更新分支...')
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

	// 全部成功，显示成功通知
	toast.success('发布成功！')
}
