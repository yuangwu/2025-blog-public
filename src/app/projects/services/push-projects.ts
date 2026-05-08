// 导入与 GitHub API 交互所需的工具函数和类型
import { toBase64Utf8, getRef, createTree, createCommit, updateRef, createBlob, type TreeItem } from '@/lib/github-client'
// 导入文件处理工具：将文件转为不含前缀的 Base64、计算文件 SHA-256 哈希
import { fileToBase64NoPrefix, hashFileSHA256 } from '@/lib/file-utils'
// 导入认证令牌获取函数（从客户端存储或环境中读取 GitHub Token）
import { getAuthToken } from '@/lib/auth'
// 导入 GitHub 相关配置常量（仓库所有者、仓库名、分支等）
import { GITHUB_CONFIG } from '@/consts'
// 导入项目卡片组件中定义的项目类型
import type { Project } from '../components/project-card'
// 导入图片上传对话框中定义的图片项类型
import type { ImageItem } from '../components/image-upload-dialog'
// 导入通用工具函数：从文件名提取扩展名
import { getFileExt } from '@/lib/utils'
// 导入 toast 通知库，用于在界面显示操作提示
import { toast } from 'sonner'

// 定义推送项目更新所需的参数类型
export type PushProjectsParams = {
	projects: Project[]                      // 要更新的项目数组
	imageItems?: Map<string, ImageItem>      // 可选的图片映射，key 为原图片URL，value 为图片项信息
}

/**
 * 将项目列表和可能的图片推送到 GitHub 仓库
 * 该函数会：
 * 1. 获取目标分支的最新 commit SHA
 * 2. 处理需要上传的新图片（计算哈希、去重、上传为 blob）
 * 3. 更新 project 数据中的图片路径
 * 4. 将最终的 projects JSON 写入 src/app/projects/list.json
 * 5. 创建包含所有变更的 Git tree 和 commit，并更新分支引用
 *
 * @param params - 包含 projects 和可选的 imageItems 的对象
 */
export async function pushProjects(params: PushProjectsParams): Promise<void> {
	const { projects, imageItems } = params

	// 获取认证令牌（通常为 GitHub Personal Access Token）
	const token = await getAuthToken()

	// 提示用户：正在获取分支最新信息
	toast.info('正在获取分支信息...')
	// 查询目标分支的最新引用，获取最新 commit 的 SHA
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha

	// 设置本次提交的 commit message
	const commitMessage = `更新项目列表`

	// 提示用户：正在准备文件
	toast.info('正在准备文件...')

	// 用于构建 Git tree 的文件项集合
	const treeItems: TreeItem[] = []
	// 记录已上传的图片哈希，避免重复上传相同内容的图片
	const uploadedHashes = new Set<string>()
	// 深拷贝 projects，后续可能会修改其中的 image 字段
	let updatedProjects = [...projects]

	// 处理图片上传（如果有需要上传的新图片）
	if (imageItems && imageItems.size > 0) {
		toast.info('正在上传图片...')
		for (const [url, imageItem] of imageItems.entries()) {
			// 仅当图片来源于本地文件时才需要上传（非 URL 类型）
			if (imageItem.type === 'file') {
				// 计算或使用已有的文件内容哈希值
				const hash = imageItem.hash || (await hashFileSHA256(imageItem.file))
				// 获取文件扩展名，构建带有哈希的文件名，确保内容变更时可缓存友好
				const ext = getFileExt(imageItem.file.name)
				const filename = `${hash}${ext}`
				// 图片在网站上的公开访问路径
				const publicPath = `/images/project/${filename}`

				// 如果该哈希值的文件尚未上传，则创建 Git blob 并加入 tree
				if (!uploadedHashes.has(hash)) {
					// 图片在仓库中的实际存储路径（public 目录下）
					const path = `public/images/project/${filename}`
					// 将文件转为不含 data URI 前缀的 Base64 编码
					const contentBase64 = await fileToBase64NoPrefix(imageItem.file)
					// 调用 GitHub API 创建 blob 对象
					const blobData = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, contentBase64, 'base64')
					// 将新的 blob 添加到 tree items 列表中
					treeItems.push({
						path,
						mode: '100644',   // 普通文件模式
						type: 'blob',
						sha: blobData.sha
					})
					// 标记该哈希已上传
					uploadedHashes.add(hash)
				}

				// 将项目数组中对应 url 的项目图片路径更新为新的公开路径
				updatedProjects = updatedProjects.map(p => (p.url === url ? { ...p, image: publicPath } : p))
			}
		}
	}

	// 将更新后的项目数组序列化为带缩进的 JSON 字符串
	const projectsJson = JSON.stringify(updatedProjects, null, '\t')
	// 将 JSON 字符串转为 UTF-8 编码的 Base64（符合 GitHub API 要求）
	const projectsBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(projectsJson), 'base64')
	// 将 project list 文件加入 tree items
	treeItems.push({
		path: 'src/app/projects/list.json',
		mode: '100644',
		type: 'blob',
		sha: projectsBlob.sha
	})

	// 提示用户：正在创建 Git tree 对象
	toast.info('正在创建文件树...')
	// 基于已有的基础 commit 和上述 tree items 创建一棵新 tree
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)

	// 提示用户：正在创建提交
	toast.info('正在创建提交...')
	// 创建 commit，parent 为当前最新 commit
	const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitMessage, treeData.sha, [latestCommitSha])

	// 提示用户：正在更新分支引用
	toast.info('正在更新分支...')
	// 将分支的 HEAD 指针移动到新创建的 commit
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

	// 成功提示
	toast.success('发布成功！')
}
