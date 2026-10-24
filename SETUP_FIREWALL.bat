@echo off
chcp 65001 >nul
title پیکربندی فایروال ویندوز ۱۱ - سامانه لجستیک حامی
color 0E

echo ==============================================================================
echo        تنظیم خودکار فایروال ویندوز ۱۱ جهت اشتراک سامانه حامی در شبکه LAN
echo ==============================================================================
echo.

:: بررسی دسترسی Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] برای اعمال قوانین فایروال به دسترسی Administrator نیاز است.
    echo [!] در حال درخواست دسترسی Administrator از ویندوز (UAC Prompt)...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"

echo [+] دسترسی Administrator تایید شد.
echo [*] در حال حذف قوانین قبلی مرتبط (در صورت وجود)...
netsh advfirewall firewall delete rule name="Hami Logistics System (Port 3000)" >nul 2>&1

echo [*] در حال ایجاد قانون ورود به فایروال ویندوز برای پورت 3000 (TCP)...
netsh advfirewall firewall add rule name="Hami Logistics System (Port 3000)" dir=in action=allow protocol=TCP localport=3000 profile=any description="Allow LAN clients to connect to Hami Logistics web server on TCP Port 3000"

if %errorlevel% equ 0 (
    color 0A
    echo.
    echo ==============================================================================
    echo [موفقیت] پورت 3000 در فایروال ویندوز ۱۱ با موفقیت باز شد!
    echo ==============================================================================
    echo.
    echo اکنون کلیه کامپیوترها، لپ تاپ ها و تبلت های متصل به همین مودم یا وای فای
    echo می توانند بدون مسدودی فایروال به سامانه حامی متصل شوند.
    echo.
    echo نکته مهم در ویندوز ۱۱:
    echo 1. وارد Windows Settings شوید (کلید Win + I).
    echo 2. به بخش Network & internet و سپس Wi-Fi یا Ethernet بروید.
    echo 3. نوع شبکه (Network profile type) را روی «Private network» قرار دهید تا
    echo    ویندوز 11 امکان دسترسی سایر کامپیوترهای شبکه محلی را مجاز نماید.
    echo.
) else (
    color 0C
    echo.
    echo [خطا] در ثبت قانون فایروال خطایی رخ داد. لطفاً مطمئن شوید که فایروال ویندوز فعال است.
    echo یا دستور زیر را به صورت دستی در CMD با Run as Administrator اجرا کنید:
    echo netsh advfirewall firewall add rule name="Hami Logistics System (Port 3000)" dir=in action=allow protocol=TCP localport=3000 profile=any
    echo.
)

echo ==============================================================================
echo برای خروج هر کلیدی را فشار دهید...
pause >nul
