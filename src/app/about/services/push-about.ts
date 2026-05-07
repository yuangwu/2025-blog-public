// 从 GitHub 客户端工具库导入必要的函数和类型
import { toBase64Utf8, getRef, createTree, createCommit, updateRef, createBlob, type TreeItem } from '@/lib/github-client'
// 导入获取用户认证 Token 的函数
import { getAuthToken } from '@/lib/auth'
// 导入 GitHub 相关配置（如仓库所有者、仓库名、分支名等）
import { GITHUB_CONFIG } from '@/consts'
// 导入 Sonner 库的 toast 组件，用于显示用户提示
import { toast } from 'sonner'

// 定义“关于页面”的数据结构类型
export type AboutData = {
	title: string       // 页面标题
	description: string // 页面描述
	content: string     // 页面内容
}

/**
 * 将“关于页面”数据推送到 GitHub 仓库的主函数
 * @param data - 包含标题、描述和内容的 AboutData 对象
 */
export async function pushAbout(data: AboutData): Promise<void> {
	// 1. 获取用户的 GitHub 认证 Token
	const token = await getAuthToken()

	// 2. 获取目标分支的最新引用信息（包含最新 Commit 的 SHA）
	toast.info('正在获取分支信息...')
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha // 提取最新 Commit 的 SHA

	// 定义本次提交的信息
	const commitMessage = `更新关于页面`

	toast.info('正在准备文件...')

	// 3. 准备要提交的文件树（Tree）数组
	const treeItems: TreeItem[] = []

	// 将数据对象转换为格式化的 JSON 字符串
	const aboutJson = JSON.stringify(data, null, '\t')
	// 将 JSON 内容转换为 Base64 格式并创建 GitHub Blob（二进制文件对象）
	const aboutBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(aboutJson), 'base64')
	// 将创建好的 Blob 添加到文件树中，指定文件在仓库中的路径
	treeItems.push({
		path: 'src/app/about/list.json', // 文件在仓库中的路径
		mode: '100644',                  // 文件模式：100644 表示普通文件
		type: 'blob',                     // 对象类型：blob（文件）
		sha: aboutBlob.sha                // 该 Blob 对应的 SHA
	})

	// 4. 创建 Git Tree（文件树对象），基于上一次的 Commit
	toast.info('正在创建文件树...')
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)

	// 5. 创建 Git Commit（提交对象），包含提交信息、文件树 SHA 和父 Commit SHA
	toast.info('正在创建提交...')
	const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitMessage, treeData.sha, [latestCommitSha])

	// 6. 更新分支引用（Ref），将分支指向新创建的 Commit
	toast.info('正在更新分支...')
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

	// 7. 提示用户发布成功
	toast.success('发布成功！')
}