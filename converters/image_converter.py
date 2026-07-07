"""图片相关格式转换"""

from pathlib import Path


def image_convert(input_path: Path, output_path: Path) -> Path:
    """图片格式互转（png/jpg/bmp/tiff/webp/gif）"""
    from PIL import Image

    img = Image.open(str(input_path))
    target_fmt = output_path.suffix.lower().lstrip(".")

    # 处理透明度：转 JPG 需要去掉 alpha 通道
    if target_fmt in ("jpg", "jpeg", "bmp") and img.mode in ("RGBA", "LA", "PA"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "RGBA":
            background.paste(img, mask=img.split()[3])
        else:
            background.paste(img)
        img = background
    elif img.mode not in ("RGB", "RGBA", "L", "P"):
        img = img.convert("RGB")

    fmt_map = {"jpg": "JPEG", "jpeg": "JPEG", "png": "PNG", "bmp": "BMP",
               "tiff": "TIFF", "tif": "TIFF", "webp": "WEBP", "gif": "GIF"}
    save_fmt = fmt_map.get(target_fmt, target_fmt.upper())

    save_kwargs = {}
    if save_fmt == "JPEG":
        save_kwargs["quality"] = 95
        save_kwargs["optimize"] = True
    elif save_fmt == "PNG":
        save_kwargs["optimize"] = True

    img.save(str(output_path), format=save_fmt, **save_kwargs)
    return output_path


def image_to_pdf(input_path: Path, output_path: Path) -> Path:
    """图片 → PDF"""
    from PIL import Image

    img = Image.open(str(input_path))
    if img.mode == "RGBA":
        background = Image.new("RGB", img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[3])
        img = background
    elif img.mode != "RGB":
        img = img.convert("RGB")

    img.save(str(output_path), "PDF", resolution=150.0)
    return output_path


def images_to_pdf(input_paths: list[Path], output_path: Path) -> Path:
    """多张图片合并为一个 PDF"""
    from PIL import Image

    images = []
    for p in input_paths:
        img = Image.open(str(p))
        if img.mode == "RGBA":
            background = Image.new("RGB", img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")
        images.append(img)

    if images:
        first = images[0]
        rest = images[1:] if len(images) > 1 else []
        first.save(str(output_path), "PDF", resolution=150.0, save_all=True, append_images=rest)

    return output_path
