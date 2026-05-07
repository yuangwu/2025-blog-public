// 导入依赖库
import { toast } from 'sonner' // 用于显示用户提示消息（如加载中、成功/失败提示）
import { getAuthToken } from '@/lib/auth' // 获取 GitHub 认证 Token 的工具函数
import { GITHUB_CONFIG } from '@/consts' // GitHub 配置常量（如仓库所有者、仓库名、分支名）
// 导入与 GitHub API 交互的核心方法
import { 
  createBlob,       // 创建文件 blob（二进制大对象）
  createCommit,     // 创建 Git 提交
  createTree,       // 创建 Git 树对象（文件目录结构）
  getRef,           // 获取分支引用（最新 commit SHA）
  listRepoFilesRecursive, // 递归列出仓库中指定路径下的所有文件
  toBase64Utf8,     // 将字符串转换为 Base64 编码
  type TreeItem,    // TypeScript 类型：Git 树项的结构定义
  updateRef         // 更新分支引用（指向新的 commit）
} from '@/lib/github-client'
import { removeBlogsFromIndex } from '@/lib/blog-index' // 从博客索引中移除文章的工具函数

/**
 * 批量删除博客文章的主函数
 * @param slugs - 要删除的文章唯一标识数组（slug 通常是 URL 友好的文章路径）
 */
export async function batchDeleteBlogs(slugs: string[]): Promise<void> {
	// 1. 预处理输入：去重并过滤空值
	const uniqueSlugs = Array.from(new Set(slugs.filter(Boolean)))
	if (uniqueSlugs.length === 0) {
		throw new Error('需要至少选择一篇文章')
	}

	// 2. 获取 GitHub 认证 Token
	const token = await getAuthToken()

	// 3. 获取当前分支的最新提交 SHA
	toast.info('正在获取分支信息...')
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha // 记录最新 commit 的 SHA，后续提交需要基于它

	// 用于存储 Git 树项（即要操作的文件列表）
	const treeItems: TreeItem[] = []

	// 4. 遍历要删除的文章，收集所有相关文件路径
	for (const slug of uniqueSlugs) {
		toast.info(`正在收集 ${slug} 文件...`)
		const basePath = `public/blogs/${slug}` // 文章在仓库中的存储路径
		// 递归获取该文章目录下的所有文件（如 markdown、图片等）
		const files = await listRepoFilesRecursive(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, basePath, GITHUB_CONFIG.BRANCH)

		// 将文件添加到树项列表，sha 设为 null 表示在 Git 树中删除该文件
		for (const path of files) {
			treeItems.push({
				path,
				mode: '100644', // 文件模式（100644 表示普通文件）
				type: 'blob',   // 对象类型（blob 表示文件）
				sha: null       // 关键：设为 null 表示删除该文件
			})
		}
	}

	// 5. 更新博客索引文件（index.json），移除已删文章的元数据
	toast.info('正在更新索引...')
	// 生成新的索引内容（移除指定 slugs）
	const indexJson = await removeBlogsFromIndex(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, uniqueSlugs, GITHUB_CONFIG.BRANCH)
	// 将新索引内容创建为 GitHub blob
	const indexBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(indexJson), 'base64')
	// 将索引文件的更新也添加到树项列表（这里提供了新的 sha，表示更新而非删除）
	treeItems.push({
		path: 'public/blogs/index.json',
		mode: '100644',
		type: 'blob',
		sha: indexBlob.sha // 新 blob 的 SHA，用于更新索引文件
	})

	// 6. 创建 Git 树对象（将文件变更组织成 Git 可识别的结构）
	toast.info('正在创建提交...')
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)
	
	// 生成提交信息（根据删除数量动态调整）
	const commitLabel = uniqueSlugs.length === 1 ? `删除文章: ${uniqueSlugs[0]}` : `批量删除文章: ${uniqueSlugs.join(', ')}`
	
	// 7. 创建 Git 提交
	const commitData = await createCommit(
		token, 
		GITHUB_CONFIG.OWNER, 
		GITHUB_CONFIG.REPO, 
		commitLabel,    // 提交信息
		treeData.sha,   // 新树对象的 SHA
		[latestCommitSha] // 父提交 SHA（基于上一个提交）
	)

	// 8. 更新分支引用，让分支指向新创建的提交
	toast.info('正在更新分支...')
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

	// 9. 提示用户操作成功
	toast.success('删除成功！请等待页面部署后刷新')
}