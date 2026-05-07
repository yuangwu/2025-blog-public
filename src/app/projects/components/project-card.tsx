'use client' // 声明该文件只在客户端运行，可以使用浏览器 API 和 React 状态

import { useState } from 'react'
import { motion } from 'motion/react'          // 引入动画库 motion
import Link from 'next/link'
import { cn } from '@/lib/utils'              // 工具函数，用于合并 className
import { useSize } from '@/hooks/use-size'   // 自定义 hook，获取屏幕尺寸等响应式信息
import ImageUploadDialog, { type ImageItem } from './image-upload-dialog'

// 定义项目数据接口
export interface Project {
  name: string
  year: number
  description: string
  image: string           // 图片 URL
  url: string             // 项目网址
  tags: string[]          // 标签数组
  github?: string         // 可选 GitHub 链接
  npm?: string            // 可选 npm 链接
}

// 组件属性接口
interface ProjectCardProps {
  project: Project
  isEditMode?: boolean    // 是否处于整体编辑模式（例如从父组件控制）
  onUpdate?: (project: Project, oldProject: Project, imageItem?: ImageItem) => void
  onDelete?: () => void
}

export function ProjectCard({ project, isEditMode = false, onUpdate, onDelete }: ProjectCardProps) {
  // 当前卡片是否处于编辑状态
  const [isEditing, setIsEditing] = useState(false)
  // 响应式判断：是否为小屏幕
  const { maxSM } = useSize()
  // 本地项目数据副本，编辑时修改它
  const [localProject, setLocalProject] = useState(project)
  // 控制图片上传/选择弹窗的显示
  const [showImageDialog, setShowImageDialog] = useState(false)
  // 保存用户选择后的图片项（可能是 URL 或上传的文件预览）
  const [imageItem, setImageItem] = useState<ImageItem | null>(null)

  // 通用字段修改处理：更新本地数据并通知父组件
  const handleFieldChange = (field: keyof Project, value: any) => {
    const updated = { ...localProject, [field]: value }
    setLocalProject(updated)
    // 调用父组件回调，传递新项目、旧项目和当前的图片项（如果需要）
    onUpdate?.(updated, project, imageItem || undefined)
  }

  // 处理图片提交：提取图片 URL 更新到本地，并回调父组件
  const handleImageSubmit = (image: ImageItem) => {
    setImageItem(image)
    // 根据图片项类型获取显示用的 URL
    const imageUrl = image.type === 'url' ? image.url : image.previewUrl
    const updated = { ...localProject, image: imageUrl }
    setLocalProject(updated)
    onUpdate?.(updated, project, image)
  }

  // 标签字符串转数组并更新
  const handleTagsChange = (tagsStr: string) => {
    const tags = tagsStr
      .split(',')
      .map(t => t.trim())
      .filter(t => t)     // 过滤空字符串
    handleFieldChange('tags', tags)
  }

  // 取消编辑：还原原始 project 数据，关闭编辑状态
  const handleCancel = () => {
    setLocalProject(project)
    setIsEditing(false)
    setImageItem(null)
  }

  // 只有外部允许编辑且内部处于编辑状态时，字段才可以编辑
  const canEdit = isEditMode && isEditing

  return (
    <motion.div
      // 初始动画状态
      initial={{ opacity: 0, scale: 0.9 }}
      // 根据屏幕尺寸决定动画触发方式：小屏幕直接 animate，大屏幕用 whileInView 滚动触发
      {...(maxSM
        ? { animate: { opacity: 1, scale: 1 } }
        : { whileInView: { opacity: 1, scale: 1 } })}
      className='card relative flex flex-col gap-4'
    >
      {/* 编辑模式下的操作按钮（绝对定位在右上角） */}
      {isEditMode && (
        <div className='absolute top-3 right-3 z-10 flex gap-2'>
          {isEditing ? (
            <>
              <button onClick={handleCancel} className='rounded-lg px-2 py-1.5 text-xs text-gray-400 transition-colors hover:text-gray-600'>
                取消
              </button>
              <button onClick={() => setIsEditing(false)} className='rounded-lg px-2 py-1.5 text-xs text-blue-400 transition-colors hover:text-blue-600'>
                完成
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(true)} className='rounded-lg px-2 py-1.5 text-xs text-blue-400 transition-colors hover:text-blue-600'>
                编辑
              </button>
              <button onClick={onDelete} className='rounded-lg px-2 py-1.5 text-xs text-red-400 transition-colors hover:text-red-600'>
                删除
              </button>
            </>
          )}
        </div>
      )}

      {/* 上部区域：图片 + 标题/年份/标签 */}
      <div className='flex items-start gap-4'>
        {/* 图片容器，包含可编辑时的悬停遮罩 */}
        <div className='group relative'>
          <img
            src={localProject.image}
            alt={localProject.name}
            className={cn('h-16 w-16 shrink-0 rounded-xl object-cover', canEdit && 'cursor-pointer')}
            onClick={() => canEdit && setShowImageDialog(true)}
          />
          {/* 编辑状态下鼠标悬停显示“更换”提示 */}
          {canEdit && (
            <div className='pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
              <span className='text-xs text-white'>更换</span>
            </div>
          )}
        </div>

        {/* 右侧信息：标题、年份、标签 */}
        <div className='flex-1'>
          <div className='flex items-center gap-2'>
            {/* 项目名称：编辑状态下可编辑，否则只读 */}
            <h3
              contentEditable={canEdit}
              suppressContentEditableWarning
              onBlur={e => handleFieldChange('name', e.currentTarget.textContent || '')}
              className={cn('text-lg font-semibold', canEdit && 'cursor-text focus:outline-none')}
            >
              {localProject.name}
            </h3>

            {/* 年份：编辑状态下显示数字输入框，否则只显示文本 */}
            {canEdit ? (
              <input
                type='number'
                value={localProject.year}
                onChange={e => handleFieldChange('year', parseInt(e.target.value) || 0)}
                className='text-secondary border-secondary/20 w-18 rounded border px-2 py-1 text-sm focus:outline-none'
              />
            ) : (
              <span className='text-secondary text-sm'>{localProject.year}</span>
            )}
          </div>

          {/* 标签区域 */}
          <div className='mt-2 flex flex-wrap gap-2'>
            {canEdit ? (
              // 编辑时用一个输入框，逗号分隔标签
              <input
                type='text'
                value={localProject.tags.join(', ')}
                onChange={e => handleTagsChange(e.target.value)}
                placeholder='标签，用逗号分隔'
                className='bg-secondary/10 border-secondary/20 w-full rounded-lg border px-2 py-1 text-xs focus:outline-none'
              />
            ) : (
              // 非编辑时逐个显示标签
              localProject.tags.map(tag => (
                <span key={tag} className='text-secondary bg-card rounded-lg px-2 py-1 text-xs'>
                  {tag}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 项目描述，同样支持可编辑 */}
      <p
        contentEditable={canEdit}
        suppressContentEditableWarning
        onBlur={e => handleFieldChange('description', e.currentTarget.textContent || '')}
        className={cn('text-secondary text-sm leading-relaxed', canEdit && 'cursor-text focus:outline-none')}
      >
        {localProject.description}
      </p>

      {/* 底部链接区域：编辑时显示 URL 输入框，否则显示 Link 组件 */}
      <div className='flex flex-wrap gap-2'>
        {canEdit ? (
          <>
            <input
              type='url'
              value={localProject.url}
              onChange={e => handleFieldChange('url', e.target.value)}
              placeholder='网站 URL'
              className='bg-secondary/10 border-secondary/20 flex-1 rounded-lg border px-3 py-1.5 text-sm focus:outline-none'
            />
            <input
              type='url'
              value={localProject.github || ''}
              onChange={e => handleFieldChange('github', e.target.value || undefined)}
              placeholder='GitHub URL（可选）'
              className='bg-secondary/10 border-secondary/20 flex-1 rounded-lg border px-3 py-1.5 text-sm focus:outline-none'
            />
            <input
              type='url'
              value={localProject.npm || ''}
              onChange={e => handleFieldChange('npm', e.target.value || undefined)}
              placeholder='NPM URL（可选）'
              className='bg-secondary/10 border-secondary/20 flex-1 rounded-lg border px-3 py-1.5 text-sm focus:outline-none'
            />
          </>
        ) : (
          <>
            {/* 网站链接 */}
            <Link
              href={localProject.url}
              target='_blank'
              rel='noopener noreferrer'
              className='bg-card hover:bg-bg rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors'
            >
              Website
            </Link>
            {/* GitHub 链接（如果有） */}
            {localProject.github && (
              <Link
                href={localProject.github}
                target='_blank'
                rel='noopener noreferrer'
                className='bg-card hover:bg-bg rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors'
              >
                GitHub
              </Link>
            )}
            {/* npm 链接（如果有） */}
            {localProject.npm && (
              <Link
                href={localProject.npm}
                target='_blank'
                rel='noopener noreferrer'
                className='bg-card hover:bg-bg rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors'
              >
                NPM
              </Link>
            )}
          </>
        )}
      </div>

      {/* 图片上传/选择弹窗，仅在编辑状态且触发时显示 */}
      {canEdit && showImageDialog && (
        <ImageUploadDialog
          currentImage={localProject.image}
          onClose={() => setShowImageDialog(false)}
          onSubmit={handleImageSubmit}
        />
      )}
    </motion.div>
  )
}