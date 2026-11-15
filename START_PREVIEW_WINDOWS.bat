@echo off
rem Open the Preview over local HTTP (this computer only). Close the window to stop.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\windows\start_preview.ps1" %*
if errorlevel 1 pause
