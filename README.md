# 🔄 文件格式转换器

一个纯浏览器端的文件格式转换工具，无需安装任何软件，打开网页即可使用。

## 功能特性

- **拖拽上传** — 支持拖拽或点击选择文件
- **智能格式检测** — 自动识别源格式，显示可用的目标格式
- **多格式支持** — 文档、图片、视频、音频、Markdown、HTML
- **即时下载** — 转换完成后自动下载
- **纯本地处理** — 文件不上传到任何服务器，保护隐私
- **零依赖** — 不需要安装 Python、FFmpeg 等任何环境

## 支持的转换

| 源格式 | 可转换为 |
|--------|----------|
| PDF | Word、TXT、HTML |
| Word | PDF、HTML、TXT |
| PPT | PDF、PNG |
| Excel | CSV、HTML |
| CSV | Excel、TXT、HTML |
| Markdown | HTML、PDF、Word |
| HTML | PDF、TXT、Markdown、Word |
| PNG/JPG/WebP/BMP/GIF/SVG | 图片互转、PDF |
| TXT | PDF、Word |
| MP4/MOV/AVI/MKV/WMV/FLV | MP4、GIF、WebM |
| WebM | GIF、MP4 |
| MP3/WAV/OGG/AAC/FLAC | 音频格式互转 |

## 使用方法

直接打开 https://dlinjiade-debug.github.io/format-converter/ 即可使用。

或克隆仓库用浏览器打开 `index.html`：

```bash
git clone https://github.com/dlinjiade-debug/format-converter.git
cd format-converter
# 直接用浏览器打开 index.html
```

## 项目结构

```
format-converter/
├── index.html          # 全部功能 (HTML/CSS/JS)
├── lib/                # 本地打包的第三方库（jsPDF / mammoth / html2pdf / docx / pdf.js / XLSX / ffmpeg 等），无需联网即可加载
└── README.md
```

> 第三方库已下载到 `lib/` 并改为本地引用，运行时不再依赖 jsdelivr / unpkg / cdnjs 等 CDN，国内网络下也不会再出现"库加载失败"。

## PPT → PDF 渲染说明（重要）

PPT 里**整页图片型幻灯片**（常见于设计稿/海报/截图导出）依赖 `<p:pic>` 元素承载背景图。转换器会：

1. `pptParse` 解析 `ppt/slides/slideN.xml`，按文档顺序收集 `<p:sp>`（文字）、`<p:pic>`（图片）、`<p:graphicFrame>`（图表/表格）三类形状，图层叠放顺序与 PowerPoint 一致；
2. 通过 `ppt/slides/_rels/slideN.xml.rels` 把图片 `r:embed` 映射到 `ppt/media/*.png`（属性顺序无关、路径自动归一化）；
3. `pptRenderSlide` 把每个形状画到 Canvas（2x 高清），`ppt2pdf` 按真实宽高比铺进 PDF，避免拉伸变形。

> 若转换出来一片空白，多半是 `<p:pic>`（图片）未被解析或图片关系映射失败——这类问题已修复。

## 自动化测试（开发用）

位于 `tests/e2e/`，仅用于本地验证，不影响网页功能：

- `lib/jszip.min.js` — 已本地化的 JSZip（fixture 生成复用，无需联网）
- `tests/e2e/gen-fixtures.mjs` — 生成压测样本：纯文字 16:9、纯图片 4:3、混合 16:9
- `tests/e2e/verify-ppt.mjs <样本.pptx>` — 单文件验证（页数/非白像素/PDF 导出）
- `tests/e2e/stress.mjs [文件...]` — 批量压测，输出解析/渲染/导出耗时与稳定性

> Playwright 与 Chromium 缓存放在项目内 `.pw-browsers/`（约 140MB），`node_modules` 也在项目内，**不写入 C 盘**。

## 技术栈

- **纯前端**: 原生 HTML/CSS/JS（零依赖）
- **转换引擎**: FFmpeg.wasm（视频/音频）、PDF.js（PDF）、Mammoth.js（Word）、jsPDF（PDF生成）、marked（Markdown）、XLSX.js（Excel）
- **托管**: GitHub Pages

## 注意事项

- 视频/音频转换首次需要加载 FFmpeg.wasm 核心文件（约 25MB），请耐心等待
- 建议使用 Chrome/Edge/Firefox 最新版本
- 处理大文件时请确保有足够内存

## 转换稳定性说明

- PPT→PDF 优先使用固定版本的本地 `@aiden0z/pptx-renderer` 1.2.4；旧解析器保留为 fallback。遇到 3D、动画、OLE、部分 EMF/WMF 等能力时会显示 warning，不会静默生成空白页。
- PDF→Word 提供文本优先和版式优先两种模式。图片型 PDF 会逐页嵌入完整页面图，并明确提示“正文不可编辑”；项目不内置 OCR。
- Word→PDF 使用 HTML/CSS 中间层，等待图片和字体加载，保留表格、图片、分页，并使用 `break-inside: avoid` 降低空白页、裁切和重叠风险。
- 所有文档 HTML 进入 DOM 或导出前都会经过本地 DOMPurify 清理；文件名和错误信息不会直接作为 HTML 插入。

## 自动化验证

需要 Node.js 20+。首次运行先安装依赖和 Chromium：

```bash
npm ci
# Windows PowerShell: $env:PLAYWRIGHT_BROWSERS_PATH='.pw-browsers'
npx playwright install chromium
npm run test:all
```

Windows PowerShell 若执行策略拦截 `npm`，可将上述命令中的 `npm` 改为 `npm.cmd`。也可以分开运行：

```bash
npm run test:ppt       # 25 页真实 PPT→PDF 页数、比例、非白页、页序
npm run test:pdf       # 图片型 PDF→Word
npm run test:security  # HTML 清理、外链拦截、Blob URL 释放
npm run test:stress    # 25/25/40 页 PPT 批量压测
```

测试浏览器默认缓存到项目内的 `.pw-browsers/`，不会写入 C 盘；该目录、`node_modules/`、导出文件和调试截图均被 `.gitignore` 排除。第三方包的来源、许可证和 SHA-256 见 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。

## 已知限制

- 图片型 PDF 不做 OCR，因此页面图完整但正文不可编辑。
- 复杂 PowerPoint 的 3D、动画、OLE、部分 EMF/WMF 和高级图表效果可能降级，并通过 warning 告知。
- 浏览器端转换受内存限制；大文件或高页数文档建议分批处理。
