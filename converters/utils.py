"""通用工具函数"""

import os
import uuid
import shutil
import time
from pathlib import Path

UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
OUTPUT_DIR = Path(__file__).parent.parent / "outputs"

# 确保目录存在
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# 格式分类
FORMAT_CATEGORIES = {
    "document": ["pdf", "docx", "doc", "txt", "rtf"],
    "presentation": ["pptx", "ppt"],
    "spreadsheet": ["xlsx", "xls", "csv"],
    "image": ["png", "jpg", "jpeg", "gif", "bmp", "tiff", "webp", "svg"],
    "web": ["html", "htm"],
    "markup": ["md", "markdown"],
    "video": ["mp4", "mov", "avi", "mkv", "webm", "wmv", "flv"],
    "audio": ["mp3", "wav", "ogg", "aac", "flac"],
}

# 支持的转换路线
CONVERSION_MAP = {
    # PDF 转换
    ("pdf", "docx"): "pdf_to_word",
    ("pdf", "txt"): "pdf_to_text",
    ("pdf", "png"): "pdf_to_image",
    ("pdf", "jpg"): "pdf_to_image",
    ("pdf", "html"): "pdf_to_html",
    # Word 转换
    ("docx", "pdf"): "word_to_pdf",
    ("docx", "txt"): "word_to_text",
    ("docx", "html"): "word_to_html",
    ("docx", "pptx"): "word_to_ppt",
    # PPT 转换
    ("pptx", "pdf"): "ppt_to_pdf",
    ("pptx", "png"): "ppt_to_image",
    ("pptx", "jpg"): "ppt_to_image",
    ("pptx", "html"): "ppt_to_html",
    # Markdown 转换
    ("md", "html"): "md_to_html",
    ("md", "pdf"): "md_to_pdf",
    ("md", "docx"): "md_to_word",
    # HTML 转换
    ("html", "pdf"): "html_to_pdf",
    ("html", "docx"): "html_to_word",
    ("html", "txt"): "html_to_text",
    # 图片 转换
    ("png", "jpg"): "image_convert",
    ("png", "pdf"): "image_to_pdf",
    ("jpg", "png"): "image_convert",
    ("jpg", "pdf"): "image_to_pdf",
    ("bmp", "png"): "image_convert",
    ("bmp", "jpg"): "image_convert",
    ("bmp", "pdf"): "image_to_pdf",
    ("tiff", "png"): "image_convert",
    ("tiff", "jpg"): "image_convert",
    ("tiff", "pdf"): "image_to_pdf",
    ("webp", "png"): "image_convert",
    ("webp", "jpg"): "image_convert",
    # Excel 转换
    ("xlsx", "pdf"): "excel_to_pdf",
    ("xlsx", "csv"): "excel_to_csv",
    ("csv", "xlsx"): "csv_to_excel",
    # 文本转换
    ("txt", "pdf"): "text_to_pdf",
    ("txt", "docx"): "text_to_word",
    # 视频转换
    ("mp4", "gif"): "video_to_gif",
    ("mp4", "webm"): "video_to_webm",
    ("mov", "mp4"): "video_to_mp4",
    ("mov", "gif"): "video_to_gif",
    ("mov", "webm"): "video_to_webm",
    ("avi", "mp4"): "video_to_mp4",
    ("avi", "gif"): "video_to_gif",
    ("avi", "webm"): "video_to_webm",
    ("mkv", "mp4"): "video_to_mp4",
    ("mkv", "gif"): "video_to_gif",
    ("mkv", "webm"): "video_to_webm",
    ("webm", "mp4"): "video_to_mp4",
    ("webm", "gif"): "video_to_gif",
    ("wmv", "mp4"): "video_to_mp4",
    ("wmv", "gif"): "video_to_gif",
    ("wmv", "webm"): "video_to_webm",
    ("flv", "mp4"): "video_to_mp4",
    ("flv", "gif"): "video_to_gif",
    ("flv", "webm"): "video_to_webm",
    # 音频转换
    ("mp3", "wav"): "audio_convert",
    ("mp3", "ogg"): "audio_convert",
    ("mp3", "aac"): "audio_convert",
    ("mp3", "flac"): "audio_convert",
    ("wav", "mp3"): "audio_convert",
    ("wav", "ogg"): "audio_convert",
    ("wav", "aac"): "audio_convert",
    ("wav", "flac"): "audio_convert",
    ("ogg", "mp3"): "audio_convert",
    ("ogg", "wav"): "audio_convert",
    ("ogg", "aac"): "audio_convert",
    ("ogg", "flac"): "audio_convert",
    ("aac", "mp3"): "audio_convert",
    ("aac", "wav"): "audio_convert",
    ("aac", "ogg"): "audio_convert",
    ("aac", "flac"): "audio_convert",
    ("flac", "mp3"): "audio_convert",
    ("flac", "wav"): "audio_convert",
    ("flac", "ogg"): "audio_convert",
    ("flac", "aac"): "audio_convert",
}


def generate_filename(original_name: str, target_ext: str) -> str:
    """生成唯一的输出文件名"""
    stem = Path(original_name).stem
    unique_id = uuid.uuid4().hex[:8]
    return f"{stem}_{unique_id}.{target_ext}"


def get_file_extension(filename: str) -> str:
    """获取文件扩展名（小写，不含点）"""
    return Path(filename).suffix.lower().lstrip(".")


def get_format_category(ext: str) -> str:
    """获取格式所属分类"""
    for category, exts in FORMAT_CATEGORIES.items():
        if ext in exts:
            return category
    return "unknown"


def get_available_targets(source_ext: str) -> list[str]:
    """获取源格式可以转换的所有目标格式"""
    targets = []
    for (src, dst), _ in CONVERSION_MAP.items():
        if src == source_ext:
            targets.append(dst)
    return sorted(targets)


def cleanup_old_files(max_age_seconds: int = 3600):
    """清理超过指定时间的临时文件"""
    now = time.time()
    for directory in [UPLOAD_DIR, OUTPUT_DIR]:
        for f in directory.iterdir():
            if f.is_file() and (now - f.stat().st_mtime) > max_age_seconds:
                f.unlink()


def save_upload(file_storage) -> Path:
    """保存上传文件并返回路径"""
    filename = f"{uuid.uuid4().hex[:8]}_{file_storage.filename}"
    filepath = UPLOAD_DIR / filename
    file_storage.save(filepath)
    return filepath
