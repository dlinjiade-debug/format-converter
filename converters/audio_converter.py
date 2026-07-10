"""音频相关格式转换（需要系统安装 ffmpeg）"""

import subprocess
from pathlib import Path


def _check_ffmpeg():
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        raise RuntimeError("未找到 ffmpeg，请安装 ffmpeg 并添加到 PATH")


def _convert(input_path: Path, output_path: Path, extra_args: list[str] = None):
    _check_ffmpeg()
    cmd = ["ffmpeg", "-i", str(input_path), "-y"]
    if extra_args:
        cmd.extend(extra_args)
    cmd.append(str(output_path))
    subprocess.run(cmd, capture_output=True, check=True)
    return output_path


def audio_convert(input_path: Path, output_path: Path) -> Path:
    """音频格式互转（根据扩展名自动识别）"""
    ext = output_path.suffix.lower().lstrip(".")
    codec_map = {
        "mp3": ["-c:a", "libmp3lame", "-q:a", "2"],
        "wav": ["-c:a", "pcm_s16le"],
        "ogg": ["-c:a", "libvorbis", "-q:a", "4"],
        "aac": ["-c:a", "aac", "-b:a", "192k"],
        "flac": ["-c:a", "flac"],
    }
    args = codec_map.get(ext)
    if args is None:
        raise ValueError(f"不支持的音频格式: {ext}")
    return _convert(input_path, output_path, args)
