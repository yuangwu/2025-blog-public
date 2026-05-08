// 定义文件项的联合类型：可以是用户上传的本地文件对象，也可以是外部 URL 链接
export type FileItem = 
  | { type: 'file'; file: File; previewUrl: string; hash?: string } // 本地文件：文件对象、预览地址、可选的哈希值
  | { type: 'url'; url: string } // URL 形式：只记录链接地址

// 艺术作品图片上传集合：键为图片标识（如 slug），值为对应的文件项
export type ArtImageUploads = Record<string, FileItem>

// 背景图片上传集合：键为背景标识，值为对应的文件项
export type BackgroundImageUploads = Record<string, FileItem>

// 社交媒体按钮图片上传集合：键为按钮标识，值为对应的文件项
export type SocialButtonImageUploads = Record<string, FileItem>
