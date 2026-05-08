import Card from '@/components/card'
import { useCenterStore } from '@/hooks/use-center'
import { useLatestBlog } from '@/hooks/use-blog-index'
import { useConfigStore } from './stores/config-store'
import { CARD_SPACING } from '@/consts'
import dayjs from 'dayjs'
import Link from 'next/link'
import { HomeDraggableLayer } from './home-draggable-layer'

/**
 * 首页的文章卡片组件
 * 展示最新文章，支持圣诞装饰，卡片位置可由配置调整
 */
export default function ArticleCard() {
  // 获取卡片中心参考坐标（通常来自 Hi 卡片的中心位置）
  const center = useCenterStore()

  // 从配置 Store 中获取所有卡片样式配置和站点内容开关
  const { cardStyles, siteContent } = useConfigStore()

  // 获取最新博客数据与加载状态
  const { blog, loading } = useLatestBlog()

  // 当前卡片的样式配置（宽高、偏移、层级等）
  const styles = cardStyles.articleCard

  // Hi 卡片的样式（用于计算默认位置）
  const hiCardStyles = cardStyles.hiCard

  // 社交按钮卡片的样式（同样用于位置计算）
  const socialButtonsStyles = cardStyles.socialButtons

  /**
   * 计算卡片的 X 坐标
   * 优先使用配置中的偏移量 offsetX，否则根据 Hi 卡片宽度和社交按钮卡片宽度自动计算，
   * 使其排列在 Hi 卡片的左侧适当位置。
   */
  const x =
    styles.offsetX !== null
      ? center.x + styles.offsetX
      : center.x +
        hiCardStyles.width / 2 -
        socialButtonsStyles.width -
        CARD_SPACING -
        styles.width

  /**
   * 计算卡片的 Y 坐标
   * 优先使用配置中的偏移量 offsetY，否则自动放在 Hi 卡片的下方，中间有间距
   */
  const y =
    styles.offsetY !== null
      ? center.y + styles.offsetY
      : center.y + hiCardStyles.height / 2 + CARD_SPACING

  return (
    // HomeDraggableLayer 提供可拖拽的容器，方便在调试时移动卡片
    <HomeDraggableLayer
      cardKey='articleCard'
      x={x}
      y={y}
      width={styles.width}
      height={styles.height}
    >
      {/* Card 组件渲染卡片基础样式 */}
      <Card
        order={styles.order}
        width={styles.width}
        height={styles.height}
        x={x}
        y={y}
        className='space-y-2 max-sm:static'
      >
        {/* 如果开启了圣诞装饰，显示装饰图片 */}
        {siteContent.enableChristmas && (
          <>
            <img
              src='/images/christmas/snow-9.webp'
              alt='Christmas decoration'
              className='pointer-events-none absolute'
              style={{ width: 140, left: -12, top: -16, opacity: 0.8 }}
            />
          </>
        )}

        <h2 className='text-secondary text-sm'>最新文章</h2>

        {/* 根据加载状态、数据有无，渲染不同内容 */}
        {loading ? (
          // 加载中状态
          <div className='flex h-[60px] items-center justify-center'>
            <span className='text-secondary text-xs'>加载中...</span>
          </div>
        ) : blog ? (
          // 有文章数据时，渲染文章卡片链接
          <Link
            href={`/blog/${blog.slug}`}
            className='flex transition-opacity hover:opacity-80'
          >
            {/* 文章封面或占位符 */}
            {blog.cover ? (
              <img
                src={blog.cover}
                alt='cover'
                className='mr-3 h-12 w-12 shrink-0 rounded-xl border object-cover'
              />
            ) : (
              <div className='text-secondary mr-3 grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/60'>
                +
              </div>
            )}

            <div className='flex-1'>
              {/* 文章标题，单行截断 */}
              <h3 className='line-clamp-1 text-sm font-medium'>
                {blog.title || blog.slug}
              </h3>

              {/* 文章摘要，最多三行 */}
              {blog.summary && (
                <p className='text-secondary mt-1 line-clamp-3 text-xs'>
                  {blog.summary}
                </p>
              )}

              {/* 文章发布日期，使用 dayjs 格式化 */}
              <p className='text-secondary mt-3 text-xs'>
                {dayjs(blog.date).format('YYYY/M/D')}
              </p>
            </div>
          </Link>
        ) : (
          // 无文章时的空状态提示
          <div className='flex h-[60px] items-center justify-center'>
            <span className='text-secondary text-xs'>暂无文章</span>
          </div>
        )}
      </Card>
    </HomeDraggableLayer>
  )
}
