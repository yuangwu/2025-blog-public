// 'use client' 是 Next.js App Router 中的客户端组件声明，
// 表示该组件仅在浏览器端渲染，可以使用浏览器 API 和 React Hooks。
'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner' // 轻量级 toast 通知库
import { Plus } from 'lucide-react' // 图标库中的加号图标
import { DialogModal } from '@/components/dialog-modal' // 自定义模态框组件

/**
 * LogoItem 类型：用于统一表示用户上传的图片（文件）或通过 URL 指定的图片。
 * - 当 type 为 'url' 时，只包含 url 字段；
 * - 当 type 为 'file' 时，包含原文件对象、预览地址，以及可选的 hash 值。
 */
export type LogoItem = 
  | { type: 'url'; url: string } 
  | { type: 'file'; file: File; previewUrl: string; hash?: string }

/**
 * LogoUploadDialog 组件的 props 类型定义：
 * - currentLogo：当前已设置的 logo（URL 字符串），用于初始化输入框
 * - onClose：关闭弹窗的回调
 * - onSubmit：提交新 logo 时的回调，参数为 LogoItem 类型
 */
interface LogoUploadDialogProps {
  currentLogo?: string
  onClose: () => void
  onSubmit: (logo: LogoItem) => void
}

/**
 * LogoUploadDialog 组件：提供图片上传和图片 URL 输入两种方式更新 logo。
 * 包含文件预览、URL 输入框、切换逻辑以及表单验证。
 */
export default function LogoUploadDialog({ 
  currentLogo, 
  onClose, 
  onSubmit 
}: LogoUploadDialogProps) {
  // 管理 URL 输入框的内容，初始值为 currentLogo 或空字符串
  const [urlInput, setUrlInput] = useState(currentLogo || '')
  
  // 管理已选取的本地文件及其预览地址，null 表示未选择
  const [previewFile, setPreviewFile] = useState<{ 
    file: File; 
    previewUrl: string 
  } | null>(null)
  
  // 用于隐藏的 file input 元素的引用，点击 UI 区域时触发其点击事件
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * 处理文件选择事件：
   * - 校验文件类型必须为图片，否则弹错误 toast；
   * - 使用 URL.createObjectURL 生成本地预览地址；
   * - 设置 previewFile 并清空 URL 输入框（避免两种方式共存）。
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      return
    }

    // 生成当前文件的临时预览 URL
    const previewUrl = URL.createObjectURL(file)
    setPreviewFile({ file, previewUrl })
    // 选择文件后清空 URL 输入框，表示切换到文件方式
    setUrlInput('')
  }

  /**
   * 表单提交处理：
   * - 如果已选择文件，则构建 type='file' 的 LogoItem 并回调；
   * - 否则如果 URL 输入有有效内容，则构建 type='url' 的 LogoItem 并回调；
   * - 若两者均无，弹出错误提示；
   * - 提交后重置状态并关闭弹窗。
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (previewFile) {
      onSubmit({
        type: 'file',
        file: previewFile.file,
        previewUrl: previewFile.previewUrl,
      })
    } else if (urlInput.trim()) {
      onSubmit({
        type: 'url',
        url: urlInput.trim(),
      })
    } else {
      toast.error('请上传图片或输入 URL')
      return // 停留在弹窗，不关闭
    }

    // 提交成功后清空内部状态
    setPreviewFile(null)
    setUrlInput(currentLogo || '')
    onClose()
  }

  /**
   * 关闭弹窗处理：
   * - 若存在通过 createObjectURL 创建的预览 URL，需手动释放内存；
   * - 重置所有状态；
   * - 调用父组件传入的 onClose。
   */
  const handleClose = () => {
    if (previewFile) {
      URL.revokeObjectURL(previewFile.previewUrl) // 避免内存泄漏
    }
    setPreviewFile(null)
    setUrlInput(currentLogo || '')
    onClose()
  }

  return (
    <DialogModal open onClose={handleClose} className='card w-md'>
      <h2 className='mb-4 text-xl font-bold'>选择图标</h2>
      
      <form onSubmit={handleSubmit} className='space-y-4'>
        {/* ===== 图片上传区域 ===== */}
        <div>
          <label className='text-secondary mb-2 block text-sm font-medium'>
            上传图片
          </label>
          {/* 隐藏的原生文件选择框 */}
          <input 
            ref={fileInputRef} 
            type='file' 
            accept='image/*' 
            className='hidden' 
            onChange={handleFileSelect} 
          />
          {/* 点击区域触发隐藏 input 的点击，实现美观的自定义上传按钮 */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className='mx-auto flex h-32 w-32 cursor-pointer items-center justify-center rounded-xl border border-gray-300 bg-secondary/10 transition-colors hover:bg-gray-200'
          >
            {/* 条件渲染：有预览图则显示预览，否则显示加号图标和提示文字 */}
            {previewFile ? (
              <img 
                src={previewFile.previewUrl} 
                alt='preview' 
                className='h-full w-full rounded-xl object-cover' 
              />
            ) : (
              <div className='text-center'>
                <Plus className='text-secondary mx-auto mb-1 h-8 w-8' />
                <p className='text-secondary text-xs'>点击上传图片</p>
              </div>
            )}
          </div>
        </div>

        {/* ===== 分隔线，带 “或” 字样 ===== */}
        <div className='relative'>
          <div className='absolute inset-0 flex items-center'>
            <div className='w-full border-t border-gray-300'></div>
          </div>
          <div className='relative flex justify-center text-sm'>
            <span className='text-secondary rounded-lg bg-white px-4 py-1'>或</span>
          </div>
        </div>

        {/* ===== 图片 URL 输入区域 ===== */}
        <div>
          <label className='text-secondary mb-2 block text-sm font-medium'>
            图片 URL
          </label>
          <input
            type='url'
            value={urlInput}
            onChange={e => {
              setUrlInput(e.target.value)
              // 当用户开始输入 URL 时，如果已有选择的文件，则清除文件预览
              if (previewFile) {
                URL.revokeObjectURL(previewFile.previewUrl)
                setPreviewFile(null)
              }
            }}
            placeholder='https://example.com/logo.png'
            className='focus:ring-brand w-full rounded-lg border border-gray-300 bg-gray-200 px-4 py-2 focus:ring-2 focus:outline-none'
          />
        </div>

        {/* ===== 操作按钮：确认 / 取消 ===== */}
        <div className='flex gap-3 pt-2'>
          <button 
            type='submit' 
            className='brand-btn flex-1 justify-center rounded-lg px-6 py-2.5'
          >
            确认
          </button>
          <button
            type='button'
            onClick={handleClose}
            className='flex-1 rounded-lg border border-gray-300 bg-white px-6 py-2.5 transition-colors hover:bg-gray-50'
          >
            取消
          </button>
        </div>
      </form>
    </DialogModal>
  )
}