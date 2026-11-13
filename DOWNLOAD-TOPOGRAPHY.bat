@echo off
cd /d "%~dp0"
python download-mars-images.py --topography-only
pause
