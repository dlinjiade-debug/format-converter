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
└── README.md
```

## 技术栈

- **纯前端**: 原生 HTML/CSS/JS（零依赖）
- **转换引擎**: FFmpeg.wasm（视频/音频）、PDF.js（PDF）、Mammoth.js（Word）、jsPDF（PDF生成）、marked（Markdown）、XLSX.js（Excel）
- **托管**: GitHub Pages

## 注意事项

- 视频/音频转换首次需要加载 FFmpeg.wasm 核心文件（约 25MB），请耐心等待
- 建议使用 Chrome/Edge/Firefox 最新版本
- 处理大文件时请确保有足够内存

## 留言板配置

留言板使用 Firebase 匿名认证，无需注册即可留言。配置步骤：

1. 打开 [Firebase Console](https://console.firebase.google.com/) 并创建项目
2. **Authentication** → Sign-in method → **Anonymous** → Enable
3. **Firestore Database** → Create database → 选择 `nam5` → **Start in test mode**
4. Project Settings → Your apps → Web app → 注册 → 复制 `firebaseConfig`
5. 在 `index.html` 中搜索 `FIREBASE_CONFIG`，替换为你的配置

```javascript
const FIREBASE_CONFIG = {
  apiKey: "AIzaSy...",
  authDomain: "xxx.firebaseapp.com",
  projectId: "xxx",
  storageBucket: "xxx.appspot.com",
  messagingSenderId: "xxx",
  appId: "xxx"
};
```

> Firestore 测试模式 30 天后过期，届时需更新安全规则或将数据迁移。
