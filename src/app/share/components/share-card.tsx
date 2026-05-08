// 声明这是一个客户端组件（Next.js App Router），只能在浏览器端渲染
'use client'

// 导入 framer-motion 的 motion 组件，用于实现进入/滚动动画
import { motion } from 'motion/react'
// 导入只读的星级评分展示组件
import StarRating from '@/components/star-rating'
// 导入自定义 hook，用于监听屏幕尺寸（判断是否为小屏幕）
import { useSize } from '@/hooks/use-size'
// 导入工具函数，用于合并 CSS 类名（类似 clsx）
import { cn } from '@/lib/utils'
// 导入可编辑的星级评分组件
import EditableStarRating from '@/components/editable-star-rating'
// 导入 React 的 useState Hook
import { useState } from 'react'
// 导入 Logo 上传/选择对话框组件，以及 LogoItem 类型
import LogoUploadDialog, { type LogoItem } from './logo-upload-dialog'

// 定义分享项的数据结构
export interface Share {
  name: string          // 名称
  logo: string          // Logo 的图片地址
  url: string           // 链接地址
  description: string   // 描述
  tags: string[]        // 标签数组
  stars: number         // 星级评分
}

// ShareCard 组件的 Props 类型
interface ShareCardProps {
  share: Share                      // 要展示的分享数据
  isEditMode?: boolean              // 是否处于编辑模式（显示编辑/删除按钮）
  onUpdate?: (share: Share, oldShare: Share, logoItem?: LogoItem) => void  // 更新回调，携带新旧数据和可能的 logo 对象
  onDelete?: () => void             // 删除回调
}

