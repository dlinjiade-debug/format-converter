"""视频相关格式转换（需要系统安装 ffmpeg）"""

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


def video_to_mp4(input_path: Path, output_path: Path) -> Path:
    """视频 → MP4(H.264)"""
    return _convert(input_path, output_path, [
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
    ])


def video_to_gif(input_path: Path, output_path: Path) -> Path:
    """视频 → GIF"""
    return _convert(input_path, output_path, [
        "-vf", "fps=10,scale=480:-1:flags=lanczos,palettegen=stats_mode=diff",
        "-loop", "0",
    ])
    # palette 方式需要两趟，简化用单趟
    # return _convert(input_path, output_path, [
    #     "-vf", "fps=10,scale=480:-1:flags=lanczos",
    #     "-loop", "0",
    # ])


def video_to_webm(input_path: Path, output_path: Path) -> Path:
    """视频 → WebM"""
    return _convert(input_path, output_path, [
        "-c:v", "libvpx", "-crf", "10", "-b:v", "1M",
        "-c:a", "libvorbis",
    ])
