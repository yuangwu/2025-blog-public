// 从 sonner 库导入 toast 通知函数，用于在界面上显示操作提示
import { toast } from 'sonner'
// 从认证模块获取用于 GitHub API 请求的 token
import { getAuthToken } from '@/lib/auth'
// 导入 GitHub 相关配置常量（OWNER, REPO, BRANCH 等）
import { GITHUB_CONFIG } from '@/consts'
// 导入一系列与 GitHub API 交互的工具函数和类型
import {
  createBlob,        // 创建 Git blob 对象
  createCommit,      // 创建提交
  createTree,        // 创建树对象
  getRef,            // 获取分支引用
  listRepoFilesRecursive, // 递归列出仓库目录中的文件
  toBase64Utf8,      // 将 UTF-8 字符串转为 Base64 编码
  TreeItem,          // 树项类型定义
  updateRef          // 更新分支引用指向新的提交
} from '@/lib/github-client'
// 导入从博客索引文件中移除指定博客条目的函数
import { removeBlogFromIndex } from '@/lib/blog-index'

/**
 * 删除指定 slug 对应的博客文章
 * @param slug 博客的唯一标识字符串，用于定位文章目录及索引条目
 */
export async function deleteBlog(slug: string): Promise<void> {
  // 如果 slug 为空则直接抛出错误，防止无效操作
  if (!slug) throw new Error('需要 slug')

  // 获取已认证的 GitHub token
  const token = await getAuthToken()

  // 提示用户正在获取分支信息
  toast.info('正在获取分支信息...')
  // 获取目标分支的最新引用，其中包含最新提交的 SHA
  const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
  const latestCommitSha = refData.sha

  // 博客文章存放的基础路径
  const basePath = `public/blogs/${slug}`

  // 提示用户正在收集要删除的文章文件列表
  toast.info('正在收集文章文件...')
  // 递归获取 basePath 下的所有文件路径
  const files = await listRepoFilesRecursive(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, basePath, GITHUB_CONFIG.BRANCH)
  // 如果没有找到任何文件，说明文章不存在或已被删除
  if (files.length === 0) {
    throw new Error('文章不存在或已删除')
  }

  // 将收集到的文件路径转换为树项，模式为普通文件，sha 先设为 null（表示删除）
  const treeItems: TreeItem[] = files.map(path => ({
    path,
    mode: '100644',
    type: 'blob',
    sha: null // null 表示从树中移除该文件
  }))

  // 提示用户正在更新博客索引
  toast.info('正在更新索引...')
  // 从索引文件中删除对应 slug 的条目，并返回更新后的索引 JSON 内容
  const indexJson = await removeBlogFromIndex(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, slug, GITHUB_CONFIG.BRANCH)
  // 将更新后的索引内容创建为一个新的 Git blob
  const indexBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(indexJson), 'base64')
  // 将索引文件的树项（使用新 blob 的 sha）添加到树项列表中
  treeItems.push({
    path: 'public/blogs/index.json',
    mode: '100644',
    type: 'blob',
    sha: indexBlob.sha // 使用新 blob 的 SHA 表示更新该文件
  })

  // 提示用户正在创建 Git 提交
  toast.info('正在创建提交...')
  // 基于树项列表创建新的树对象，父提交为当前分支最新提交
  const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)
  // 创建一条提交，消息注明删除的文章 slug，并关联新创建的树
  const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `删除文章: ${slug}`, treeData.sha, [latestCommitSha])

  // 提示用户正在更新远程分支引用
  toast.info('正在更新分支...')
  // 将分支引用更新到新提交，完成删除操作
  await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

  // 提示删除成功，提醒用户等待部署后刷新页面
  toast.success('删除成功！请等待页面部署后刷新')
}
