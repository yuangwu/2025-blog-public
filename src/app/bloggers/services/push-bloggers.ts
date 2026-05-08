import { toBase64Utf8, getRef, createTree, createCommit, updateRef, createBlob, type TreeItem } from '@/lib/github-client'
import { fileToBase64NoPrefix, hashFileSHA256 } from '@/lib/file-utils'
import { getAuthToken } from '@/lib/auth'
import { GITHUB_CONFIG } from '@/consts'
import type { Blogger } from '../grid-view'
import type { AvatarItem } from '../components/avatar-upload-dialog'
import { getFileExt } from '@/lib/utils'
import { toast } from 'sonner'

// 定义推送到 GitHub 的参数类型
export type PushBloggersParams = {
	bloggers: Blogger[]
	avatarItems?: Map<string, AvatarItem>
}

/**
 * 将博主列表和头像推送至 GitHub 仓库的指定分支
 * 流程：获取最新 commit -> 上传新头像文件（如有）-> 更新 list.json -> 创建 tree -> 创建 commit -> 更新分支引用
 */
export async function pushBloggers(params: PushBloggersParams): Promise<void> {
	const { bloggers, avatarItems } = params

	// 获取认证 token（自动从全局认证状态获取）
	const token = await getAuthToken()

	// 获取目标分支的当前最新 commit 信息
	toast.info('正在获取分支信息...')
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha

	const commitMessage = `更新博主列表`

	toast.info('正在准备文件...')

	// 待提交到 Git tree 的新增或修改项
	const treeItems: TreeItem[] = []
	// 记录已上传的头像文件哈希，避免重复上传相同文件
	const uploadedHashes = new Set<string>()
	// 最终要写入的博主数据（含可能更新的头像 URL）
	let updatedBloggers = [...bloggers]

	// 处理头像上传：将需要上传的文件转为 blob 并记录到 tree 中
	if (avatarItems && avatarItems.size > 0) {
		toast.info('正在上传头像...')
		for (const [url, avatarItem] of avatarItems.entries()) {
			// 只处理本地文件类型的头像（非 URL 类型）
			if (avatarItem.type === 'file') {
				// 计算文件哈希（用作文件名，实现内容寻址）
				const hash = avatarItem.hash || (await hashFileSHA256(avatarItem.file))
				const ext = getFileExt(avatarItem.file.name)
				const filename = `${hash}${ext}`
				// 头像在网站上的公开访问路径
				const publicPath = `/images/blogger/${filename}`

				// 若尚未上传过此哈希对应的文件，则创建 Git blob
				if (!uploadedHashes.has(hash)) {
					const path = `public/images/blogger/${filename}`
					// 读取文件并转为不带前缀的 base64 字符串
					const contentBase64 = await fileToBase64NoPrefix(avatarItem.file)
					const blobData = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, contentBase64, 'base64')
					// 将 blob 加入 tree 待提交列表
					treeItems.push({
						path,
						mode: '100644', // 普通文件权限
						type: 'blob',
						sha: blobData.sha
					})
					uploadedHashes.add(hash)
				}

				// 更新博主数据中的头像字段为新的公开路径
				updatedBloggers = updatedBloggers.map(b => (b.url === url ? { ...b, avatar: publicPath } : b))
			}
		}
	}

	// 将更新后的博主列表序列化为 JSON 字符串
	const bloggersJson = JSON.stringify(updatedBloggers, null, '\t')
	// 创建 JSON 文件对应的 Git blob
	const bloggersBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(bloggersJson), 'base64')
	// 将 list.json 的 blob 加入树项
	treeItems.push({
		path: 'src/app/bloggers/list.json',
		mode: '100644',
		type: 'blob',
		sha: bloggersBlob.sha
	})

	// 基于当前的 tree 项和基础 commit 创建一棵新的 Git tree
	toast.info('正在创建文件树...')
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)

	// 基于上面的 tree 创建新 commit
	toast.info('正在创建提交...')
	const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitMessage, treeData.sha, [latestCommitSha])

	// 将分支引用指向新创建的 commit，完成推送
	toast.info('正在更新分支...')
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

	toast.success('发布成功！')
}
