/*
 * 模块声明：为所有以 .svg 结尾的导入路径提供类型支持
 * 常用于配合 SVGR 等工具，实现将 SVG 文件直接导入为 React 组件
 */
declare module '*.svg' {
  /**
   * 具名导出 ReactComponent
   * 类型为 React 函数组件，接收标准 <svg> 元素的所有属性（如 width、height、fill 等）
   */
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>
  // 默认导出与 ReactComponent 相同，以便支持以下两种写法：
  // import { ReactComponent } from './icon.svg'
  // import ReactComponent from './icon.svg'
  export default ReactComponent
}

/*
 * 模块声明：为以 .svg?url 结尾的导入路径提供类型支持
 * 此类导入通常用于获取 SVG 文件的 URL 地址，而非组件
 * 常见于 Next.js 等框架的静态资源处理
 */
declare module '*.svg?url' {
  /**
   * 默认导出内容为 StaticImageData 类型
   * 该类型通常包含图像的 src、width、height 等元数据
   * 例如：import logoUrl from './logo.svg?url'
   * 之后可以通过 logoUrl.src 使用图像的路径
   */
  const content: StaticImageData

  export default content
}

// 以下为全局工具类型声明，无需单独导入即可在整个项目中使用

/**
 * 可空数字类型
 * 允许值为字符串、数字或 null
 * 适用于某些场景下数字可能以字符串形式出现（如 API 返回值）
 */
declare type NullableNumber = string | number | null

/**
 * 可空对象类型
 * 表示一个任意键值对的对象，或为 null
 */
declare type NullableObject = Record<string, any> | null

/**
 * 可空数组类型
 * 表示一个元素为对象的数组，或为 null
 */
declare type NullableArray = Record<string, any>[] | null

/**
 * 泛型可空类型工具
 * 将任何类型 T 扩展为 T | null
 * 使用示例：Nullable<User> 等价于 User | null
 */
declare type Nullable<T> = T | null
