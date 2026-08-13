# 第三方组件与许可证

本项目把浏览器运行时依赖固定放在 `lib/`，运行时不从 CDN 下载脚本。下面的 SHA-256 用于确认仓库中的本地文件没有被替换；上游许可证文本随组件或本仓库的许可证文件一并保留。

| 本地文件 | 上游组件 | 许可证 | 上游地址 |
| --- | --- | --- | --- |
| `lib/pptx-renderer.browser.iife.js` | `@aiden0z/pptx-renderer` 1.2.4 | Apache-2.0 | <https://github.com/aiden0z/pptx-renderer> |
| `lib/purify.min.js` | DOMPurify 3.4.12 | Apache-2.0 / MPL-2.0 | <https://github.com/cure53/DOMPurify> |
| `lib/pdf.min.js`, `lib/pdf.worker.min.js` | PDF.js 3.11.174 | Apache-2.0 | <https://github.com/mozilla/pdf.js> |
| `lib/jspdf.umd.min.js` | jsPDF 2.5.2 | MIT | <https://github.com/parallax/jsPDF> |
| `lib/html2pdf.bundle.min.js` | html2pdf.js 0.10.2 及其浏览器依赖 | MIT | <https://github.com/eKoopmans/html2pdf.js> |
| `lib/docx.index.umd.js` | docx 8.5.0 | MIT | <https://github.com/dolanmiu/docx> |
| `lib/mammoth.browser.min.js` | Mammoth.js 1.8.0 | BSD-2-Clause | <https://github.com/mwilliamson/mammoth.js> |
| `lib/pdf-lib.min.js` | pdf-lib 1.17.1 | MIT | <https://github.com/Hopding/pdf-lib> |
| `lib/jszip.min.js` | JSZip 3.10.1 | MIT or GPL-3.0-or-later | <https://github.com/Stuk/jszip> |
| `lib/marked.min.js` | Marked 12.0.2 | MIT | <https://github.com/markedjs/marked> |
| `lib/xlsx.full.min.js` | SheetJS Community Edition 0.18.5 | Apache-2.0 | <https://github.com/SheetJS/sheetjs> |
| `lib/heic2any.min.js` | heic2any 0.0.4 | MIT | <https://github.com/alexcorvi/heic2any> |
| `lib/lame.min.js` | lamejs 1.2.1 (LAME 3.98.4 codec) | LGPL-2.1-or-later | <https://github.com/zhuker/lamejs> |
| `lib/ffmpeg/ffmpeg.min.js` | `@ffmpeg/ffmpeg` 0.11.5 | MIT | <https://github.com/ffmpegwasm/ffmpeg.wasm> |
| `lib/ffmpeg/ffmpeg-core.*` | FFmpeg WebAssembly core | 按该构建的 FFmpeg 配置（LGPL/GPL） | <https://ffmpeg.org/legal.html> |

随仓库保留的许可证/来源说明：

- PPT 渲染器：[`lib/pptx-renderer.LICENSE.txt`](lib/pptx-renderer.LICENSE.txt)
- DOMPurify：[`lib/dompurify.LICENSE.txt`](lib/dompurify.LICENSE.txt)
- Noto Sans SC 测试字体：[`tests/fixtures/NotoSansSC-OFL.txt`](tests/fixtures/NotoSansSC-OFL.txt)

## SHA-256

以下清单覆盖当前 `lib/` 中的 JavaScript/WASM 运行时文件。重新替换任何包时，应同步更新本文件和对应许可证。

```text
lib/docx.index.umd.js              02D568D203C0180AF37609BCF5FF6C0919D220F933A88CA896EBA0556A08FAAD
lib/heic2any.min.js                0963CFA50E9E1E7E6AF929A40A81E3E898A673F1270EAFA6917DD137E4968164
lib/html2pdf.bundle.min.js         73B512869D64D0F2828E436B24B23B7D84F24B7028BBA6C49CB4D1C988103DA4
lib/jspdf.umd.min.js               85BA2CC3FF858A20FA49FE6E457BEC863EA40B55A9F3725E58A940E62F6F61A4
lib/jszip.min.js                   ACC7E41455A80765B5FD9C7EE1B8078A6D160BBBCA455AEAE854DE65C947D59E
lib/lame.min.js                    15D285E2587B3BDBFD18A68DE6CE07CC074F7480A82C3815DA2DC1C348EC6DF4
lib/mammoth.browser.min.js         DEB07BF230D1CB3E190BC5ADC6743F35C6531B6571D1E5469B24F452A7F0F4AB
lib/marked.min.js                  15FABCE5B65898B32B03F5ED25E9F891A729AD4C0D6D877110A7744AA847A894
lib/pdf-lib.min.js                 0F9A5CAD07941F0826586C94E089D89B918C46E5C17CF2D5A3C6F666E3BC694F
lib/pdf.min.js                     5B5799E6F8C680663207AC5B42EE14EED2A406FA7AF48F50C154F0C0B1566946
lib/pdf.worker.min.js              FEABDF309770ED24BBA31A5467836CDC8CF639C705AF27D52B585B041BB8527B
lib/pptx-renderer.browser.iife.js  B356473A88AE8B5970AF9D5ED1F7C978213AC806E8DD59A3ED805B74E6EFB2C4
lib/purify.min.js                  C45BA939765574F96CBF35EE9B6D89F73756A17921814425E74B82F7C54603CE
lib/xlsx.full.min.js               C9506197CAF809A075B6DEE1DA0D36FB19DA7158FFE8A88E7B0C96C5D8623C99
lib/ffmpeg/ffmpeg-core.js          D22DFCB414BABEB691F10E98BB564E9D76EE09C1B6F338427FFAFF641C088BFF
lib/ffmpeg/ffmpeg-core.wasm        8D85FBA826779D840911826F4B6D3D2E21D417B601897C3F668629A5EA8062D1
lib/ffmpeg/ffmpeg-core.worker.js   DCE31A8DE632D0B8AA9928DBCF5F6A108BEF6312C52D19D66515EBB9167F7C4A
lib/ffmpeg/ffmpeg.min.js           744276F2C9EBDA1BAEA9C7A8E1D53FF03012F67B5D6F73D718E3524408317DDF
```
