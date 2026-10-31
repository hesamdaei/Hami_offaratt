@echo off
chcp 65001 >nul
title سامانه لجستیک و مدیریت ناوگان حامی بار - نصب و راه اندازی اولیه (Setup Wizard)
color 0B

echo ==============================================================================
echo        سامانه یکپارچه مدیریت ناوگان، تردد پرسنل و ترابری حامی بار
echo                     نصب خودکار و آماده سازی اولیه (Setup)
echo ==============================================================================
echo.

:: 1. بررسی و ارتقای سطح دسترسی به Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] برای اعمال تنظیمات فایروال، شورتکات ها و پیش نیازها، به دسترسی Administrator نیاز است.
    echo [!] در حال درخواست دسترسی Administrator (UAC Prompt)... لطفاً گزینه Yes را بزنید.
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"

echo [+] دسترسی سطح مدیر (Administrator) با موفقیت احراز شد.
echo [*] مسیر پروژه: %CD%
echo.

:: ------------------------------------------------------------------------------
:: گام اول: بررسی و نصب Node.js و npm
:: ------------------------------------------------------------------------------
echo ==============================================================================
echo [گام ۱ از ۶] بررسی پیش نیاز اصلی سیستم (Node.js LTS)...
echo ==============================================================================

where node >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%v in ('node -v') do set "NODE_VER=%%v"
    for /f "tokens=*" %%v in ('npm -v') do set "NPM_VER=%%v"
    echo [✔] نرم افزار Node.js بر روی این سیستم نصب است:
    echo     - نسخه Node: %NODE_VER%
    echo     - نسخه npm:  %NPM_VER%
    echo.
) else (
    echo [!] نرم افزار Node.js روی این سیستم یافت نشد.
    echo [*] در حال تلاش جهت نصب خودکار آخرین نسخه LTS از طریق ابزار Windows Package Manager...
    
    where winget >nul 2>nul
    if %errorlevel% equ 0 (
        echo [*] ابزار winget شناسایی شد. در حال دانلود و نصب خودکار Node.js LTS...
        winget install OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
        
        :: رفرش کردن متغیر محیطی PATH در همین نشست
        call :RefreshPath
    )

    :: بررسی مجدد پس از تلاش نصب
    where node >nul 2>nul
    if %errorlevel% neq 0 (
        echo [*] در حال دانلود مستقیم فایل نصبی رسمی Node.js LTS از سرور رسمی...
        powershell -NoProfile -ExecutionPolicy Bypass -Command ^
          "Write-Host '[*] دانلود Node.js MSI...' -ForegroundColor Cyan; " ^
          "$msi = [System.IO.Path]::Combine($env:TEMP, 'nodejs_setup.msi'); " ^
          "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' -OutFile $msi; " ^
          "Write-Host '[*] اجرای نصب بی صدا...' -ForegroundColor Cyan; " ^
          "Start-Process msiexec.exe -ArgumentList '/i', $msi, '/qn', '/norestart' -Wait; " ^
          "Remove-Item $msi -Force -ErrorAction SilentlyContinue;"

        call :RefreshPath
    )

    where node >nul 2>nul
    if %errorlevel% neq 0 (
        color 0C
        echo.
        echo [خطا] امکان نصب خودکار Node.js فراهم نشد.
        echo لطفاً نرم افزار رایگان Node.js (نسخه LTS) را از نشانی زیر دریافت و نصب کنید:
        echo    https://nodejs.org
        echo سپس مجدداً این فایل را اجرا نمایید.
        echo.
        pause
        exit /b
    ) else (
        echo [✔] نرم افزار Node.js با موفقیت نصب و فعال گردید!
        echo.
    )
)

:: ------------------------------------------------------------------------------
:: گام دوم: ایجاد و اعتبارسنجی پوشه داده ها، تنظیمات و پایگاه داده اولیه
:: ------------------------------------------------------------------------------
echo ==============================================================================
echo [گام ۲ از ۶] آماده سازی پوشه های پایگاه داده و تنظیمات سامانه...
echo ==============================================================================

