# 第三方组件与许可证

本项目把浏览器运行时依赖固定放在 `lib/`，运行时不从 CDN 下载脚本。下面的 SHA-256 用于确认仓库中的本地文件没有被替换；上游许可证文本随组件或本仓库的许可证文件一并保留。

| 本地文件 | 上游组件 | 许可证 | 上游地址 |
| --- | --- | --- | --- |
| `lib/pptx-renderer.browser.iife.js` | `@aiden0z/pptx-renderer` 1.2.4 | Apache-2.0 | <https://github.com/aiden0z/pptx-renderer> |
| `lib/purify.min.js` | DOMPurify 3.4.17 | Apache-2.0 / MPL-2.0 | <https://github.com/cure53/DOMPurify> |
| `lib/docx-preview.browser.js` | docx-preview 0.4.1 | Apache-2.0 | <https://github.com/VolodymyrBaydalka/docxjs> |
| `lib/pdf.min.js`, `lib/pdf.worker.min.js` | PDF.js 3.11.174 | Apache-2.0 | <https://github.com/mozilla/pdf.js> |
| `lib/jspdf.umd.min.js` | jsPDF 2.5.2 | MIT | <https://github.com/parallax/jsPDF> |
| `lib/html2pdf.bundle.min.js` | html2pdf.js 0.10.2 及其浏览器依赖 | MIT | <https://github.com/eKoopmans/html2pdf.js> |
| `lib/html2canvas.min.js` | html2canvas 1.4.1（逐页画布截取） | MIT | <https://github.com/niklasvh/html2canvas> |
| `lib/svg2pdf.browser.js` | svg2pdf.js 2.9.0（SVG 矢量 PDF） | MIT | <https://github.com/yWorks/svg2pdf.js> |
| `lib/docx.index.umd.js` | docx 8.5.0 | MIT | <https://github.com/dolanmiu/docx> |
| `lib/mammoth.browser.min.js` | Mammoth.js 1.8.0 | BSD-2-Clause | <https://github.com/mwilliamson/mammoth.js> |
| `lib/pdf-lib.min.js` | pdf-lib 1.17.1 | MIT | <https://github.com/Hopding/pdf-lib> |
| `lib/jszip.min.js` | JSZip 3.10.1 | MIT or GPL-3.0-or-later | <https://github.com/Stuk/jszip> |
| `lib/marked.min.js` | Marked 12.0.2 | MIT | <https://github.com/markedjs/marked> |
| `lib/xlsx.full.min.js` | SheetJS Community Edition 0.18.5 | Apache-2.0 | <https://github.com/SheetJS/sheetjs> |
| `lib/heic2any.min.js` | heic2any 0.0.4 | MIT | <https://github.com/alexcorvi/heic2any> |
| `lib/lame.min.js` | lamejs 1.2.1 (LAME 3.98.4 codec) | LGPL-2.1-or-later | <https://github.com/zhuker/lamejs> |
| `lib/ffmpeg/ffmpeg.js`, `814.ffmpeg.js` | `@ffmpeg/ffmpeg` 0.12.15 | MIT | <https://github.com/ffmpegwasm/ffmpeg.wasm> |
| `lib/ffmpeg/ffmpeg-core.js`, `ffmpeg-core.wasm` | `@ffmpeg/core` 0.12.10（单线程） | GPL-2.0-or-later | <https://github.com/ffmpegwasm/ffmpeg.wasm> |
| `lib/ffmpeg/ffmpeg.min.js`, `ffmpeg-core.worker.js` | 旧 0.11 包保留文件，当前网页不加载 | 见旧文件头 | <https://github.com/ffmpegwasm/ffmpeg.wasm> |

随仓库保留的许可证/来源说明：

- PPT 渲染器：[`lib/pptx-renderer.LICENSE.txt`](lib/pptx-renderer.LICENSE.txt)
- DOMPurify：[`lib/dompurify.LICENSE.txt`](lib/dompurify.LICENSE.txt)
- docx-preview：[`lib/docx-preview.LICENSE.txt`](lib/docx-preview.LICENSE.txt)
- HTML2Canvas：[`lib/html2canvas.LICENSE.txt`](lib/html2canvas.LICENSE.txt)；SVG2PDF：[`lib/svg2pdf.LICENSE.txt`](lib/svg2pdf.LICENSE.txt)
- FFmpeg 包装器：[`lib/ffmpeg/LICENSE-MIT.txt`](lib/ffmpeg/LICENSE-MIT.txt)；核心：[`lib/ffmpeg/COPYING.GPLv2`](lib/ffmpeg/COPYING.GPLv2)
- Noto Sans SC 测试字体：[`tests/fixtures/NotoSansSC-OFL.txt`](tests/fixtures/NotoSansSC-OFL.txt)

## SHA-256

