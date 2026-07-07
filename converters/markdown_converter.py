"""Markdown 和 HTML 相关格式转换"""

from pathlib import Path


def md_to_html(input_path: Path, output_path: Path) -> Path:
    """Markdown → HTML"""
    import markdown

    md_text = input_path.read_text(encoding="utf-8")
    html_body = markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "codehilite", "toc", "attr_list"],
    )

    html_content = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>{input_path.stem}</title>
<style>
body{{font-family:system-ui,-apple-system,sans-serif;max-width:900px;margin:40px auto;padding:0 20px;line-height:1.8;color:#333;}}
h1,h2,h3{{color:#1a1a1a;border-bottom:1px solid #eee;padding-bottom:8px;}}
code{{background:#f4f4f4;padding:2px 6px;border-radius:4px;font-size:0.9em;}}
pre{{background:#f8f8f8;padding:16px;border-radius:8px;overflow-x:auto;}}
pre code{{background:none;padding:0;}}
table{{border-collapse:collapse;width:100%;margin:20px 0;}}
th,td{{border:1px solid #ddd;padding:10px 14px;text-align:left;}}
th{{background:#f5f5f5;font-weight:600;}}
blockquote{{border-left:4px solid #ddd;margin:0;padding:10px 20px;color:#666;}}
img{{max-width:100%;}}
a{{color:#1a56db;}}
</style>
</head><body>
{html_body}
</body></html>"""
    output_path.write_text(html_content, encoding="utf-8")
    return output_path


def md_to_pdf(input_path: Path, output_path: Path) -> Path:
    """Markdown → PDF（通过 HTML 中转）"""
    import tempfile
    html_tmp = Path(tempfile.mktemp(suffix=".html"))
    try:
        md_to_html(input_path, html_tmp)
        return html_to_pdf(html_tmp, output_path)
    finally:
        if html_tmp.exists():
            html_tmp.unlink()


def md_to_word(input_path: Path, output_path: Path) -> Path:
    """Markdown → Word（通过 HTML 中转）"""
    import tempfile
    html_tmp = Path(tempfile.mktemp(suffix=".html"))
    try:
        md_to_html(input_path, html_tmp)
        return html_to_word(html_tmp, output_path)
    finally:
        if html_tmp.exists():
            html_tmp.unlink()


def html_to_pdf(input_path: Path, output_path: Path) -> Path:
    """HTML → PDF"""
    try:
        import weasyprint
        html_doc = weasyprint.HTML(filename=str(input_path))
        html_doc.write_pdf(str(output_path))
        return output_path
    except ImportError:
        # 回退方案
        return _html_to_pdf_fallback(input_path, output_path)


def _html_to_pdf_fallback(input_path: Path, output_path: Path) -> Path:
    """HTML → PDF 回退方案（用 reportlab）"""
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    import re
    import os

    font_name = "Helvetica"
    for fp in ["C:/Windows/Fonts/simhei.ttf", "C:/Windows/Fonts/simsun.ttc"]:
        if os.path.exists(fp):
            try:
                pdfmetrics.registerFont(TTFont("ChineseFont", fp))
                font_name = "ChineseFont"
                break
            except Exception:
                continue

    html_text = input_path.read_text(encoding="utf-8")
    # 简单去除 HTML 标签
    text = re.sub(r"<[^>]+>", "", html_text)
    text = text.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    text = re.sub(r"\n{3,}", "\n\n", text)

    pdf_doc = SimpleDocTemplate(str(output_path), pagesize=A4)
    style = ParagraphStyle("Body", fontName=font_name, fontSize=11, leading=18)
    elements = [Paragraph(line.replace("&", "&amp;").replace("<", "&lt;"), style)
                for line in text.split("\n") if line.strip()]
    if not elements:
        from reportlab.platypus import Spacer
        elements = [Spacer(1, 1)]
    pdf_doc.build(elements)
    return output_path


def html_to_word(input_path: Path, output_path: Path) -> Path:
    """HTML → Word"""
    from docx import Document
    import re

    html_text = input_path.read_text(encoding="utf-8")
    doc = Document()

    # 提取 body 内容
    body_match = re.search(r"<body[^>]*>(.*?)</body>", html_text, re.DOTALL | re.IGNORECASE)
    content = body_match.group(1) if body_match else html_text

    # 提取段落
    paragraphs = re.findall(r"<(?:p|div)[^>]*>(.*?)</(?:p|div)>", content, re.DOTALL | re.IGNORECASE)
    if not paragraphs:
        # 回退：按行分割
        text = re.sub(r"<[^>]+>", "", content)
        paragraphs = text.split("\n")

    for para_text in paragraphs:
        clean = re.sub(r"<[^>]+>", "", para_text).strip()
        if clean:
            doc.add_paragraph(clean)

    doc.save(str(output_path))
    return output_path


def html_to_text(input_path: Path, output_path: Path) -> Path:
    """HTML → 纯文本"""
    import re
    html_text = input_path.read_text(encoding="utf-8")
    # 移除 script 和 style
    text = re.sub(r"<script[^>]*>.*?</script>", "", html_text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE)
    # 把 br/p/div/h* 替换为换行
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</(?:p|div|h[1-6]|li|tr)>", "\n", text, flags=re.IGNORECASE)
    # 移除所有标签
    text = re.sub(r"<[^>]+>", "", text)
    # 解码 HTML 实体
    text = text.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    text = text.replace("&nbsp;", " ").replace("&quot;", '"')
    # 清理多余空行
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    output_path.write_text(text, encoding="utf-8")
    return output_path
