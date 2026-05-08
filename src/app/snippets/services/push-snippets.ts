// 导入 GitHub API 相关的工具函数和类型
import { toBase64Utf8, getRef, createTree, createCommit, updateRef, createBlob, type TreeItem } from '@/lib/github-client'
// 导入用于获取认证 token 的函数
import { getAuthToken } from '@/lib/auth'
// 导入 GitHub 相关配置常量（仓库所有者、仓库名、分支等）
import { GITHUB_CONFIG } from '@/consts'
// 导入 toast 通知库，用于在界面上给出操作反馈
import { toast } from 'sonner'

// 定义推送代码段的参数类型
export type PushSnippetsParams = {
	// 需要推送的代码段数组
	snippets: string[]
}

/**
 * 将代码段数据推送到 GitHub 仓库的 JSON 文件中
 * 该函数会通过 GitHub 的 Git 数据 API 依次完成以下步骤：
 * 1. 获取目标分支的最新 commit SHA
 * 2. 将 snippets 数组序列化为 JSON 并创建 blob 对象
 * 3. 用新的 blob 构建 tree 对象
 * 4. 基于新的 tree 创建 commit
 * 5. 更新分支引用，使新 commit 生效
 */
export async function pushSnippets(params: PushSnippetsParams): Promise<void> {
	const { snippets } = params

	// 获取个人访问令牌
	const token = await getAuthToken()

	// 获取目标分支最新 commit 的 SHA（用于后续创建 tree 的基础）
	toast.info('正在获取分支信息...')
	const refData = await getRef(
		token,
		GITHUB_CONFIG.OWNER,
		GITHUB_CONFIG.REPO,
		`heads/${GITHUB_CONFIG.BRANCH}`
	)
	const latestCommitSha = refData.sha

	// 定义本次 commit 的说明信息
	const commitMessage = `更新句子列表`

	toast.info('正在准备文件...')

	// 用于存放本次变更涉及的 tree 条目
	const treeItems: TreeItem[] = []

	// 将 snippets 数组转为格式化的 JSON 字符串
	const snippetsJson = JSON.stringify(snippets, null, '\t')
	// 以 base64 编码的内容创建 blob 对象
	const snippetsBlob = await createBlob(
		token,
		GITHUB_CONFIG.OWNER,
		GITHUB_CONFIG.REPO,
		toBase64Utf8(snippetsJson),
		'base64'
	)
	// 将新 blob 的 SHA 加入 tree 条目，对应仓库中的目标文件路径
	treeItems.push({
		path: 'src/app/snippets/list.json',
		mode: '100644',      // 普通文件模式
		type: 'blob',
		sha: snippetsBlob.sha
	})

	// 创建新的树对象，以旧 commit 的树为基础，应用 treeItems 中的变更
	toast.info('正在创建文件树...')
	const treeData = await createTree(
		token,
		GITHUB_CONFIG.OWNER,
		GITHUB_CONFIG.REPO,
		treeItems,
		latestCommitSha
	)

	// 基于新创建的树生成一个新的 commit
	toast.info('正在创建提交...')
	const commitData = await createCommit(
		token,
		GITHUB_CONFIG.OWNER,
		GITHUB_CONFIG.REPO,
		commitMessage,
		treeData.sha,
		[latestCommitSha]       // 父 commit 列表
	)

	// 将目标分支的指针更新到新 commit，使改动生效
	toast.info('正在更新分支...')
	await updateRef(
		token,
		GITHUB_CONFIG.OWNER,
		GITHUB_CONFIG.REPO,
		`heads/${GITHUB_CONFIG.BRANCH}`,
		commitData.sha
	)

	// 提示用户操作成功
	toast.success('发布成功！')
}
