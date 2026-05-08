import Script from 'next/script'

// 该组件用于设置页面的 <head> 信息
export default function Head() {
  return (
    <head>
      {/* 视口设置：宽度为设备宽度，初始缩放 1.0，禁止用户缩放 */}
      <meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' />
      {/* PWA 清单文件 */}
      <link rel='manifest' href='/manifest.json' />

      {/* 网站图标 */}
      <link rel='icon' href='/favicon.png' />

      {/* 预连接 Google 字体 CDN，加快字体加载 */}
      <link rel='preconnect' href='https://fonts.googleapis.cn' />
      <link rel='preconnect' href='https://fonts.gstatic.cn' crossOrigin='anonymous' />

      {/* 加载 Averia Gruesa Libre 字体，display=swap 避免文字闪烁 */}
      <link href='https://fonts.googleapis.cn/css2?family=Averia+Gruesa+Libre&display=swap' rel='stylesheet' />

      {/* Next.js Script 组件加载 Google Analytics gtag.js */}
      <Script src='https://www.googletagmanager.com/gtag/js?id=G-ZNSFR7C9PM' />
      {/* 内联初始化 Google Analytics */}
      <Script id='google-analytics'>
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