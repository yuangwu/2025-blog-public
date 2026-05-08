'use client' // 指示该组件在客户端渲染（Next.js App Router 必需）

// 头部组件，当前返回空的 <header> 元素，后续可添加导航栏、Logo 等
export default function Header() {
  return <header></header> // 此处可扩展菜单、用户信息等子组件，但需确保依赖正确引入
}
