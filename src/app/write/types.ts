/**
 * PublishForm 表示发布文章时提交的表单数据
 */
export type PublishForm = {
  /** 文章的唯一标识符，通常用于生成访问路径 */
  slug: string
  /** 文章标题 */
  title: string
  /** 文章正文，使用 Markdown 格式 */
  md: string
  /** 标签列表 */
  tags: string[]
  /** 发布日期，通常为 ISO 字符串或可读日期格式 */
  date: string
  /** 文章摘要或简短描述 */
  summary: string
  /** 是否隐藏文章（不在列表中显示），可选 */
  hidden?: boolean
  /** 文章所属分类，可选 */
  category?: string
}

/**
 * ImageItem 表示图片项，支持两种来源：
 * 1. 直接使用 URL 链接
 * 2. 本地文件（如待上传的图片文件）
 */
export type ImageItem = 
  | { 
      /** 图片项的唯一标识 */
      id: string
      /** 图片来源类型：URL 链接 */
      type: 'url'
      /** 图片的完整 URL 地址 */
      url: string 
    } 
  | { 
      /** 图片项的唯一标识 */
      id: string
      /** 图片来源类型：本地文件 */
      type: 'file'
      /** 文件对象（如通过文件选择器获取的 File） */
      file: File
      /** 本地预览地址（通常由 URL.createObjectURL 生成） */
      previewUrl: string
      /** 原始文件名 */
      filename: string
      /** 文件内容的哈希值，用于去重或校验，可选 */
      hash?: string 
    }