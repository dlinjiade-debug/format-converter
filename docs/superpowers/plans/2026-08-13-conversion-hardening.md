# Conversion Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 加固浏览器端文档转换的输入安全、最终产物测试、PPT 内存占用和跨机器可复现性。

**Architecture:** 使用本地 DOMPurify 作为所有富文本输入的统一边界；PPT 通过逐页回调直接写入 jsPDF；E2E 通过共享路径/浏览器工具验证真实 Blob。CI 在干净环境安装 Chromium 并运行同一套脚本。

**Tech Stack:** Vanilla JavaScript、DOMPurify 3.4.12、PDF.js、jsPDF、Playwright、GitHub Actions。

## Global Constraints

- 保持纯浏览器和 `file://` 离线运行，运行时不得请求 CDN。
- 保持 `window.ppt2pdf`、`window.pdf2docx` 等公开函数返回 Blob。
- 不加入 OCR、LibreOffice、Office 或服务端。
- 不覆盖或暂存 `.workbuddy/`、`math-tutor-deck/`、`output/`、`node_modules/`、`.pw-browsers/` 和调试输出。
- 所有第三方运行库固定版本并记录来源、许可证和 SHA-256。

---

### Task 1: 富文本输入安全边界

**Files:**
- Create: `tests/e2e/security.mjs`
- Create: `lib/purify.min.js`
- Modify: `index.html`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `sanitizeDocumentHtml(html): string`、`setSanitizedHtml(element, html): Promise<Element>`、安全的 `show()`/`showError()`。

- [ ] 写 Playwright 回归测试，通过真实 `docHtmlToPdf` 输入 `onerror`、`javascript:` 和远程图片，并通过 `show` 输入恶意显示名称。
- [ ] 运行测试，确认现有实现会执行探针或产生外部请求。
- [ ] 固定安装 DOMPurify 3.4.12，将浏览器构建复制到 `lib/`，在 `LIBS` 中本地懒加载。
- [ ] 实现统一清洗函数，禁止事件属性、可执行/嵌入标签、危险 URL、外部资源与 CSS URL。
- [ ] 将 HTML/Markdown/Word HTML 的 PDF、DOCX、HTML、TXT 路径接入清洗层；结果和错误 UI 使用 DOM API。
- [ ] 重跑安全测试和现有转换测试，确认探针为 0、外部请求为 0。

### Task 2: PPT 逐页写入与真实产物验收

**Files:**
- Modify: `index.html`
- Modify: `tests/e2e/verify-ppt.mjs`
- Modify: `tests/e2e/stress.mjs`

**Interfaces:**
- Produces: `renderPptWithLibrary(file, warnings, onSlide)`，回调参数为 `{canvas,width,height,index,total}`，返回 `{count,width,height}`。

- [ ] 在 PPT 测试中要求逐页回调，并直接打开最终 PDF Blob 检查所有页。
- [ ] 运行回调测试，确认旧实现因不调用 `onSlide` 而失败。
- [ ] 让主渲染器逐页调用回调；jsPDF 写页后清空 canvas；fallback 使用相同写页函数。
- [ ] 将页序断言改为与 fixture 的完整字面序列一致，不能在数据缺失时跳过。
- [ ] 运行 25/25/40 页 fixture，断言页数、比例、每页非白和零外部请求。

### Task 3: 可移植测试、中文与 CI

**Files:**
- Create: `tests/e2e/helpers.mjs`
- Create: `tests/fixtures/NotoSansSC-TestSubset.ttf`
- Create: `tests/fixtures/NotoSansSC-OFL.txt`
- Create: `.github/workflows/conversion-tests.yml`
- Modify: `tests/e2e/*.mjs`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Produces: `repoPath(...segments)`、`repoFileUrl(...segments)`、`launchBrowser()`。

- [ ] 新增共享路径/浏览器 helper，并从非仓库工作目录执行测试以证明不依赖绝对路径。
- [ ] 将所有 E2E 脚本切换到 helper，删除仓库外默认样本。
- [ ] 用 Noto Sans SC 子集生成中文 PDF，在 PDF→Word 输出 XML 中断言“数学选择题”和页面顺序。
- [ ] 增加 `test:e2e`、`test:stress`、`test:all`，将 Playwright 移至 devDependencies。
- [ ] 添加 GitHub Actions，在 Node 20 下安装依赖和 Chromium 后执行 `npm run test:all`。

### Task 4: 资源、仓库与供应链整理

**Files:**
- Create: `THIRD_PARTY_NOTICES.md`
- Modify: `.gitignore`
- Modify: `index.html`
- Delete: `lib/pptx-renderer.browser.es.js`

**Interfaces:**
- Produces: 对象 URL 生命周期管理函数，供结果下载、临时图片和图片预览复用。

- [ ] 写对象 URL 回归测试，确认替换结果、重置和图片加载会调用 `URL.revokeObjectURL`。
- [ ] 运行测试，确认旧实现遗漏回收。
- [ ] 实现结果 URL、图片 URL、FFmpeg core URL 和预览 URL 的回收。
- [ ] 更新 `.gitignore` 排除生成目录；删除未引用的 PPT ESM 副本。
- [ ] 生成第三方清单，记录运行库版本、来源、许可证和 SHA-256。
- [ ] 运行 `npm run test:all` 和 Git 状态检查，确认仅相关文件进入提交范围。

