// 'use client' 指令：表明该文件是一个客户端组件，只在浏览器环境中执行。
// 可以使用 React hooks（如 useState、useEffect）和浏览器 API（如 DOM 操作）。
'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
// cn 是一个工具函数，通常用于合并 CSS 类名（类似 classnames 库）。
import { cn } from '@/lib/utils'
// 颜色选择面板的另一个组件，通过 Portal 弹出。
import { ColorPickerPanel } from './color-picker-panel'

// 组件的 Props 类型定义
interface ColorPickerProps {
  value?: string          // 当前颜色值，默认黑色
  onChange?: (color: string) => void  // 颜色改变时的回调
  className?: string      // 外部传入的额外样式类名
}

export function ColorPicker({ value = '#000000', onChange, className }: ColorPickerProps) {
  // 控制弹出面板的显示/隐藏
  const [open, setOpen] = useState(false)
  // 标记组件是否已在客户端挂载（用于避免 hydration 错误）
  const [mounted, setMounted] = useState(false)
  // 触发器按钮的 ref，用于获取其位置和判断点击外部
  const triggerRef = useRef<HTMLButtonElement>(null)
  // 弹出面板的定位坐标（相对于视口的 fixed 定位）
  const [position, setPosition] = useState({ top: 0, left: 0 })

  // 仅在客户端挂载后设置 mounted 为 true
  useEffect(() => {
    setMounted(true)
  }, [])

  // 当面板打开时，基于触发器按钮计算弹出位置
  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.top - 240,   // 面板出现在按钮上方 240px 处（假设面板高度）
        left: rect.left        // 与按钮左对齐
      })
    }
  }, [open])

  // 处理点击外部关闭面板的逻辑
  useEffect(() => {
    if (!open) return   // 面板关闭时不监听

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      // 如果点击的是触发器按钮本身，不做关闭操作（由按钮的 onClick 切换状态）
      if (triggerRef.current && !triggerRef.current.contains(target)) {
        // 查找弹出的面板 DOM 节点（ColorPickerPanel 内部应带有 data-color-picker-panel 属性）
        const panel = document.querySelector('[data-color-picker-panel]')
        // 如果点击目标不在面板内部，则关闭面板
        if (panel && !panel.contains(target)) {
          setOpen(false)
        }
      }
    }

    // 监听 mousedown 事件（比 click 更早触发，体验更好）
    document.addEventListener('mousedown', handleClickOutside)
    // 清理函数：移除事件监听，防止内存泄漏
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <>
      {/* 触发器按钮：显示当前颜色的方块 */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}   // 点击切换面板开关
        className={cn(
          'h-10 w-10 rounded-lg border-2 border-white/20 shadow-sm transition-all hover:scale-105',
          className   // 允许外部传入自定义样式
        )}
        style={{ backgroundColor: value }}  // 按钮背景设为当前颜色值
      >
        {/* sr-only: 仅供屏幕阅读器使用，视觉上隐藏，提升无障碍性 */}
        <span className="sr-only">Select color</span>
      </button>

      {/* 
        条件渲染弹出面板：
        - mounted 确保只在客户端渲染，避免服务端渲染时 createPortal 报错。
        - open 为 true 时才显示。
        - position.top > 0 是一种简单保护，防止面板定位到视口上方不可见（可根据需要调整）。
      */}
      {mounted &&
        open &&
        position.top > 0 &&
        createPortal(
          // 实际的颜色选择面板组件，传入当前值和回调
          <ColorPickerPanel
            value={value}
            onChange={onChange}
            style={{
              position: 'fixed',   // 固定定位，相对于视口
              top: `${position.top}px`,
              left: `${position.left}px`,
              zIndex: 1000        // 确保面板在最上层
            }}
          />,
          document.body  // 将面板挂载到 body 下，避免受父容器 overflow 等样式影响
        )}
    </>
  )
}