/**
 * 创建一个美化控制台输出的工具对象。
 * 包含 info、error、warning、success、picture、table 方法。
 * 注意：picture 方法仅可在浏览器环境中使用，服务端调用会静默退出。
 */
const prettyLog = () => {
	/**
	 * 判断值是否为空（null、undefined 或空字符串）
	 * @param value - 要判断的值
	 * @returns 如果为空则返回 true
	 */
	const isEmpty = (value: any) => {
		return value == null || value === undefined || value === ''
	}

	/**
	 * 以带颜色的样式在控制台输出格式化文本
	 * @param title - 左侧标签文本（如 Info、Error）
	 * @param text - 右侧内容文本
	 * @param color - 主题颜色（十六进制）
	 */
	const prettyPrint = (title: string, text: string, color: string) => {
		console.log(
			`%c ${title} %c ${text} %c`,
			`background:${color};border:1px solid ${color}; padding: 1px; border-radius: 2px 0 0 2px; color: #fff;`,
			`border:1px solid ${color}; padding: 1px; border-radius: 0 2px 2px 0; color: ${color};`,
			'background:transparent'
		)
	}

	/**
	 * 输出信息级别日志（灰色主题）
	 * 可以只提供一个参数作为内容，标题默认为 "Info"
	 * 也可以同时提供标题和内容
	 * @param textOrTitle - 标题或文本内容
	 * @param content - 文本内容（可选，提供后第一个参数作为标题）
	 */
	const info = (textOrTitle: string, content = '') => {
		const title = isEmpty(content) ? 'Info' : textOrTitle
		const text = isEmpty(content) ? textOrTitle : content
		prettyPrint(title, text, '#909399')
	}

	/**
	 * 输出错误级别日志（红色主题）
	 * @param textOrTitle - 标题或文本内容
	 * @param content - 文本内容（可选）
	 */
	const error = (textOrTitle: string, content = '') => {
		const title = isEmpty(content) ? 'Error' : textOrTitle
		const text = isEmpty(content) ? textOrTitle : content
		prettyPrint(title, text, '#F56C6C')
	}

	/**
	 * 输出警告级别日志（橙色主题）
	 * @param textOrTitle - 标题或文本内容
	 * @param content - 文本内容（可选）
	 */
	const warning = (textOrTitle: string, content = '') => {
		const title = isEmpty(content) ? 'Warning' : textOrTitle
		const text = isEmpty(content) ? textOrTitle : content
		prettyPrint(title, text, '#E6A23C')
	}

	/**
	 * 输出成功级别日志（绿色主题）
	 * @param textOrTitle - 标题或文本内容
	 * @param content - 文本内容（可选）
	 */
	const success = (textOrTitle: string, content = '') => {
		const title = isEmpty(content) ? 'Success ' : textOrTitle
		const text = isEmpty(content) ? textOrTitle : content
		prettyPrint(title, text, '#67C23A')
	}

	/**
	 * 在控制台输出一张图片（利用 CSS 背景图）
	 * 注意：该方法依赖浏览器环境（Image、document、Canvas），
	 * 如果在服务端（如 Vercel Serverless 函数）中调用会自动跳过，不会报错。
	 * @param url - 图片地址
	 * @param scale - 缩放比例，默认为 1
	 */
	const picture = (url: string, scale = 1) => {
		// 如果是非浏览器环境（例如 Serverless 运行环境），直接返回，避免 ReferenceError
		if (typeof document === 'undefined' || typeof Image === 'undefined') {
			return
		}

		const img = new Image()
		img.crossOrigin = 'anonymous' // 处理跨域图片，避免 canvas 被污染
		img.onload = () => {
			const c = document.createElement('canvas')
			const ctx = c.getContext('2d')
			if (ctx) {
				c.width = img.width
				c.height = img.height
				ctx.fillStyle = 'red'
				ctx.fillRect(0, 0, c.width, c.height)
				ctx.drawImage(img, 0, 0)
				const dataUri = c.toDataURL('image/png')

				console.log(
					`%c sup?`,
					`font-size: 1px;
                  padding: ${Math.floor((img.height * scale) / 2)}px ${Math.floor((img.width * scale) / 2)}px;
                  background-image: url(${dataUri});
                  background-repeat: no-repeat;
                  background-size: ${img.width * scale}px ${img.height * scale}px;
                  color: transparent;
                  `
				)
			}
		}
		img.src = url
	}

	// 返回所有方法的集合
	return {
		info,
		error,
		warning,
		success,
		picture,
		table: console.table // 直接引用控制台的 table 方法
	}
}

// 导出单例 log 对象，方便在项目中各处直接使用
export const log = prettyLog()