if not exist "data" (
    mkdir "data"
    echo [+] پوشه پایگاه داده data ایجاد شد.
)

if not exist "data\backups" (
    mkdir "data\backups"
    echo [+] پوشه نسخه های پشتیبان data\backups ایجاد شد.
)

if not exist ".env" (
    if exist ".env.example" (
        copy /Y ".env.example" ".env" >nul
        echo [+] فایل پیکربندی .env بر اساس فایل نمونه ساخته شد.
    ) else (
        echo PORT=3000 > ".env"
        echo LAN_PORT=3000 >> ".env"
        echo HOST=0.0.0.0 >> ".env"
        echo [+] فایل .env جدید با پورت پیش فرض 3000 ایجاد شد.
    )
) else (
    echo [✔] فایل تنظیمات .env از قبل موجود است.
)

:: بررسی دیتابیس اولیه
if not exist "data\hami-database.json" (
    if exist "data\default-seed.json" (
        copy /Y "data\default-seed.json" "data\hami-database.json" >nul
        echo [+] پایگاه داده اولیه از روی داده های مرجع ایجاد گردید.
    ) else (
        echo {} > "data\hami-database.json"
        echo [+] فایل دیتابیس اولیه ایجاد گردید.
    )
) else (
    echo [✔] پایگاه داده سامانه (data\hami-database.json) آماده است.
)
echo.

:: ------------------------------------------------------------------------------
:: گام سوم: نصب کتابخانه ها و پکیج های پروژه (npm install)
:: ------------------------------------------------------------------------------
echo ==============================================================================
echo [گام ۳ از ۶] بررسی و نصب کتابخانه های نرم افزاری (npm install)...
echo ==============================================================================

if not exist "node_modules" (
    echo [*] در حال نصب بسته های پروژه... لطفاً چند لحظه شکیبا باشید.
    call npm install --no-audit --no-fund
    if %errorlevel% neq 0 (
        echo [خطا] در اجرای npm install مشکلی پیش آمد. اتصال اینترنت را چک کنید.
        pause
        exit /b
    )
    echo [✔] کلیه پکیج ها و وابستگی ها با موفقیت نصب شدند.
) else (
    echo [✔] پوشه کتابخانه های پروژه (node_modules) موجود و آماده است.
)
echo.

:: ------------------------------------------------------------------------------
:: گام چهارم: کامپایل و بیلد نسخه تولیدی سامانه (npm run build)
:: ------------------------------------------------------------------------------
echo ==============================================================================
echo [گام ۴ از ۶] کامپایل و بیلد نسخه نهایی نرم افزار (npm run build)...
echo ==============================================================================

if not exist "dist\index.html" (
    echo [*] در حال تولید فایل های نهایی بهینه سازی شده (Vite Production Build)...
    call npm run build
    if %errorlevel% neq 0 (
        echo [خطا] در کامپایل پروژه خطایی رخ داد.
        pause
        exit /b
    )
    echo [✔] نسخه تحت وب و PWA با موفقیت کامپایل شد (پوشه dist).
) else (
    echo [✔] خروجی های کامپایل شده قبلاً ساخته شده اند.
    echo [*] در صورت نیاز به به روزرسانی کدها، دستور npm run build را به طور مستقل می توانید اجرا کنید.
)
echo.

:: ------------------------------------------------------------------------------
:: گام پنجم: پیکربندی خودکار فایروال ویندوز برای پورت 3000
:: ------------------------------------------------------------------------------
echo ==============================================================================
echo [گام ۵ از ۶] باز کردن پورت 3000 در فایروال ویندوز برای دسترسی شبکه محلی (LAN)...
echo ==============================================================================

netsh advfirewall firewall delete rule name="Hami Logistics System (Port 3000)" >nul 2>&1
netsh advfirewall firewall add rule name="Hami Logistics System (Port 3000)" dir=in action=allow protocol=TCP localport=3000 profile=any description="Allow all LAN devices to access Hami Logistics and Fleet Management Web Server" >nul 2>&1

