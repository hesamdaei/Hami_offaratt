# ==============================================================================
# سامانه لجستیک و مدیریت ناوگان حامی بار
# اسکریپت نصب و پیکربندی خودکار از طریق پاورشل (PowerShell Setup Wizard)
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "سامانه حامی بار - اسکریپت نصب خودکار PowerShell"

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "      سامانه یکپارچه مدیریت ناوگان و ترابری حامی بار - نصب اولیه ویندوز       " -ForegroundColor Yellow
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# 1. ارتقای سطح دسترسی به Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[!] نیاز به دسترسی Administrator جهت باز کردن فایروال و نصب بسته‌ها." -ForegroundColor Yellow
    Write-Host "[*] بازگشایی فرآیند با مجوز Administrator..." -ForegroundColor Gray
    Start-Process powershell.exe -ArgumentList ("-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"") -Verb RunAs
    exit
}

Write-Host "[✔] دسترسی Administrator احراز شد." -ForegroundColor Green
Write-Host "[*] مسیر پروژه: $ScriptDir" -ForegroundColor Gray
Write-Host ""

# 2. بررسی Node.js
Write-Host "--- [گام ۱/۶] بررسی Node.js و npm ---" -ForegroundColor Cyan
$nodeInstalled = Get-Command node -ErrorAction SilentlyContinue
if ($nodeInstalled) {
    $nodeVer = & node -v
    $npmVer = & npm -v
    Write-Host "[✔] Node.js شناسایی شد ($nodeVer, npm: $npmVer)" -ForegroundColor Green
} else {
    Write-Host "[!] Node.js یافت نشد. تلاش برای نصب خودکار LTS..." -ForegroundColor Yellow
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "[*] نصب از طریق Windows Package Manager (winget)..." -ForegroundColor Gray
        winget install OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements | Out-Null
    }
    
    # Reload Path
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "[*] دانلود فایل نصبی رسمی MSI از nodejs.org..." -ForegroundColor Gray
        $msiPath = "$env:TEMP\nodejs_setup.msi"
        Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi" -OutFile $msiPath
        Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" /qn /norestart" -Wait
        Remove-Item $msiPath -Force -ErrorAction SilentlyContinue
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    }
}

# 3. پوشه‌ها و فایل پایگاه داده
Write-Host "--- [گام ۲/۶] آماده‌سازی پوشه داده‌ها و فایل .env ---" -ForegroundColor Cyan
if (!(Test-Path "data")) { New-Item -ItemType Directory -Path "data" -Force | Out-Null }
if (!(Test-Path "data\backups")) { New-Item -ItemType Directory -Path "data\backups" -Force | Out-Null }
if (!(Test-Path ".env") -and (Test-Path ".env.example")) {
    Copy-Item ".env.example" ".env"
    Write-Host "[✔] فایل .env ایجاد شد." -ForegroundColor Green
}
if (!(Test-Path "data\hami-database.json") -and (Test-Path "data\default-seed.json")) {
    Copy-Item "data\default-seed.json" "data\hami-database.json"
    Write-Host "[✔] پایگاه داده اولیه بارگذاری شد." -ForegroundColor Green
}

# 4. نصب بسته‌ها
Write-Host "--- [گام ۳/۶] نصب پکیج‌ها (npm install) ---" -ForegroundColor Cyan
if (!(Test-Path "node_modules")) {
    & npm install --no-audit --no-fund
    Write-Host "[✔] پکیج‌ها نصب شدند." -ForegroundColor Green
} else {
    Write-Host "[✔] پوشه node_modules موجود است." -ForegroundColor Green
}

# 5. بیلد پروژه
Write-Host "--- [گام ۴/۶] کامپایل پروژه (npm run build) ---" -ForegroundColor Cyan
if (!(Test-Path "dist\index.html")) {
    & npm run build
    Write-Host "[✔] بیلد با موفقیت ایجاد شد." -ForegroundColor Green
} else {
    Write-Host "[✔] نسخه کامپایل شده در پوشه dist موجود است." -ForegroundColor Green
}

# 6. فایروال
Write-Host "--- [گام ۵/۶] باز کردن پورت ۳۰۰۰ در فایروال ویندوز ---" -ForegroundColor Cyan
Remove-NetFirewallRule -DisplayName "Hami Logistics System (Port 3000)" -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "Hami Logistics System (Port 3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Any -Description "Hami Fleet Server Port 3000" | Out-Null
Write-Host "[✔] پورت ۳۰۰۰ در فایروال ویندوز برای دسترسی LAN باز شد." -ForegroundColor Green

# 7. ساخت میانبر
Write-Host "--- [گام ۶/۶] ساخت میانبر دسکتاپ ---" -ForegroundColor Cyan
$WScript = New-Object -ComObject WScript.Shell
$Desktop = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $Desktop "سامانه لجستیک حامی بار.lnk"
$Shortcut = $WScript.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = Join-Path $ScriptDir "START_LAN_SERVER.bat"
$Shortcut.WorkingDirectory = $ScriptDir
$Shortcut.Description = "اجرای سرور محلی سامانه لجستیک حامی بار"
$Shortcut.IconLocation = "$env:SystemRoot\System32\imageres.dll,67"
$Shortcut.Save()
Write-Host "[✔] میانبر دسکتاپ ساخته شد: $ShortcutPath" -ForegroundColor Green

# اعلام آدرس‌ها
Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "               نصب اولیه با موفقیت کامل به پایان رسید!                        " -ForegroundColor Yellow
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "آدرس‌های دسترسی به سامانه:" -ForegroundColor White
Write-Host "  سیستم جاری:  http://localhost:3000" -ForegroundColor Cyan
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | ForEach-Object {
    Write-Host "  شبکه محلی:   http://$($_.IPAddress):3000 ($($_.InterfaceAlias))" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "برای راه‌اندازی سرور و باز شدن مرورگر کلید Enter را فشار دهید..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Start-Process "http://localhost:3000"
Start-Process "cmd.exe" -ArgumentList "/c `"$ScriptDir\START_LAN_SERVER.bat`""
