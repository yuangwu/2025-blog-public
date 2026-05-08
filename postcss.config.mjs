// 定义一个配置对象
const config = {
  // plugins 字段用于注册 PostCSS 插件
  plugins: {
    // 使用 @tailwindcss/postcss 插件，并传入空配置（使用默认设置）
    "@tailwindcss/postcss": {},
  },
};

// 将配置对象作为默认导出，供 PostCSS 使用
export default config;