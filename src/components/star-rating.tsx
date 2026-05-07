/**
 * 星级评分组件
 * 用于展示 1～5 颗星的评分，根据传入的 stars 数量点亮对应数量的星星。
 * @param stars - 亮起的星星数量（范围 0-5）
 */
export default function StarRating({ stars }: { stars: number }) {
  return (
    // 使用 flex 布局让星星水平排列，星星之间保持微小间距
    <div className='flex items-center gap-0.5'>
      {/* 遍历 1 到 5，渲染 5 个星星图标 */}
      {[1, 2, 3, 4, 5].map(index => (
        <StarIcon
          key={index}
          // 当 index 小于等于 stars 时，当前星星为亮星（filled）
          filled={index <= stars}
        />
      ))}
    </div>
  )
}

/**
 * 单个星星图标组件
 * 根据 filled 属性决定星星的填充颜色。
 * @param filled - 是否填充为亮星（true 为亮星，false 为暗星）
 */
function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      // 动态设置星星颜色：亮星为黄色，暗星为灰色
      className={filled ? 'fill-yellow-400' : 'fill-gray-300'}
    >
      {/* 五角星的 SVG 路径 */}
      <path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' />
    </svg>
  )
}