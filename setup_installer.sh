#!/usr/bin/env bash
# ==============================================================================
# سامانه لجستیک و مدیریت ناوگان حامی بار
# اسکریپت نصب و پیکربندی خودکار لینوکس و اوبونتو (Linux Server Setup Wizard)
# ==============================================================================

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}==============================================================================${NC}"
echo -e "${YELLOW}       سامانه یکپارچه لجستیک و ترابری حامی بار - نصب خودکار سرور لینوکس       ${NC}"
echo -e "${CYAN}==============================================================================${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 1. بررسی دسترسی روت یا sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}[!] لطفاً این اسکریپت را با sudo یا دسترسی root اجرا کنید:${NC}"
  echo -e "    sudo bash $0"
  exit 1
fi

echo -e "${GREEN}[✔] دسترسی root تایید شد.${NC}"
echo -e "مسیر پروژه: $SCRIPT_DIR"
echo ""

# 2. بررسی و نصب Node.js (v20 LTS)
echo -e "${CYAN}--- [گام ۱/۶] بررسی Node.js و npm ---${NC}"
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}[✔] Node.js نصب است: $NODE_VERSION${NC}"
else
    echo -e "${YELLOW}[*] Node.js یافت نشد. در حال نصب خودکار Node.js 20 LTS...${NC}"
    if command -v apt-get >/dev/null 2>&1; then
        apt-get update -y
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    elif command -v yum >/dev/null 2>&1; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
        yum install -y nodejs
    else
        echo -e "${RED}[خطا] لطفاً Node.js نسخه 20 به بالا را به صورت دستی روی این توزیع لینوکس نصب نمایید.${NC}"
        exit 1
    fi
fi

# 3. ایجاد دایرکتوری داده‌ها و تنظیمات
echo -e "${CYAN}--- [گام ۲/۶] آماده‌سازی پوشه ذخیره‌سازی داده‌ها ---${NC}"
mkdir -p "$SCRIPT_DIR/data/backups"
chmod -R 775 "$SCRIPT_DIR/data"

if [ ! -f "$SCRIPT_DIR/.env" ] && [ -f "$SCRIPT_DIR/.env.example" ]; then
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
    echo -e "${GREEN}[✔] فایل .env ایجاد شد.${NC}"
fi

if [ ! -f "$SCRIPT_DIR/data/hami-database.json" ] && [ -f "$SCRIPT_DIR/data/default-seed.json" ]; then
    cp "$SCRIPT_DIR/data/default-seed.json" "$SCRIPT_DIR/data/hami-database.json"
    echo -e "${GREEN}[✔] دیتابیس اولیه با داده‌های پیش‌فرض بارگذاری شد.${NC}"
fi

# 4. نصب وابستگی‌های پروژه
echo -e "${CYAN}--- [گام ۳/۶] نصب بسته‌های npm ---${NC}"
npm install --no-audit --no-fund
echo -e "${GREEN}[✔] بسته‌های npm با موفقیت نصب شدند.${NC}"

# 5. بیلد پروژه
echo -e "${CYAN}--- [گام ۴/۶] ساخت فایل‌های بهینه‌سازی‌شده نهایی (npm run build) ---${NC}"
npm run build
echo -e "${GREEN}[✔] ساخت برنامه تحت وب به پایان رسید.${NC}"

# 6. پیکربندی فایروال (UFW)
echo -e "${CYAN}--- [گام ۵/۶] باز کردن پورت ۳۰۰۰ در فایروال لینوکس ---${NC}"
if command -v ufw >/dev/null 2>&1; then
    ufw allow 3000/tcp comment 'Hami Logistics LAN Port' >/dev/null 2>&1 || true
    echo -e "${GREEN}[✔] پورت 3000 در UFW مجاز شد.${NC}"
elif command -v firewall-cmd >/dev/null 2>&1; then
    firewall-cmd --permanent --add-port=3000/tcp >/dev/null 2>&1 || true
    firewall-cmd --reload >/dev/null 2>&1 || true
    echo -e "${GREEN}[✔] پورت 3000 در firewalld مجاز شد.${NC}"
fi

# 7. پیکربندی سرویس دائمی systemd (Auto-start on boot)
echo -e "${CYAN}--- [گام ۶/۶] ثبت به عنوان سرویس سیستمی خودکار (systemd) ---${NC}"
SERVICE_FILE="/etc/systemd/system/hami-fleet.service"
CURRENT_USER="${SUDO_USER:-$USER}"

cat <<EOF > "$SERVICE_FILE"
[Unit]
Description=Hami Logistics and Fleet Management LAN Server
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$SCRIPT_DIR
ExecStart=$(which node) $SCRIPT_DIR/lan-server.cjs
Restart=always
RestartSec=5
Environment=PORT=3000
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable hami-fleet.service
systemctl restart hami-fleet.service
echo -e "${GREEN}[✔] سرویس hami-fleet.service فعال و راه‌اندازی شد.${NC}"

echo ""
echo -e "${CYAN}==============================================================================${NC}"
echo -e "${GREEN}             سامانه حامی بار با موفقیت کامل بر روی سرور نصب گردید!            ${NC}"
echo -e "${CYAN}==============================================================================${NC}"
echo ""
echo -e "آدرس‌های دسترسی در شبکه:"
echo -e "  - محلی سرور: ${YELLOW}http://localhost:3000${NC}"

# استخراج IP‌های فعال شبکه
if command -v hostname >/dev/null 2>&1; then
    IPS=$(hostname -I 2>/dev/null || ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1')
    for ip in $IPS; do
        echo -e "  - شبکه محلی: ${CYAN}http://$ip:3000${NC}"
    done
fi

echo ""
echo -e "${GREEN}دستورات مدیریت سرویس:${NC}"
echo -e "  بررسی وضعیت:  ${YELLOW}sudo systemctl status hami-fleet${NC}"
echo -e "  مشاهده لاگ:   ${YELLOW}sudo journalctl -u hami-fleet -f${NC}"
echo -e "  ری‌استارت:    ${YELLOW}sudo systemctl restart hami-fleet${NC}"
echo -e "  توقف سرویس:   ${YELLOW}sudo systemctl stop hami-fleet${NC}"
echo ""
