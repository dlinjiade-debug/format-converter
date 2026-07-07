# 🔄 文件格式转换器

一个基于 Python Flask 的本地文件格式转换工具，支持多种文档、图片格式之间的互转。

## 功能特性

- **拖拽上传** — 支持拖拽或点击选择文件
- **智能格式检测** — 自动识别源格式，显示可用的目标格式
- **多格式支持** — PDF、Word、PPT、Excel、图片、Markdown、HTML、TXT
- **即时下载** — 转换完成后自动下载
- **中文字体** — PDF 生成支持中文字体渲染
- **本地运行** — 文件不上传到外部服务器，保护隐私

## 支持的转换

| 源格式 | 可转换为 |
|--------|----------|
| PDF | Word、TXT、PNG、JPG、HTML |
| Word (docx) | PDF、TXT、HTML、PPT |
| PPT (pptx) | PDF、PNG、JPG、HTML |
| Excel (xlsx) | PDF、CSV |
| CSV | Excel |
| Markdown | HTML、PDF、Word |
| HTML | PDF、Word、TXT |
| PNG/JPG/BMP/TIFF/WebP | 图片互转、PDF |
| TXT | PDF、Word |

## 快速开始

### 1. 安装依赖

```bash
cd 文件格式转换器
pip install -r requirements.txt
```

> **注意**: `pdf2docx` 需要系统安装 Poppler（PDF 转图片功能需要）。
> Windows 用户可以从 https://github.com/oschwartz10612/poppler-windows/releases 下载并添加到 PATH。

### 2. 启动服务

```bash
python app.py
```

### 3. 访问应用

打开浏览器访问 http://localhost:5000

## 项目结构

```
文件格式转换器/
├── app.py                  # Flask 主应用
├── converters/
│   ├── __init__.py
│   ├── utils.py            # 工具函数和转换路由
│   ├── pdf_converter.py    # PDF 转换
│   ├── word_converter.py   # Word 转换
│   ├── ppt_converter.py    # PPT 转换
│   ├── image_converter.py  # 图片转换
│   ├── markdown_converter.py # Markdown/HTML 转换
│   └── excel_converter.py  # Excel/CSV 转换
├── templates/
│   └── index.html          # 前端页面
├── uploads/                # 临时上传目录
├── outputs/                # 转换输出目录
├── requirements.txt
└── README.md
```

## 技术栈

- **后端**: Python 3.10+ / Flask
- **转换库**: python-docx, python-pptx, PyPDF2, pdf2docx, reportlab, weasyprint, openpyxl, Pillow
- **前端**: 原生 HTML/CSS/JS（零依赖）

## 注意事项

- `docx2pdf` 在 Windows 上需要安装 Microsoft Word
- 如未安装 Word，会自动使用 reportlab 回退方案生成 PDF
- PDF 转图片功能需要 Poppler 工具包
- 上传文件大小限制为 100MB
- 临时文件在 1 小时后自动清理
