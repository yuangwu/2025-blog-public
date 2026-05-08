'use client' // 标记此组件为客户端组件，允许使用浏览器 API 和 React 状态/事件

import { useState } from 'react'
import { DialogModal } from '@/components/dialog-modal' // 引入自定义对话框模态组件，请确保该组件文件存在且正确导出

// 定义组件属性类型
type MarkdownImageProps = {
  src: string    // 图片地址（必填）
  alt?: string   // 图片替代文本
  title?: string // 图片标题
}

/**
 * 可点击放大的轻量图片组件，适用于 Markdown 渲染场景
 * 注意：部署前请确认 @/components/dialog-modal 组件已正确实现，否则会导致编译错误
 */
export function MarkdownImage({ src, alt = '', title = '' }: MarkdownImageProps) {
  const [display, setDisplay] = useState(false) // 控制大图弹窗的显示与隐藏

  return (
    <>
      {/* 缩略图：点击后开启弹窗显示原图，添加懒加载和交互样式 */}
      <img
        src={src}
        alt={alt}
        title={title}
        loading="lazy"
        onClick={() => setDisplay(true)}
        className="cursor-pointer transition-opacity hover:opacity-80"
      />
      
      {/* 大图弹窗：点击遮罩或关闭按钮时关闭，样式去除原有弹窗限制以完整展示图片 */}
      <DialogModal
        open={display}
        onClose={() => setDisplay(false)}
        className="max-w-none bg-transparent p-0"
      >
        <img
          src={src}
          alt={alt}
          className="max-h-[90vh] max-w-full rounded-2xl object-contain"
        />
      </DialogModal>
    </>
  )
}
