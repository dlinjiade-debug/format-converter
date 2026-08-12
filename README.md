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
## Conversion stability notes

- PPT to PDF first uses the pinned local `@aiden0z/pptx-renderer` 1.2.4 browser build. The original Apache-2.0 license is kept at `lib/pptx-renderer.LICENSE.txt`; the runtime does not request a CDN. The older parser remains as a visible-warning fallback.
- PDF to Word has text-first and layout-first modes. Image-only PDFs are kept page-by-page as complete page images and report that the body is not editable; OCR is intentionally not bundled.
- Word to PDF uses an HTML/CSS print layer with explicit page-break markers, image/font readiness checks, and `break-inside: avoid` rules.

Browser regression commands (set `PLAYWRIGHT_BROWSERS_PATH=.pw-browsers` on Windows before running them):

- `node tests/conversion-quality.test.js`
- `node tests/e2e/verify-ppt.mjs tests/fixtures/stress-text-25-16x9.pptx 25`
- `node tests/e2e/verify-pdf.mjs`
- `node tests/e2e/verify-pdf-text.mjs`
- `node tests/e2e/verify-word.mjs`
