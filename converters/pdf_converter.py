"""PDF 相关格式转换"""

from pathlib import Path


def pdf_to_word(input_path: Path, output_path: Path) -> Path:
    """PDF → Word (docx)"""
    from pdf2docx import Converter
    cv = Converter(str(input_path))
    cv.convert(str(output_path))
    cv.close()
    return output_path


def pdf_to_text(input_path: Path, output_path: Path) -> Path:
    """PDF → 纯文本"""
    from PyPDF2 import PdfReader
    reader = PdfReader(str(input_path))
    text_parts = []
    for page in reader.pages:
        text_parts.append(page.extract_text() or "")
    output_path.write_text("\n\n".join(text_parts), encoding="utf-8")
    return output_path


def pdf_to_image(input_path: Path, output_path: Path, fmt: str = "png") -> Path:
    """PDF → 图片（每页一张，返回第一页路径）"""
    try:
        from pdf2image import convert_from_path
        images = convert_from_path(str(input_path), dpi=200)
        output_paths = []
        stem = output_path.stem
        parent = output_path.parent
        for i, img in enumerate(images):
            page_path = parent / f"{stem}_page{i+1}.{fmt}"
            img.save(str(page_path), fmt.upper())
            output_paths.append(page_path)
        return output_paths[0] if output_paths else output_path
    except ImportError:
        # 如果 pdf2image 不可用，使用 PyPDF2 + reportlab
        raise RuntimeError("需要安装 pdf2image 和 poppler 才能将 PDF 转为图片")


def pdf_to_html(input_path: Path, output_path: Path) -> Path:
    """PDF → HTML"""
    from PyPDF2 import PdfReader
    import html as html_module
    reader = PdfReader(str(input_path))
    pages_html = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        escaped = html_module.escape(text)
        pages_html.append(
            f'<div class="page" style="margin:20px auto;max-width:800px;'
            f'padding:40px;background:white;box-shadow:0 2px 10px rgba(0,0,0,0.1);'
            f'page-break-after:always;">'
            f'<pre style="white-space:pre-wrap;font-family:serif;line-height:1.8;">{escaped}</pre>'
            f'<div style="text-align:center;color:#999;margin-top:20px;">— 第 {i+1} 页 —</div>'
            f'</div>'
        )
    html_content = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{input_path.stem}</title></head>
<body style="background:#f5f5f5;padding:20px;">
{''.join(pages_html)}
</body></html>"""
    output_path.write_text(html_content, encoding="utf-8")
    return output_path


def pdf_merge(input_paths: list[Path], output_path: Path) -> Path:
    """合并多个 PDF"""
    from PyPDF2 import PdfMerger
    merger = PdfMerger()
    for p in input_paths:
        merger.append(str(p))
    merger.write(str(output_path))
    merger.close()
    return output_path