// 分享卡片主组件
export function ShareCard({ share, isEditMode = false, onUpdate, onDelete }: ShareCardProps) {
  // 描述是否展开（非编辑模式下点击描述切换行数限制）
  const [expanded, setExpanded] = useState(false)
  // 当前是否处于行内编辑状态（点了“编辑”按钮后进入）
  const [isEditing, setIsEditing] = useState(false)
  // 屏幕尺寸信息，maxSM 为 true 表示小屏幕
  const { maxSM } = useSize()
  // 本地维护的分享数据副本，用于编辑时临时修改
  const [localShare, setLocalShare] = useState(share)
  // 控制 Logo 上传对话框的显隐
  const [showLogoDialog, setShowLogoDialog] = useState(false)
  // 保存当前上传/选择的 LogoItem 信息
  const [logoItem, setLogoItem] = useState<LogoItem | null>(null)

  // 修改某个字段的通用处理函数
  const handleFieldChange = (field: keyof Share, value: any) => {
    // 用展开运算创建新的对象，避免直接修改原对象
    const updated = { ...localShare, [field]: value }
    setLocalShare(updated)
    // 调用父组件传入的 onUpdate，通知已发生变化
    onUpdate?.(updated, share, logoItem || undefined)
  }

  // Logo 提交处理：根据上传/选择的 LogoItem 更新 logo 地址
  const handleLogoSubmit = (logo: LogoItem) => {
    setLogoItem(logo)
    // 根据 logo 类型决定最终的展示 URL
    const logoUrl = logo.type === 'url' ? logo.url : logo.previewUrl
    const updated = { ...localShare, logo: logoUrl }
    setLocalShare(updated)
    onUpdate?.(updated, share, logo)
  }

  // 标签编辑处理：将逗号分隔的字符串转为数组
  const handleTagsChange = (tagsStr: string) => {
    const tags = tagsStr
      .split(',')
      .map(t => t.trim())
      .filter(t => t)  // 过滤空字符串
    handleFieldChange('tags', tags)
  }

  // 取消编辑：重置本地数据，关闭编辑状态和 Logo 对话框相关状态
  const handleCancel = () => {
    setLocalShare(share)
    setIsEditing(false)
    setLogoItem(null)
  }

  // 是否允许行内编辑？需要同时满足 isEditMode 和 isEditing 为 true
  const canEdit = isEditMode && isEditing

  return (
    <motion.div
      // 初始状态：透明且缩小到 0.6 倍
      initial={{ opacity: 0, scale: 0.6 }}
      // 根据屏幕尺寸选择不同的动画触发方式：
      // 小屏幕直接用 animate 播放一次；大屏幕当元素进入视口时播放
      {...(maxSM
        ? { animate: { opacity: 1, scale: 1 } }
        : { whileInView: { opacity: 1, scale: 1 } })}
      // 卡片基础样式
      className='card relative block overflow-hidden'
    >
      {/* 编辑模式下的操作按钮区域，绝对定位在右上角 */}
      {isEditMode && (
        <div className='absolute top-3 right-3 z-10 flex gap-2'>
          {isEditing ? (
            // 编辑中状态：显示“取消”和“完成”
            <>
              <button onClick={handleCancel} className='rounded-lg px-2 py-1.5 text-xs text-gray-400 transition-colors hover:text-gray-600'>
                取消
              </button>
              <button onClick={() => setIsEditing(false)} className='rounded-lg px-2 py-1.5 text-xs text-blue-400 transition-colors hover:text-blue-600'>
                完成
              </button>
            </>
          ) : (
            // 未编辑状态：显示“编辑”和“删除”
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

      <div>
        {/* 上部：Logo + 名称 + URL */}
        <div className='mb-4 flex items-center gap-4'>
          {/* Logo 区域，带悬浮遮罩提示“更换” */}
          <div className='group relative'>
            <img
              src={localShare.logo}
              alt={localShare.name}
              className={cn('h-16 w-16 rounded-xl object-cover', canEdit && 'cursor-pointer')}
              // 可编辑时点击打开 Logo 对话框
              onClick={() => canEdit && setShowLogoDialog(true)}
            />
            {/* 悬浮遮罩，仅在可编辑状态下显示（group-hover 触发） */}
            {canEdit && (
              <div className='ev pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
                <span className='text-xs text-white'>更换</span>
              </div>
            )}
          </div>
          {/* 名称与 URL 区域 */}
          <div className='flex-1'>
            {/* 名称：可编辑状态下使用 contentEditable，否则纯文本显示 */}
            <h3
              contentEditable={canEdit}
              suppressContentEditableWarning  // 消除 React 对 contentEditable 的警告
              onBlur={e => handleFieldChange('name', e.currentTarget.textContent || '')}
              className={cn(
                'group-hover:text-brand text-lg font-bold transition-colors focus:outline-none',
                canEdit && 'cursor-text'
              )}
            >
              {localShare.name}
            </h3>
            {/* URL：可编辑状态下用 contentEditable 的 div；非编辑态用 <a> 标签提供跳转 */}
            {canEdit ? (
              <div
                contentEditable
                suppressContentEditableWarning
                onBlur={e => handleFieldChange('url', e.currentTarget.textContent || '')}
                className='text-secondary mt-1 block max-w-[200px] cursor-text truncate text-xs focus:outline-none'
              >
                {localShare.url}
              </div>
            ) : (
              <a
                href={localShare.url}
                target='_blank'
                rel='noopener noreferrer'
                className='text-secondary hover:text-brand mt-1 block max-w-[200px] truncate text-xs hover:underline'
              >
                {localShare.url}
              </a>
            )}
          </div>
        </div>

        {/* 星级评分：编辑态使用可交互组件，否则静态展示 */}
        {canEdit ? (
          <EditableStarRating
            stars={localShare.stars}
            editable={true}
            onChange={stars => handleFieldChange('stars', stars)}
          />
        ) : (
          <StarRating stars={localShare.stars} />
        )}

        {/* 标签列表 */}
        <div className='mt-3 flex flex-wrap gap-1.5'>
          {canEdit ? (
            // 编辑态渲染一个输入框，标签用逗号分隔
            <input
              type='text'
              value={localShare.tags.join(', ')}
              onChange={e => handleTagsChange(e.target.value)}
              placeholder='标签，用逗号分隔'
              className='w-full rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-xs focus:outline-none'
            />
          ) : (
            // 展示态将标签渲染为圆角小标签
            localShare.tags.map(tag => (
              <span key={tag} className='bg-secondary/10 rounded-full px-2.5 py-0.5 text-xs'>
                {tag}
              </span>
            ))
          )}
        </div>

        {/* 描述文本：可编辑时 contentEditable；非编辑态点击切换展开/收起，默认3行截断 */}
        <p
          contentEditable={canEdit}
          suppressContentEditableWarning
          onBlur={e => handleFieldChange('description', e.currentTarget.textContent || '')}
          onClick={e => {
            if (!canEdit) {
              e.preventDefault()
              setExpanded(!expanded)
            }
          }}
          className={cn(
            'mt-3 text-sm leading-relaxed text-gray-600 transition-all duration-300 focus:outline-none',
            canEdit ? 'cursor-text' : 'cursor-pointer',
            // 非编辑态下，根据 expanded 决定是否限制行数
            !canEdit && (expanded ? 'line-clamp-none' : 'line-clamp-3')
          )}
        >
          {localShare.description}
        </p>
      </div>

      {/* Logo 上传/选择对话框，条件渲染 */}
      {canEdit && showLogoDialog && (
        <LogoUploadDialog
          currentLogo={localShare.logo}
          onClose={() => setShowLogoDialog(false)}
          onSubmit={handleLogoSubmit}
        />
      )}
    </motion.div>
  )
}