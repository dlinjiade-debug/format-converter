# linjiade 转换器

同一个转换核心，提供 Windows 便携软件与公开网页。文件在使用者自己的设备上处理，不上传到转换服务器。

- [公开网站](https://dlinjiade-debug.github.io/format-converter/)：保留主分支独立更新的 Office 引擎与首页。
- [增强工作台](https://dlinjiade-debug.github.io/format-converter/workbench/)：预检、逐页预览、字体和路径设置。
- [Windows 便携软件](https://github.com/dlinjiade-debug/format-converter/releases/download/v1.1.0/FormatConverter-1.1.0-windows-x64.exe)：下载后运行，无需安装 Python、Office 或 LibreOffice。当前为未签名版本，发布页提供 SHA-256 校验值。

## 路径与使用

打开“输出、字体与路径设置”：

1. 桌面端选择输入、输出、参考 PDF 目录。输入/参考目录可列出文件，点击文件即可选择；设置在本机用户配置目录中持久保存。
2. 网页端可在支持的浏览器中授权目录。浏览器只显示授权目录名，不能访问任意磁盘路径；不支持目录授权的浏览器仍可选择文件和普通下载。
3. 选择文件后自动预检页数、媒体对象和可能缺失的字体；点击开始转换，查看逐页预览，再点击下载/保存。
4. 桌面端保存到设置的输出目录；未设置时打开原生保存窗口。同名结果自动另存，不覆盖已有文件。
5. 可选择 Office/WPS 导出的参考 PDF，在结果预览中逐页比较，下载差异报告。

中文或特殊字符的可搜索文字需要可嵌入的相应字体。可加载本地 TTF 并填写源字体名或别名；字体仅在当前会话使用，不上传、不自动提交进仓库。

## 转换能力

| 输入 | 输出 |
| --- | --- |
| PDF | Word、TXT、HTML、PNG/JPG；多页图片打包 ZIP |
| DOCX | PDF（版式/正文模式）、HTML、TXT |
| PPTX | PDF、PNG；多页 PNG 打包 ZIP |
| Excel/CSV | CSV、XLSX、HTML、TXT，依具体输入格式显示 |
| Markdown/HTML/TXT | 文档、网页、PDF |
| 图片/SVG/HEIC | 图片互转、PDF；普通 SVG 可保留矢量和文字 |
| 视频/音频 | FFmpeg/LAME 实际编码，依界面显示格式 |

旧 .doc 需要先在 Word/WPS 另存为 .docx。扫描件不内置 OCR。

## 保真与性能

- PPT、Word 的自动 PDF 输出保留页面图外观，并尽可能添加可搜索源文字层；这不等同于完整的矢量/可编辑 Office 重建。
- 缺少字形时明确提示，保留页面外观；不会把错误编码冒充可搜索中文。
- PPT 主渲染失败默认停止输出，主动勾选简化兼容选项后才降级。系统打印是另一条输出路径。
- 画质可选择自动、清晰或体积优先，按设备和像素预算控制画布；Word/HTML 按页截图，页处理后释放画布与媒体 URL。
- 输出 PDF 逐页预览并提示疑似空白，不自动下载。预览切页、换文件和取消任务会释放相应资源。
- 3D、动画、视频、OLE、部分 EMF/WMF、浮动排版、自动分页和无边框表格仍可能与 Office 不同，需要真实文件验收。
- 网页通过静态 HTTP(S) 访问即可使用视频/OGG，无需跨源隔离。直接双击 file:// 时浏览器可能禁止读取 WASM；桌面软件不受这个入口限制。

## 开发与构建

需要 Node.js 22.12+，本次在 Windows x64 验证。依赖固定在 package-lock.json：

```bash
npm ci
npm run vendor
npx playwright install chromium
npm run desktop
npm run build:desktop
```

便携 EXE 输出到 dist/。桌面端 sandbox/contextIsolation 开启，网页无 Node 权限；原生文件读写仅通过主进程验证的目录授权和文件 ID。

运行库在 lib/ 中本地加载，运行时不访问 CDN。来源、许可证、变更和校验和见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 测试

```bash
npm run test:all        # 浏览器转换、预览、字体、真实编码、指标工具、25/25/40 页压测
npm run test:desktop    # 路径边界 + 隐藏原生窗口的完整保存流程
npm run test:corpus     # 对比工具自身的合成测试，不代表真实文件已通过
npm run test:packaged   # app.asar 完整转换保存 + 便携 EXE 实际启动
node tests/e2e/verify-public-site.mjs  # build:site 后，验证子路径资源和转换
```

Windows 文件符号链接测试可能因缺少 Developer Mode/admin 权限而跳过；目录 junction 逃逸测试仍执行。浏览器缓存位于 .pw-browsers/，构建输出、用户文件和验收输出不提交。

## 真实文件回归库

不生成“自己的参考答案”来证明自己正确。将 [清单模板](tests/corpus/example.manifest.json) 复制到仓库外，选择真实 PPTX/DOCX 与独立的 Office/WPS 导出 PDF，填写来源，删除 template:true，再运行：

```bash
node scripts/corpus.mjs --manifest "D:/验收/manifest.json" --output "D:/验收/报告"
```

报告包含源文件/参考文件 SHA-256、转换器版本、浏览器版本、页数/尺寸、文字覆盖和逐页前景 IoU/SSIM。空白背景不会稀释缺失图形的分数。阈值用于定位回归，不能取代人工核对。未配置真实文件时工具明确报错，不会标记通过。

## 公开网站发布

npm run build:site 将 origin/master 的现有首页/vendor 保留在站点根目录，并把本分支工作台放在 /workbench/。公开产物只包含静态网页资源，不包含私有目录设置、测试源文件、Node 模块或 EXE。GitHub Pages 使用独立的 codex/public-site 发布分支；源代码仍在 codex/conversion-stability 审查分支，不覆盖主分支的新 Office 引擎。

## 设计参考

参考 [VERT](https://github.com/VERT-sh/VERT) 的多引擎和任务管理思路、[PPTist](https://github.com/pipipi-pikachu/PPTist) 的打印流程、[pdf2docx](https://github.com/ArtifexSoftware/pdf2docx) 的区域分析；没有复制这些项目的实现。Word 版式渲染采用 Apache-2.0 的 [docxjs](https://github.com/VolodymyrBaydalka/docxjs)。
