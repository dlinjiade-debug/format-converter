"""文件格式转换器 — Flask 主应用"""

import os
import sys
import importlib
from pathlib import Path
from flask import Flask, request, render_template, send_file, jsonify

# 将项目根目录加入 path
sys.path.insert(0, str(Path(__file__).parent))

from converters.utils import (
    UPLOAD_DIR, OUTPUT_DIR, CONVERSION_MAP,
    get_file_extension, get_available_targets,
    generate_filename, save_upload, cleanup_old_files,
)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024  # 100MB

# 格式显示名称
FORMAT_NAMES = {
    "pdf": "PDF 文档",
    "docx": "Word 文档",
    "doc": "Word 旧版",
    "pptx": "PowerPoint",
    "ppt": "PPT 旧版",
    "xlsx": "Excel 表格",
    "xls": "Excel 旧版",
    "csv": "CSV 表格",
    "txt": "纯文本",
    "html": "HTML 网页",
    "htm": "HTML 网页",
    "md": "Markdown",
    "markdown": "Markdown",
    "png": "PNG 图片",
    "jpg": "JPG 图片",
    "jpeg": "JPEG 图片",
    "gif": "GIF 图片",
    "bmp": "BMP 图片",
    "tiff": "TIFF 图片",
    "webp": "WebP 图片",
    "svg": "SVG 矢量图",
    "rtf": "RTF 文档",
}

# 转换器函数映射
CONVERTER_FUNCTIONS = {}


def _load_converter(func_name: str):
    """延迟加载转换器函数"""
    if func_name in CONVERTER_FUNCTIONS:
        return CONVERTER_FUNCTIONS[func_name]

    module_map = {
        "pdf_": "converters.pdf_converter",
        "word_": "converters.word_converter",
        "text_": "converters.word_converter",
        "ppt_": "converters.ppt_converter",
        "md_": "converters.markdown_converter",
        "html_": "converters.markdown_converter",
        "image_": "converters.image_converter",
        "images_": "converters.image_converter",
        "excel_": "converters.excel_converter",
        "csv_": "converters.excel_converter",
    }

    module_name = None
    for prefix, mod in module_map.items():
        if func_name.startswith(prefix):
            module_name = mod
            break

    if module_name is None:
        raise ValueError(f"未知的转换函数: {func_name}")

    module = importlib.import_module(module_name)
    func = getattr(module, func_name)
    CONVERTER_FUNCTIONS[func_name] = func
    return func


@app.route("/")
def index():
    """主页"""
    return render_template("index.html", format_names=FORMAT_NAMES)


@app.route("/api/targets", methods=["POST"])
def get_targets():
    """获取可用的目标格式"""
    data = request.get_json()
    source_format = data.get("format", "").lower().strip(".")

    # 处理一些别名
    alias_map = {"jpeg": "jpg", "htm": "html", "markdown": "md"}
    source_format = alias_map.get(source_format, source_format)

    targets = get_available_targets(source_format)
    result = [{"format": t, "name": FORMAT_NAMES.get(t, t.upper())} for t in targets]
    return jsonify({"targets": result, "source": source_format})


@app.route("/api/convert", methods=["POST"])
def convert():
    """执行格式转换"""
    if "file" not in request.files:
        return jsonify({"error": "请上传文件"}), 400

    file = request.files["file"]
    target_format = request.form.get("target", "").lower().strip(".")

    if not file.filename:
        return jsonify({"error": "未选择文件"}), 400

    if not target_format:
        return jsonify({"error": "请选择目标格式"}), 400

    # 解析源格式
    source_ext = get_file_extension(file.filename)
    alias_map = {"jpeg": "jpg", "htm": "html", "markdown": "md"}
    source_ext = alias_map.get(source_ext, source_ext)

    # 查找转换函数
    conversion_key = (source_ext, target_format)
    if conversion_key not in CONVERSION_MAP:
        return jsonify({"error": f"不支持 {source_ext} → {target_format} 的转换"}), 400

    func_name = CONVERSION_MAP[conversion_key]

    try:
        # 保存上传文件
        input_path = save_upload(file)

        # 生成输出路径
        output_filename = generate_filename(file.filename, target_format)
        output_path = OUTPUT_DIR / output_filename

        # 执行转换
        converter = _load_converter(func_name)
        result = converter(input_path, output_path)

        # 处理多文件输出（如 PDF → 图片）
        if isinstance(result, list):
            # 多文件：打包为 zip 或返回第一个
            if len(result) > 1:
                import zipfile
                zip_name = output_filename.rsplit(".", 1)[0] + ".zip"
                zip_path = OUTPUT_DIR / zip_name
                with zipfile.ZipFile(str(zip_path), "w", zipfile.ZIP_DEFLATED) as zf:
                    for p in result:
                        zf.write(str(p), p.name)
                # 清理图片文件
                for p in result:
                    p.unlink(missing_ok=True)
                return send_file(
                    str(zip_path), as_attachment=True,
                    download_name=f"{Path(file.filename).stem}_转换结果.zip",
                )
            elif result:
                output_path = result[0]
                output_filename = result[0].name

        if not output_path.exists():
            return jsonify({"error": "转换失败，未生成输出文件"}), 500

        return send_file(
            str(output_path), as_attachment=True,
            download_name=f"{Path(file.filename).stem}.{target_format}",
        )

    except Exception as e:
        return jsonify({"error": f"转换失败: {str(e)}"}), 500


@app.route("/api/cleanup", methods=["POST"])
def cleanup():
    """手动清理临时文件"""
    try:
        cleanup_old_files(max_age_seconds=0)
        return jsonify({"message": "清理完成"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    import sys, io, webbrowser, threading
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    print("[启动] 文件格式转换器")
    print("[地址] http://localhost:5000")

    # 延迟 1.5 秒后自动打开浏览器
    threading.Timer(1.5, lambda: webbrowser.open("http://localhost:5000")).start()

    app.run(debug=False, host="127.0.0.1", port=5000)
