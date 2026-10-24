@echo off
chcp 65001 >nul
title ایجاد میانبر دسکتاپ سامانه لجستیک حامی
color 0B

echo ==============================================================================
echo        ایجاد میانبر ۱ کلیکی سامانه حامی روی دسکتاپ ویندوز ۱۱
echo ==============================================================================
echo.

cd /d "%~dp0"

set "TARGET_BAT=%~dp0START_LAN_SERVER.bat"
set "WORKING_DIR=%~dp0"

echo [*] در حال ساخت شورتکات روی دسکتاپ...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$desktop = [Environment]::GetFolderPath('Desktop'); " ^
  "$scPath = [System.IO.Path]::Combine($desktop, 'سامانه لجستیک حامی.lnk'); " ^
  "$shortcut = $ws.CreateShortcut($scPath); " ^
  "$shortcut.TargetPath = '%TARGET_BAT%'; " ^
  "$shortcut.WorkingDirectory = '%WORKING_DIR%'; " ^
  "$shortcut.Description = 'راه اندازی سرور محلی سامانه لجستیک و ترابری حامی'; " ^
  "$shortcut.IconLocation = '%SystemRoot%\System32\imageres.dll,67'; " ^
  "$shortcut.Save(); " ^
  "Write-Host '[+] میانبر با موفقیت روی دسکتاپ ایجاد شد: ' $scPath -ForegroundColor Green"

if %errorlevel% equ 0 (
    echo.
    echo ==============================================================================
    echo [موفقیت] شورتکات «سامانه لجستیک حامی» روی دسکتاپ شما قرار گرفت!
    echo اکنون هر زمان که بخواهید می توانید با یک کلیک روی آیکون دسکتاپ،
    echo سرور شبکه محلی را اجرا کنید و برنامه در مرورگر شما باز خواهد شد.
    echo ==============================================================================
) else (
    echo.
    echo [خطا] در ایجاد خودکار میانبر مشکلی رخ داد.
    echo می توانید روی فایل START_LAN_SERVER.bat راست کلیک کرده و گزینه:
    echo   Show more options -> Send to -> Desktop (create shortcut)
    echo را انتخاب کنید.
)

echo.
pause
