/**
 * 删除博客文章的异步函数
 * @param slug - 文章的唯一标识符（通常对应目录名）
 * @returns Promise<void> 删除成功时 resolve，否则 reject
 */

import { toast } from 'sonner'
// 导入 toast 通知库，用于在界面上向用户展示操作进度和结果

import { getAuthToken } from '@/lib/auth'
// 获取 GitHub 认证令牌（通常为 OAuth token 或 personal access token）

import { GITHUB_CONFIG } from '@/consts'
// GitHub 配置常量，包含仓库所有者、仓库名、分支名等信息

import {
  createBlob,        // 创建 Git blob 对象（文件内容）
  createCommit,      // 创建 Git commit 对象
  createTree,        // 创建 Git tree 对象（目录结构快照）
  getRef,            // 获取 Git 引用（分支或标签的 SHA）
  listRepoFilesRecursive, // 递归列出仓库指定路径下的所有文件
  toBase64Utf8,      // 将字符串转换为 Base64 编码的 UTF-8 格式
  TreeItem,          // TreeItem 类型定义（文件/目录项）
  updateRef          // 更新 Git 引用（将分支指针移动到新 commit）
} from '@/lib/github-client'
// 从 GitHub 客户端模块导入操作 Git 数据库所需的函数和类型

import { removeBlogFromIndex } from '@/lib/blog-index'
// 从网站索引中删除指定文章，返回更新后的索引内容

export async function deleteBlog(slug: string): Promise<void> {
  // 参数校验：slug 不能为空，否则抛出错误
  if (!slug) throw new Error('需要 slug')

  // 获取已认证的 GitHub 令牌，确保后续 API 调用有权限
  const token = await getAuthToken()

  // 提示用户正在获取分支信息
  toast.info('正在获取分支信息...')

  // 获取目标分支（默认分支）当前指向的引用数据，得到最新 commit 的 SHA
  const refData = await getRef(
    token,
    GITHUB_CONFIG.OWNER,
    GITHUB_CONFIG.REPO,
    `heads/${GITHUB_CONFIG.BRANCH}`
  )
  const latestCommitSha = refData.sha

  // 文章内容的存储基础路径，例如 "public/blogs/my-post"
  const basePath = `public/blogs/${slug}`

  // 提示正在收集所有相关文件
  toast.info('正在收集文章文件...')

  // 递归列出该文章目录下的所有文件（包括 Markdown 和静态资源）
  const files = await listRepoFilesRecursive(
    token,
    GITHUB_CONFIG.OWNER,
    GITHUB_CONFIG.REPO,
    basePath,
    GITHUB_CONFIG.BRANCH
  )

  // 如果未找到任何文件，则认为文章不存在或已被删除
  if (files.length === 0) {
    throw new Error('文章不存在或已删除')
  }

  // 构建 tree 项数组，这些文件将在新 tree 中被标记为待删除（sha 为 null 表示删除该路径）
  const treeItems: TreeItem[] = files.map(path => ({
    path,           // 文件相对于仓库根的路径
    mode: '100644', // 普通文件模式 （100644）
    type: 'blob',   // 类型为 blob（文件）
    sha: null       // sha 设为 null 表示从 tree 中移除此条目（即删除文件）
  }))

  // 提示正在更新索引文件
  toast.info('正在更新索引...')

  // 从索引中移除该文章，得到更新后的索引 JSON 字符串
  const indexJson = await removeBlogFromIndex(
    token,
    GITHUB_CONFIG.OWNER,
    GITHUB_CONFIG.REPO,
    slug,
    GITHUB_CONFIG.BRANCH
  )

  // 为更新后的索引内容创建一个新的 Git blob 对象
  const indexBlob = await createBlob(
    token,
    GITHUB_CONFIG.OWNER,
    GITHUB_CONFIG.REPO,
    toBase64Utf8(indexJson), // 将索引字符串转为 Base64 编码的 UTF-8 格式
    'base64'
  )

  // 将索引文件的更新项添加到 treeItems 中（此处 sha 不为 null，表示更新该文件）
  treeItems.push({
    path: 'public/blogs/index.json',
    mode: '100644',
    type: 'blob',
    sha: indexBlob.sha  // 指向新创建 blob 的 SHA
  })

  // 提示正在创建 Git 提交
  toast.info('正在创建提交...')

  // 基于修改后的 treeItems 创建一个新的 tree 对象，父 tree 为当前最新 commit 的 tree
  const treeData = await createTree(
    token,
    GITHUB_CONFIG.OWNER,
    GITHUB_CONFIG.REPO,
    treeItems,
    latestCommitSha
  )

  // 使用新 tree 创建 commit，提交信息说明删除了哪篇文章，父提交为当前分支的最新 commit
  const commitData = await createCommit(
    token,
    GITHUB_CONFIG.OWNER,
    GITHUB_CONFIG.REPO,
    `删除文章: ${slug}`,
    treeData.sha,
    [latestCommitSha]   // 父提交列表，此处只有一个父提交
  )

  // 提示正在更新分支指针
  toast.info('正在更新分支...')

  // 将分支引用更新为新创建的 commit SHA，完成删除操作
  await updateRef(
    token,
    GITHUB_CONFIG.OWNER,
    GITHUB_CONFIG.REPO,
    `heads/${GITHUB_CONFIG.BRANCH}`,
    commitData.sha
  )

  // 操作成功，提示用户等待部署生效后刷新页面
  toast.success('删除成功！请等待页面部署后刷新')
}