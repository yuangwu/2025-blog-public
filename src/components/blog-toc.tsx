/**
 * 客户端组件，用于渲染博客文章的目录（Table of Contents）。
 * 使用 IntersectionObserver 监听标题元素可见性，并高亮当前阅读位置。
 */
'use client'

import clsx from 'clsx'
import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'

// 目录项类型
type TocItem = {
  id: string     // 标题元素的 DOM id
  text: string   // 标题文本
  level: number  // 标题级别（1 = h1, 2 = h2 等）
}

// 组件属性
type BlogTocProps = {
  toc: TocItem[]   // 目录数据数组
  delay?: number   // 入场动画延迟（秒）
}

export function BlogToc({ toc, delay = 0 }: BlogTocProps) {
  // 保存所有当前在视口中的标题 id
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set())

  // 计算所有可见标题中，在 toc 数组中位置最靠前的那个 id
  // 用于高亮“最早出现的可见标题”
  const minActiveId = useMemo(() => {
    return Array.from(activeIds)
      .sort(
        (a, b) =>
          toc.findIndex(item => item.id === a) -
          toc.findIndex(item => item.id === b)
      )[0]
  }, [activeIds, toc])

  useEffect(() => {
    if (toc.length === 0) return

    // 存储 observer 实例以便清理
    const observers = new Map<string, IntersectionObserver>()

    // 为每个标题创建 IntersectionObserver
    toc.forEach(item => {
      const element = document.getElementById(item.id)
      if (!element) return

      const observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            setActiveIds(prev => {
              const newSet = new Set(prev)
              if (entry.isIntersecting) {
                // 进入视口：加入集合
                newSet.add(entry.target.id)
              } else {
                // 离开视口：移出集合
                newSet.delete(entry.target.id)
              }
              return newSet
            })
          })
        },
        {
          // 设置根边距，提前/延后触发可视判断
          rootMargin: '-100px 0px -100px 0px',
          threshold: 0, // 任意像素进入即触发
        }
      )

      observer.observe(element)
      observers.set(item.id, observer)
    })

    // 组件卸载或 toc 变化时，断开所有观察器
    return () => {
      observers.forEach(observer => observer.disconnect())
    }
  }, [toc])

  return (
    <motion.div
      // 入场动画：从透明和缩小开始，渐显放大
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="bg-card w-full rounded-xl border p-3 text-sm"
    >
      <h2 className="text-secondary mb-2 font-medium">目录</h2>
      <div className="relative max-h-[300px] space-y-2 overflow-auto">
        {/* 空目录提示 */}
        {toc.length === 0 && <div className="text-secondary">暂无</div>}

        {toc.map(item => (
          <a
            key={item.id + item.level}
            href={`#${item.id}`}
            className={clsx(
              'hover:text-brand relative block pl-3 transition-colors',
              // 当前活动项高亮（使用最早出现的可见标题）
              item.id === minActiveId && 'text-brand'
            )}
            // 根据标题级别增加缩进深度
            style={{ paddingLeft: (item.level - 1) * 8 }}
          >
            {item.text}
          </a>
        ))}
      </div>
    </motion.div>
  )
}