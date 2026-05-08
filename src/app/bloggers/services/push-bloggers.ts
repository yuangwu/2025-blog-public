// 从 github-client 库导入操作 GitHub API 所需的工具函数
import { toBase64Utf8, getRef, createTree, createCommit, updateRef, createBlob, type TreeItem } from '@/lib/github-client'
// 导入文件处理相关的工具函数：将文件转为不含前缀的 base64、计算文件的 SHA-256 哈希
import { fileToBase64NoPrefix, hashFileSHA256 } from '@/lib/file-utils'
// 导入获取认证 token 的函数（会自动从全局认证状态中获取）
import { getAuthToken } from '@/lib/auth'
// 导入 GitHub 相关配置常量（如仓库所有者、仓库名、分支名等）
import { GITHUB_CONFIG } from '@/consts'
// 导入博主数据类型（用于表格视图）
import type { Blogger } from '../grid-view'
// 导入头像上传对话框中的头像项类型
import type { AvatarItem } from '../components/avatar-upload-dialog'
// 导入获取文件扩展名的工具函数
import { getFileExt } from '@/lib/utils'
// 导入 toast 通知组件，用于向用户显示操作状态
import { toast } from 'sonner'

// 定义 pushBloggers 函数的参数类型
export type PushBloggersParams = {
	bloggers: Blogger[]                         // 要推送的博主数组
	avatarItems?: Map<string, AvatarItem>       // 可选的 URL 到头像项的映射，用于上传头像文件
}

/**
 * 将博主列表以及可选的头像文件推送到 GitHub 仓库的指定分支
 * 整个过程包括：获取当前分支引用 -> 上传新头像文件到 public 目录 -> 更新博主列表 JSON -> 创建新的提交并更新分支引用
 * @param params 包含博主列表和头像映射的参数对象
 */
export async function pushBloggers(params: PushBloggersParams): Promise<void> {
	const { bloggers, avatarItems } = params

	// 获取认证 token（自动从全局认证状态获取）
	const token = await getAuthToken()

	// 提示用户正在获取分支信息
	toast.info('正在获取分支信息...')
	// 获取目标分支的最新引用信息，返回包含最新提交 SHA 的对象
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha

	// 设置本次提交的信息
	const commitMessage = `更新博主列表`

	// 提示正在准备文件
	toast.info('正在准备文件...')

	// 用于存储本次提交需要变更的树项（文件）
	const treeItems: TreeItem[] = []
	// 用于记录已经上传的文件哈希，避免重复上传相同内容的头像
	const uploadedHashes = new Set<string>()
	// 复制一份博主列表，后续可能会根据上传的头像更新其中的 avatar 字段
	let updatedBloggers = [...bloggers]

	// ----- 处理头像文件的上传 -----
	if (avatarItems && avatarItems.size > 0) {
		toast.info('正在上传头像...')
		// 遍历每个头像项（key 为原始头像 URL，value 为该头像的详细信息）
		for (const [url, avatarItem] of avatarItems.entries()) {
			// 只处理文件类型的头像（忽略已有的 URL 类型）
			if (avatarItem.type === 'file') {
				// 如果已有哈希值则使用，否则通过文件内容计算 SHA-256 哈希，作为文件名的一部分以保证唯一性
				const hash = avatarItem.hash || (await hashFileSHA256(avatarItem.file))
				// 获取文件的扩展名（如 .png, .jpg）
				const ext = getFileExt(avatarItem.file.name)
				// 组合成最终的文件名：哈希值 + 扩展名
				const filename = `${hash}${ext}`
				// 头像在网站上的公开访问路径
				const publicPath = `/images/blogger/${filename}`

				// 检查该哈希文件是否已经上传过，避免重复创建 blob
				if (!uploadedHashes.has(hash)) {
					// 文件在仓库中的完整路径（相对于仓库根目录）
					const path = `public/images/blogger/${filename}`
					// 将文件内容转换为不含前缀的 base64 编码
					const contentBase64 = await fileToBase64NoPrefix(avatarItem.file)
					// 通过 GitHub API 创建一个 blob 对象，获得该文件内容的 SHA
					const blobData = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, contentBase64, 'base64')
					// 将该文件添加到本次提交的树中（模式 100644 表示普通文件）
					treeItems.push({
						path,
						mode: '100644',
						type: 'blob',
						sha: blobData.sha
					})
					// 记录该哈希已上传
					uploadedHashes.add(hash)
				}

				// 更新博主对象中的头像字段，将其指向新的公开路径
				updatedBloggers = updatedBloggers.map(b => (b.url === url ? { ...b, avatar: publicPath } : b))
			}
		}
	}

	// ----- 创建博主列表 JSON 文件对应的 blob -----
	// 将更新后的博主列表序列化为带缩进的 JSON 字符串
	const bloggersJson = JSON.stringify(updatedBloggers, null, '\t')
	// 将 JSON 字符串转为 UTF-8 编码的 base64
	const bloggersBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(bloggersJson), 'base64')
	// 将博主列表 JSON 文件添加到树中
	treeItems.push({
		path: 'src/app/bloggers/list.json',
		mode: '100644',
		type: 'blob',
		sha: bloggersBlob.sha
	})

	// ----- 创建文件树 -----
	toast.info('正在创建文件树...')
	// 基于当前分支的最新提交，创建一个包含所有变更文件的新树对象
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)

	// ----- 创建提交 -----
	toast.info('正在创建提交...')
	// 用新创建的树和父提交（此处只有一个父提交：原分支最新提交）创建一次新提交
	const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitMessage, treeData.sha, [latestCommitSha])

	// ----- 更新分支引用，将分支指针移动到新提交 -----
	toast.info('正在更新分支...')
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

	// 通知用户操作已成功完成
	toast.success('发布成功！')
}
