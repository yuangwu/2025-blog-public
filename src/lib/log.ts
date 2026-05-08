// 创建一个美化控制台输出的函数，返回包含多种日志方法的对象
const prettyLog = () => {
  // 工具函数：判断值是否为空白（null、undefined 或空字符串）
  const isEmpty = (value: any) => {
    return value == null || value === undefined || value === ''
  }

  // 核心输出函数：使用样式化コンソール输出带标题和内容的彩色标签
  const prettyPrint = (title: string, text: string, color: string) => {
    console.log(
      `%c ${title} %c ${text} %c`, // 三个占位符对应三段样式
      // 左侧标题样式：填充背景色、边框，圆角只保留左半部分
      `background:${color};border:1px solid ${color}; padding: 1px; border-radius: 2px 0 0 2px; color: #fff;`,
      // 右侧正文样式：边框色继承，左侧圆角去除，字体颜色为主题色
      `border:1px solid ${color}; padding: 1px; border-radius: 0 2px 2px 0; color: ${color};`,
      // 第三个占位符透明背景，用于隔开后续内容
      'background:transparent'
    )
  }

  // 信息级别日志（默认灰色 #909399）
  // 若第二个参数 content 为空，则将 textOrTitle 视为正文，标题默认用 'Info'；
  // 否则将 textOrTitle 作为标题，content 作为正文
  const info = (textOrTitle: string, content = '') => {
    const title = isEmpty(content) ? 'Info' : textOrTitle
    const text = isEmpty(content) ? textOrTitle : content
    prettyPrint(title, text, '#909399')
  }

  // 错误级别日志（红色 #F56C6C）
  const error = (textOrTitle: string, content = '') => {
    const title = isEmpty(content) ? 'Error' : textOrTitle
    const text = isEmpty(content) ? textOrTitle : content
    prettyPrint(title, text, '#F56C6C')
  }

  // 警告级别日志（橙色 #E6A23C）
  const warning = (textOrTitle: string, content = '') => {
    const title = isEmpty(content) ? 'Warning' : textOrTitle
    const text = isEmpty(content) ? textOrTitle : content
    prettyPrint(title, text, '#E6A23C')
  }

  // 成功级别日志（绿色 #67C23A）
  const success = (textOrTitle: string, content = '') => {
    const title = isEmpty(content) ? 'Success ' : textOrTitle
    // 注意这里标题末尾有个空格，保证显示美观
    const text = isEmpty(content) ? textOrTitle : content
    prettyPrint(title, text, '#67C23A')
  }

  // 图片输出函数：在控制台以背景图形式显示一张图片，并可缩放
  const picture = (url: string, scale = 1) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    // 处理跨域图片，避免 canvas 被污染
    img.onload = () => {
      // 图片加载完成后创建 canvas 并绘制，最终通过 data URI 输出
      const c = document.createElement('canvas')
      const ctx = c.getContext('2d')
      if (ctx) {
        // 设置 canvas 尺寸与图片一致
        c.width = img.width
        c.height = img.height
        // 先填充一层红色（无实际作用，仅占位，最终会被图片覆盖）
        ctx.fillStyle = 'red'
        ctx.fillRect(0, 0, c.width, c.height)
        // 将图片绘制到 canvas
        ctx.drawImage(img, 0, 0)
        // 转换为 data URI（PNG 格式）
        const dataUri = c.toDataURL('image/png')

        // 使用 console.log 配合 CSS 将图片设为背景输出
        console.log(
          `%c sup?`,
          // 仅用于占位，实际内容不可见
          `font-size: 1px;
          // 文字极小，不影响背景图显示
           padding: ${Math.floor((img.height * scale) / 2)}px ${Math.floor((img.width * scale) / 2)}px;
           // 用 padding 撑开区域，模拟图片尺寸（宽高各一半对称）
           background-image: url(${dataUri});
           background-repeat: no-repeat;
           background-size: ${img.width * scale}px ${img.height * scale}px;
           // 按比例缩放图片
           color: transparent;
           // 文字透明，仅显示背景
          `
        )
      }
    }
    img.src = url // 开始加载图片
  }

  // 返回包含所有日志方法的对象
  return {
    info,
    error,
    warning,
    success,
    picture,
    table: console.table
    // 直接引用原生 console.table，方便输出表格
  }
}

// 导出默认实例（可直接使用 log.info、log.error 等）
export const log = prettyLog()
