# linjiade 转换器 1.1.0

提供公开网页与 Windows x64 便携软件，共享本地转换核心。无需安装 Office、Python 或 LibreOffice；转换文件不上传至转换服务器。

- 网页：https://dlinjiade-debug.github.io/format-converter/workbench/
- 原首页：https://dlinjiade-debug.github.io/format-converter/ （保留主分支独立更新的 Office 引擎）
- 下载 `FormatConverter-1.1.0-windows-x64.exe`，双击运行。在“输出、字体与路径设置”选择输入、输出、参考 PDF 目录；路径在本机保存，同名结果安全另存。
- 新增文件预检、逐页预览、手动保存、本地 TTF、可搜索文字层、SVG 矢量/明确图片降级、参考 PDF 对比报告。
- 修复 PPT 页面/图形和数字截图兼容、Word 分页与图片、PDF 双栏/表格及多页图片导出；媒体输出使用真实编码。
- 逐页控制像素预算、释放画布和媒体；失败或取消不会自动提供可疑的简化文件。

已验证：全套浏览器测试；25 页文字/25 页 4:3 图片/40 页 16:9 混合 PPT；桌面目录选择→转换→预览→保存→同名另存→路径持久化；app.asar 完整流程及便携 EXE 实际启动。测试详情见仓库 `docs/verification-1.1.0.md`。

限制：软件未代码签名，Windows 可能显示信誉提示，请从本仓库下载并核对 `SHA256SUMS.txt`。扫描件不做 OCR；中文可搜索/矢量文字需相应 TTF。复杂 Office 对象仍可能降级，不承诺 Office 像素级一致。原先两份用户 PDF 本轮路径不存在，未冒充通过真实样本验收。未进行随机真实语料库、模糊或长时间内存压测。

浏览器不支持目录授权时仍可选文件并下载；手机可用网页，Windows 软件仅支持 x64。运行时本地加载库，无 CDN 依赖；纯 file:// 下媒体 WASM 可能受浏览器限制，使用网页或桌面入口。
