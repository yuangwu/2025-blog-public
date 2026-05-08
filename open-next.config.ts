// open-next.config.ts — OpenNext 框架的 Cloudflare 适配器配置文件
// 该文件告诉 OpenNext 如何为 Cloudflare Workers 环境构建和部署 Next.js 应用

// 从 @opennextjs/cloudflare 包中导入配置工厂函数
import { defineCloudflareConfig } from '@opennextjs/cloudflare'

// 使用默认配置导出 Cloudflare 适配器配置
// 若需自定义，可在调用时传入选项对象，例如：
// defineCloudflareConfig({
//   mode: 'worker',          // 部署模式：'worker' 或 'pages'
//   kvNamespaces: ['MY_KV'], // 需要绑定的 KV 命名空间
//   d1Databases: ['MY_DB'],  // 需要绑定的 D1 数据库
//   r2Buckets: ['MY_BUCKET'],// 需要绑定的 R2 存储桶
// })
export default defineCloudflareConfig()