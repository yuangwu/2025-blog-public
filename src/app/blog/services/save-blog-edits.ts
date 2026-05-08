// 导入依赖库和模块
import { toast } from 'sonner' // 用于显示用户提示消息的库
import { getAuthToken } from '@/lib/auth' // 获取 GitHub 认证令牌的函数
import { GITHUB_CONFIG } from '@/consts' // GitHub 相关配置（所有者、仓库名、分支等）
import { 
  createBlob,       // 创建 GitHub Blob（文件内容）
  createCommit,     // 创建 GitHub 提交
  createTree,       // 创建 GitHub Git Tree（文件树）
  getRef,           // 获取 GitHub 引用（分支信息）
  listRepoFilesRecursive, // 递归列出仓库文件
  toBase64Utf8,     // 将字符串转换为 Base64 编码
  type TreeItem,    // TreeItem 类型定义
  updateRef         // 更新 GitHub 引用（分支）
} from '@/lib/github-client'
import { removeBlogsFromIndex } from '@/lib/blog-index' // 从博客索引中移除文章的函数

/**
 * 批量删除博客文章的主函数
 * @param slugs - 要删除的博客文章的唯一标识符（slug）数组
 */
export async function batchDeleteBlogs(slugs: string[]): Promise<void> {
	// 1. 预处理输入：去重并过滤掉空值
	const uniqueSlugs = Array.from(new Set(slugs.filter(Boolean)))
	if (uniqueSlugs.length === 0) {
		throw new Error('需要至少选择一篇文章')
	}

	// 2. 获取 GitHub 认证令牌
	const token = await getAuthToken()

	// 3. 获取当前分支的最新提交 SHA
	toast.info('正在获取分支信息...')
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha

	// 4. 准备要在 Git Tree 中进行的更改（删除文件）
	const treeItems: TreeItem[] = []

	for (const slug of uniqueSlugs) {
		toast.info(`正在收集 ${slug} 文件...`)
		const basePath = `public/blogs/${slug}` // 文章文件所在的基础路径
		// 递归获取该文章目录下的所有文件
		const files = await listRepoFilesRecursive(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, basePath, GITHUB_CONFIG.BRANCH)

		// 将这些文件添加到 treeItems 中，sha: null 表示在 Git 中标记为删除
		for (const path of files) {
			treeItems.push({
				path,
				mode: '100644', // 文件模式（普通文件）
				type: 'blob',   // 对象类型（二进制大对象）
				sha: null        // 设为 null 即表示删除该文件
			})
		}
	}

	// 5. 更新博客索引文件 (index.json)
	toast.info('正在更新索引...')
	// 从索引数据中移除指定文章
	const indexJson = await removeBlogsFromIndex(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, uniqueSlugs, GITHUB_CONFIG.BRANCH)
	// 将更新后的索引内容创建为新的 Blob
	const indexBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(indexJson), 'base64')
	// 将索引文件的更新也添加到 treeItems 中
	treeItems.push({
		path: 'public/blogs/index.json',
		mode: '100644',
		type: 'blob',
		sha: indexBlob.sha // 这里是新的 sha，表示更新而非删除
	})

	// 6. 创建 GitHub 提交
	toast.info('正在创建提交...')
	// 基于当前的更改创建新的 Git Tree
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)
	// 生成提交信息
	const commitLabel = uniqueSlugs.length === 1 ? `删除文章: ${uniqueSlugs[0]}` : `批量删除文章: ${uniqueSlugs.join(', ')}`
	// 创建提交对象，关联父提交
	const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitLabel, treeData.sha, [latestCommitSha])

	// 7. 更新分支引用，指向新的提交
	toast.info('正在更新分支...')
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

	// 8. 提示用户操作成功
	toast.success('删除成功！请等待页面部署后刷新')
}