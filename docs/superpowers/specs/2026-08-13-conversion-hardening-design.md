# 转换器安全与稳定性加固设计

## 目标

在不改变纯浏览器、离线运行、GitHub Pages 部署和现有 Blob 返回接口的前提下，修复 HTML/Markdown 脚本注入风险，确保 PPT 压测验证最终 PDF，降低大 PPT 的内存峰值，并让测试可在干净机器和 CI 中重复执行。

## 设计

HTML、Markdown 和 Mammoth 生成的 HTML 在进入活动 DOM 或导出文档前，统一经过固定版本的本地 DOMPurify。清洗层使用 HTML 白名单，移除事件属性、可执行/嵌入标签、危险协议、外部资源 URL 和 CSS URL；结果页、错误提示和文件列表改用 DOM API 与 `textContent` 写入用户可控字符串。运行时不访问 CDN。

PPT 渲染器改为“渲染一页、写入一页、释放一页”。主渲染器和兼容解析器共用写页回调；若主渲染器失败，丢弃已经构建的临时 PDF 后从第一页走 fallback，避免重复页或半成品。每页 canvas 写入后立即清零尺寸，媒体 URL 仍由渲染器句柄负责释放。

E2E 测试直接打开 `window.ppt2pdf()` 返回的 Blob，逐页检查页数、比例和非白像素，不再以旧解析器 canvas 代替最终产物。所有路径从测试文件自身位置推导；固定测试样本全部位于仓库内。中文 PDF 使用可再分发的 Noto Sans SC 子集字体生成，并在 DOCX XML 中断言准确中文文本。

## 错误与资源处理

- 每个结果容器最多保留一个下载对象 URL；替换结果和重置时回收。
- 临时图片 URL 在 `load`/`error` 后回收；图片预览重建时回收旧 URL。
- PDF.js 文档和临时 canvas 使用 `try/finally` 清理。
- 不支持内容继续以 warning 降级，不改变公开转换函数的 Blob 返回约定。

## 验收

- 恶意 HTML、Markdown、错误文本和显示名称均不能执行脚本或产生网络请求。
- 25 页文字、25 页 4:3 图片、40 页 16:9 混合 PPT 的最终 PDF 页数正确且每页非白。
- 运行测试不依赖 `D:` 绝对路径或仓库外文件，并由 GitHub Actions 自动执行。
- PDF→Word 的中文、双栏、表格和图片断言通过；Word→PDF 保持分页且无白页。
- 现有 `window.ppt2pdf`、`window.pdf2docx` 等返回 Blob 的接口保持兼容。

