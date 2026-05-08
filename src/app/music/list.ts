// 导出一个视频列表数组，每个对象包含视频名称和对应的B站嵌入式播放器iframe代码
export const list = [
	{
		// 视频的名称或标题
		name: '我的悲伤是水做的',
		// 用于嵌入B站视频的iframe标签字符串，包含视频的aid、bvid、cid等参数
		iframe: `<iframe src="//player.bilibili.com/player.html?isOutside=true&aid=115259171935419&bvid=BV1HrJ9zXEvF&cid=32603177515&p=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe>`
	}
]
