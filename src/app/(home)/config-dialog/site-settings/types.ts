/**
 * 文件项类型 - 支持「本地文件」或「网络URL」两种形式
 * @description 用于统一管理不同来源的文件/图片资源
 */
export type FileItem = 
  | {
      type: 'file';       // 类型标识：本地文件
      file: File;         // 原始文件对象（来自<input type="file">等）
      previewUrl: string; // 本地预览URL（用于前端展示）
      hash?: string;      // 可选：文件哈希值（用于去重、校验等）
    }
  | {
      type: 'url';        // 类型标识：网络URL
      url: string;        // 网络资源地址
    };

/**
 * 艺术图片上传集合
 * @description 以「字符串键-FileItem值」的形式存储多张艺术图片
 * @example { 'cover': FileItem, 'avatar': FileItem }
 */
export type ArtImageUploads = Record<string, FileItem>;

/**
 * 背景图片上传集合
 * @description 以「字符串键-FileItem值」的形式存储多张背景图片
 */
export type BackgroundImageUploads = Record<string, FileItem>;

/**
 * 社交按钮图片上传集合
 * @description 以「字符串键-FileItem值」的形式存储多张社交按钮图片
 */
export type SocialButtonImageUploads = Record<string, FileItem>;