`npm ci && npm run vendor` 从锁定版本的 npm 包重建本地文件。docx-preview 的 UMD 全局变量 `docx` 改名为 `docxPreview`，SVG2PDF 的 UMD 全局变量 `svg2pdf` 改名为 `SvgToPdf`，避免覆盖公开转换函数/库。FFmpeg 核心与包装器为 npm 原始分发文件；对应构建源码见上游仓库的 `packages/core`、`packages/ffmpeg` 和构建脚本，npm 分发与完整性哈希锁定在 `package-lock.json`。桌面运行环境 Electron 45.3.0（MIT）与构建工具 electron-builder 26.18.0（MIT）由 package-lock 固定；Electron/Chromium 的完整许可证和第三方说明随 dist/win-unpacked/LICENSE* 分发。

以下清单覆盖当前 `lib/` 中的 JavaScript/WASM 运行时文件。重新替换任何包时，应同步更新本文件和对应许可证。

```text
lib/conversion-codecs.js                   24CC00082D9DBCF43DB25251F2A731946521E04A626CAB4C2D11213DC204194D
lib/conversion-registry.js                 2D7BAEA2F472C2F61A74DCDDBE305A1A067914528998B707A3A6AEBF5AF1250E
lib/conversion-workbench.js                E8C06D7E7960E0FE25A25053A241FD90F1E7A2620EB55996212BE9580BCB03C3
lib/docx-preview.browser.js                7C7DE2BA6D2610725D1E79420ACCFC4B7729CB5181CB74496B6CC3F68AC9717C
lib/docx.index.umd.js                      02D568D203C0180AF37609BCF5FF6C0919D220F933A88CA896EBA0556A08FAAD
lib/ffmpeg/814.ffmpeg.js                   976F4174AE7DA80C0D4F9523EE6DDE3ECBCE7DC2EE392B2A5322049ABB9B8627
lib/ffmpeg/ffmpeg-core.js                  B266AB5B952555881DD6310663986994A182ACB2B7FF25CF10A25F7A37AC2B21
lib/ffmpeg/ffmpeg-core.wasm                9F57947A5BD530D8F00C5B3F2CB2A3492FAA7E5D823315342D6A8656D0A6B7B7
lib/ffmpeg/ffmpeg-core.worker.js           DCE31A8DE632D0B8AA9928DBCF5F6A108BEF6312C52D19D66515EBB9167F7C4A
lib/ffmpeg/ffmpeg.js                       AD4CFE957589995DEA03FC8DE1FD5E9F5CB4558A7282913172203082A65BBFAA
lib/ffmpeg/ffmpeg.min.js                   744276F2C9EBDA1BAEA9C7A8E1D53FF03012F67B5D6F73D718E3524408317DDF
lib/font-support.js                        62BCC90DB455C9FE27DF819ABF48FE6145643DF7923585484476249C7D9B9492
lib/heic2any.min.js                        0963CFA50E9E1E7E6AF929A40A81E3E898A673F1270EAFA6917DD137E4968164
lib/html2canvas.min.js                     E87E550794322E574A1FDA0C1549A3C70DAE5A93D9113417A429016838EAB8CB
lib/html2pdf.bundle.min.js                 73B512869D64D0F2828E436B24B23B7D84F24B7028BBA6C49CB4D1C988103DA4
lib/jspdf.umd.min.js                       85BA2CC3FF858A20FA49FE6E457BEC863EA40B55A9F3725E58A940E62F6F61A4
lib/jszip.min.js                           ACC7E41455A80765B5FD9C7EE1B8078A6D160BBBCA455AEAE854DE65C947D59E
lib/lame.min.js                            15D285E2587B3BDBFD18A68DE6CE07CC074F7480A82C3815DA2DC1C348EC6DF4
lib/mammoth.browser.min.js                 DEB07BF230D1CB3E190BC5ADC6743F35C6531B6571D1E5469B24F452A7F0F4AB
lib/marked.min.js                          15FABCE5B65898B32B03F5ED25E9F891A729AD4C0D6D877110A7744AA847A894
lib/pdf-lib.min.js                         0F9A5CAD07941F0826586C94E089D89B918C46E5C17CF2D5A3C6F666E3BC694F
lib/pdf.min.js                             5B5799E6F8C680663207AC5B42EE14EED2A406FA7AF48F50C154F0C0B1566946
lib/pdf.worker.min.js                      FEABDF309770ED24BBA31A5467836CDC8CF639C705AF27D52B585B041BB8527B
lib/pptx-renderer.browser.iife.js          B356473A88AE8B5970AF9D5ED1F7C978213AC806E8DD59A3ED805B74E6EFB2C4
lib/purify.min.js                          CD37898F9782ADF54820C413191B5691803F0F137C799D6EDCFD38523B4C2C31
lib/svg2pdf.browser.js                     06CC1720E41BED45F6766A0F34ABC9FD59A0390134588E2EF905EA9378EC8B49
lib/visual-metrics.js                      23117D3B006B675A900A1CCD2521278A984F3E7C1114A832BBB0C30FDB07E119
lib/xlsx.full.min.js                       C9506197CAF809A075B6DEE1DA0D36FB19DA7158FFE8A88E7B0C96C5D8623C99
```