if %errorlevel% equ 0 (
    echo [✔] پورت 3000 فایروال ویندوز با موفقیت باز شد. کلیه گوشی ها، لپ تاپ ها و تبلت های متصل به شبکه محلی می توانند به سامانه متصل شوند.
) else (
    echo [!] هشدار: امکان ثبت قانون در فایروال فراهم نشد. می توانید به صورت دستی پورت 3000 را باز نمایید.
)
echo.

:: ------------------------------------------------------------------------------
:: گام ششم: ساخت شورتکات روی دسکتاپ و منوی استارت
:: ------------------------------------------------------------------------------
echo ==============================================================================
echo [گام ۶ از ۶] ساخت میانبرهای دسترسی سریع روی دسکتاپ و منوی استارت...
echo ==============================================================================

set "TARGET_BAT=%~dp0START_LAN_SERVER.bat"
set "WORKING_DIR=%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$desktop = [Environment]::GetFolderPath('Desktop'); " ^
  "$scPath = [System.IO.Path]::Combine($desktop, 'سامانه لجستیک حامی بار.lnk'); " ^
  "$shortcut = $ws.CreateShortcut($scPath); " ^
  "$shortcut.TargetPath = '%TARGET_BAT%'; " ^
  "$shortcut.WorkingDirectory = '%WORKING_DIR%'; " ^
  "$shortcut.Description = 'راه اندازی سرور محلی و ورود به سامانه لجستیک حامی بار'; " ^
  "$shortcut.IconLocation = '%SystemRoot%\System32\imageres.dll,67'; " ^
  "$shortcut.Save(); " ^
  "$programs = [Environment]::GetFolderPath('Programs'); " ^
  "$appFolder = [System.IO.Path]::Combine($programs, 'Hami Logistics'); " ^
  "if (!(Test-Path $appFolder)) { New-Item -ItemType Directory -Path $appFolder -Force | Out-Null }; " ^
  "$menuSc = [System.IO.Path]::Combine($appFolder, 'سامانه لجستیک حامی بار.lnk'); " ^
  "$shortcut2 = $ws.CreateShortcut($menuSc); " ^
  "$shortcut2.TargetPath = '%TARGET_BAT%'; " ^
  "$shortcut2.WorkingDirectory = '%WORKING_DIR%'; " ^
  "$shortcut2.Description = 'راه اندازی سرور محلی و ورود به سامانه لجستیک حامی بار'; " ^
  "$shortcut2.IconLocation = '%SystemRoot%\System32\imageres.dll,67'; " ^
  "$shortcut2.Save(); " ^
  "Write-Host '[✔] میانبر دسکتاپ و منوی استارت ایجاد شد.' -ForegroundColor Green;"

echo.
echo ==============================================================================
echo                    [پایان موفقیت آمیز نصب و ست آپ]
echo ==============================================================================
echo.
echo سامانه حامی بار با موفقیت کامل آماده بهره برداری گردید!
echo.
echo آدرس های دسترسی به سامانه:
echo   [1] روی همین کامپیوتر:
echo       http://localhost:3000
echo.
echo   [2] روی تبلت ها، گوشی ها و سایر کامپیوترهای متصل به وای فای یا مودم:
powershell -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | ForEach-Object { Write-Host '      -> http://' $_.IPAddress ':3000  (' $_.InterfaceAlias ')' -ForegroundColor Cyan }"

echo.
echo ------------------------------------------------------------------------------
echo آیا مایلید سرور هم اکنون راه اندازی شده و سامانه در مرورگر باز شود؟
echo کلید Enter را بزنید تا برنامه باز شود (یا پنجره را ببندید)...
pause >nul

start "" http://localhost:3000
call "%TARGET_BAT%"
exit /b

:: تابع کمکی جهت به روزرسانی متغیر PATH
:RefreshPath
for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "PATH=%%b;%PATH%"
for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "PATH=%%b;%PATH%"
goto :eof
