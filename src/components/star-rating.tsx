// 星级评分组件：展示1-5颗星，根据传入的星星数量高亮对应的星标
// 参数 stars: 需要高亮的星星数量（0-5之间的整数）
export default function StarRating({ stars }: { stars: number }) {
  return (
    // 横向排列，星标之间间距较小
    <div className='flex items-center gap-0.5'>
      {/*
        生成5个星标，索引从1到5
        index <= stars 时星标填充为黄色，否则为灰色
      */}
      {[1, 2, 3, 4, 5].map(index => (
        <StarIcon key={index} filled={index <= stars} />
      ))}
    </div>
  )
}

// 单个星标图标组件
// 参数 filled: 是否填充（高亮）星标
function StarIcon({ filled }: { filled: boolean }) {
  return (
    // SVG 星形图标，尺寸 16x16，视野框 24x24
    // 根据 filled 决定填充色：黄色（高亮）或灰色（未高亮）
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      className={filled ? 'fill-yellow-400' : 'fill-gray-300'}
    >
      {/* 标准五角星路径 */}
      <path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' />
    </svg>
  )
}
