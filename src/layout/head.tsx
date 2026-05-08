import Script from 'next/script'

/**
 * 自定义 Head 组件
 * 用于在页面 <head> 中设置视口、PWA 清单、图标、字体预连接及 Google Analytics 脚本
 *
 * 部署到 Vercel 前请确保：
 * 1. public 目录下存在 manifest.json 与 favicon.png，否则会 404 影响 PWA 和图标显示
 * 2. 环境变量或 Google Analytics ID 如需更换，请替换相应的 gtag ID
 */
export default function Head() {
  return (
    <head>
      {/* 视口设置：宽度自动适配设备，禁止用户缩放 */}
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
      />

      {/* PWA 清单文件，需确保 public/manifest.json 存在 */}
      <link rel="manifest" href="/manifest.json" />

      {/* 网站图标，需确保 public/favicon.png 存在 */}
      <link rel="icon" href="/favicon.png" />

      {/* 预连接到 Google Fonts 的国内镜像源，提升字体加载速度 */}
      <link rel="preconnect" href="https://fonts.googleapis.cn" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.cn"
        crossOrigin="anonymous"
      />

      {/* 加载 Averia Gruesa Libre 字体，使用 display=swap 避免文字阻塞渲染 */}
      <link
        href="https://fonts.googleapis.cn/css2?family=Averia+Gruesa+Libre&display=swap"
        rel="stylesheet"
      />

      {/* 加载 Google Analytics（gtag）基础脚本 */}
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-ZNSFR7C9PM" />

      {/* 初始化 gtag 并发送 page_view 事件 */}
      <Script id="google-analytics">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', 'G-ZNSFR7C9PM');
        `}
      </Script>
    </head>
  )
}
