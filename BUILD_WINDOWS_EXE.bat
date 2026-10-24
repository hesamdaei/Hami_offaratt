@echo off
chcp 65001 >nul
title ساخت فایل نصبی و پرتابل ویندوز (EXE) - سامانه حامی‌بار

echo ======================================================================
echo          سامانه جامع دیسپچ و ترابری حامی‌بار (HamiBar)
echo           فرآیند ساخت فایل اجرایی ویندوز (Windows EXE Package)
echo ======================================================================
echo.
echo در حال آماده‌سازی و ساخت نسخه مستقل دسکتاپ...
echo.

:: مرحله ۱: بیلد برنامه فرانت‌اند و کدهای استاتیک
echo [۱/۲] کامپایل کدهای فرانت‌اند (Vite Build)...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [خطا] در مرحله کامپایل فرانت‌اند خطایی رخ داد!
    pause
    exit /b %errorlevel%
)

:: مرحله ۲: پکیج‌بندی با Electron-Builder
echo.
echo [۲/۲] پکیج‌بندی فایل نصبی Setup.exe و نسخه پرتابل Portable.exe با Electron...
call npx electron-builder --win nsis portable
if %errorlevel% neq 0 (
    echo.
    echo [خطا] در مرحله ایجاد فایل اجرایی خطایی رخ داد.
    echo اگر ابزارهای الکترون نصب نیستند، دستور زیر را اجرا کنید:
    echo npm install --save-dev electron electron-builder
    pause
    exit /b %errorlevel%
)

echo.
echo ======================================================================
echo [عملیات موفق] فایل‌های اجرایی با موفقیت ساخته شدند!
echo مسیر ذخیره‌سازی: پوشه release\ در محل پروژه
echo.
echo فایل‌های تولید شده:
echo   ۱. فایل نصبی: HamiBar Dispatcher Setup.exe (با قابلیت نصب در منوی استارت و دسکتاپ)
echo   ۲. نسخه پرتابل: HamiBar Dispatcher Portable.exe (بدون نیاز به نصب، اجرای مستقیم با ۱ کلیک)
echo ======================================================================
echo.
pause
