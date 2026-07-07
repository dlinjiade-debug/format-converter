@echo off
chcp 65001 >nul 2>&1
title 文件格式转换器
echo 正在启动文件格式转换器...
cd /d "%~dp0"
python app.py
pause
