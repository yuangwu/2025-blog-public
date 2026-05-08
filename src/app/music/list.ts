/**
 * 导出视频列表配置
 * list 是一个数组，用于存放要展示的视频信息对象
 * 每个对象包含视频的名称和对应的嵌入式播放器代码
 */
export const list = [
	{
		// 视频的显示名称，会作为标题或字幕展示
		name: '我的悲伤是水做的',

		/**
		 * 视频的嵌入式 iframe 代码
		 * 这里直接写入完整的 <iframe> 标签字符串，来自 Bilibili（B站）的外链播放器
		 * 各参数含义：
		 *   src           - B站播放器地址，包含视频 aid、bvid、cid 以及分P信息
		 *   scrolling     - 禁用滚动条（"no"）
		 *   border        - 无边框（"0"）
		 *   frameborder   - 无边框（"no"），保证样式干净
		 *   framespacing  - 无间距（"0"）
		 *   allowfullscreen - 允许全屏播放（"true"）
		 * 
		 * 注意：<iframe> 标签使用模板字符串（反引号）编写，方便直接拼接变量。
		 * 如果你需要换成其他视频，只需要替换 src 中的 aid、bvid、cid 等参数即可。
		 */
		iframe: `<iframe src="//player.bilibili.com/player.html?isOutside=true&aid=115259171935419&bvid=BV1HrJ9zXEvF&cid=32603177515&p=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe>`
	}
]