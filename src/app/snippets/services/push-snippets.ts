// 导入 GitHub API 交互所需的工具函数和类型
import { toBase64Utf8, getRef, createTree, createCommit, updateRef, createBlob, type TreeItem } from '@/lib/github-client'
// 获取认证 token（通常从本地存储或环境变量中取得）
import { getAuthToken } from '@/lib/auth'
// GitHub 仓库配置常量（例如 owner、repo、branch 等）
import { GITHUB_CONFIG } from '@/consts'
// 用于显示提示消息的轻量级 toast 库
import { toast } from 'sonner'

/**
 * pushSnippets 函数的参数类型
 * @property snippets - 待推送的句子（或条目）字符串数组
 */
export type PushSnippetsParams = {
	snippets: string[]
}

/**
 * 将一组句子片段以 JSON 文件的形式推送到 GitHub 仓库
 * @param params - 包含 snippets 数组的参数对象
 */
export async function pushSnippets(params: PushSnippetsParams): Promise<void> {
	// 解构获取 snippets 列表
	const { snippets } = params

	// 获取 GitHub 个人访问令牌
	const token = await getAuthToken()

	// 第一步：获取目标分支的最新引用信息
	toast.info('正在获取分支信息...')
	const refData = await getRef(
		token,
		GITHUB_CONFIG.OWNER,
		GITHUB_CONFIG.REPO,
		`heads/${GITHUB_CONFIG.BRANCH}`
	)
	// 提取最新的 commit SHA，之后的新 commit 将以此为父提交
	const latestCommitSha = refData.sha

	// 设定提交信息
	const commitMessage = `更新句子列表`

	// 第二步：准备要包含在新树中的文件项
	toast.info('正在准备文件...')

	// treeItems 数组用于描述仓库中文件的变更
	const treeItems: TreeItem[] = []

	// 将 snippets 数组序列化为带有缩进的 JSON 字符串
	const snippetsJson = JSON.stringify(snippets, null, '\t')
	// 将 JSON 内容以 base64 编码后创建 Git Blob 对象
	const snippetsBlob = await createBlob(
		token,
		GITHUB_CONFIG.OWNER,
		GITHUB_CONFIG.REPO,
		toBase64Utf8(snippetsJson), // 将字符串转为 base64 编码
		'base64'
	)
	// 向树中添加一个文件项，路径指向目标文件
	treeItems.push({
		path: 'src/app/snippets/list.json', // 文件在仓库中的路径
		mode: '100644',                     // 文件模式：普通文件
		type: 'blob',                       // 类型为 blob（文件）
		sha: snippetsBlob.sha               // 关联刚创建的 blob 的 SHA
	})

	// 第三步：使用这些文件项创建一个新的 Git 树对象
	toast.info('正在创建文件树...')
	const treeData = await createTree(
		token,
		GITHUB_CONFIG.OWNER,
		GITHUB_CONFIG.REPO,
		treeItems,
		latestCommitSha // 基于当前最新提交创建树
	)

	// 第四步：基于新树创建一次提交
	toast.info('正在创建提交...')
	const commitData = await createCommit(
		token,
		GITHUB_CONFIG.OWNER,
		GITHUB_CONFIG.REPO,
		commitMessage,      // 提交信息
		treeData.sha,       // 新树 SHA
		[latestCommitSha]   // 父提交列表（通常为当前分支 HEAD）
	)

	// 第五步：将分支引用更新到新提交
	toast.info('正在更新分支...')
	await updateRef(
		token,
		GITHUB_CONFIG.OWNER,
		GITHUB_CONFIG.REPO,
		`heads/${GITHUB_CONFIG.BRANCH}`, // 分支引用完整名称
		commitData.sha                   // 让分支指向新提交
	)

	// 全部成功后提示用户
	toast.success('发布成功！')
}