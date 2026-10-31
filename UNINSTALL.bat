@echo off
chcp 65001 >nul
title حذف میانبرها و پاکسازی تنظیمات - سامانه لجستیک حامی بار
color 0C

echo ==============================================================================
echo        پاکسازی و حذف تنظیمات سامانه لجستیک و مدیریت ناوگان حامی بار
echo ==============================================================================
echo.

:: بررسی Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] برای حذف قوانین فایروال به دسترسی Administrator نیاز است.
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo [*] در حال حذف قانون فایروال ویندوز (Port 3000)...
netsh advfirewall firewall delete rule name="Hami Logistics System (Port 3000)" >nul 2>&1
echo [✔] قانون فایروال حذف شد.

echo [*] در حال حذف میانبرهای دسکتاپ و استارت منو...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$desktop = [Environment]::GetFolderPath('Desktop'); " ^
  "$sc = [System.IO.Path]::Combine($desktop, 'سامانه لجستیک حامی بار.lnk'); " ^
  "if (Test-Path $sc) { Remove-Item $sc -Force }; " ^
  "$programs = [Environment]::GetFolderPath('Programs'); " ^
  "$appFolder = [System.IO.Path]::Combine($programs, 'Hami Logistics'); " ^
  "if (Test-Path $appFolder) { Remove-Item $appFolder -Recurse -Force }; " ^
  "Write-Host '[✔] میانبرها پاک شدند.' -ForegroundColor Green;"

echo.
echo ==============================================================================
echo توجه: اطلاعات پایگاه داده و فایل های پشتیبان در پوشه data دست نخورده باقی ماندند.
echo در صورت عدم نیاز، می توانید پوشه پروژه را به صورت دستی حذف فرمایید.
echo ==============================================================================
echo.
pause
