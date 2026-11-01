# سامانه جامع مدیریت ناوگان، تردد و مرکز تماس حامی بار (`HamiBar Fleet Management`)

سامانه یکپارچه سازمانی جهت مدیریت ناوگان، حضور و غیاب رانندگان و پرسنل، پایش هوشمند سرویس روغن و بیمه‌نامه خودروها، مدیریت سفارش‌ها و بارنامه‌ها، محاسبه تعرفه حمل، و مرکز تماس هوشمند (CTI / VoIP Yealink) ویژه **حامی بار**.

---

## تکنولوژی‌های اصلی (Tech Stack)

- **فرانت‌اند:** React 19 + TypeScript 5.8 + Vite 6 + Tailwind CSS 4
- **بصری‌سازی و داشبورد:** Recharts 3 (نمودارهای تحلیلی وضعیت ناوگان به تفکیک فعال، در تعمیرگاه و در مرخصی) + Lucide Icons
- **بک‌اند و سرور شبکه محلی (LAN):** Node.js + Express (`server.ts` / `lan-server.cjs`)
- **دیتابیس و پشتیبان‌گیری:** دیتابیس متمرکز JSON (`/data/hami-database.json`) با قابلیت خودترمیمی از آخرین بکاپ و چرخش خودکار ۲۰ نسخه پشتیبان در `/data/backups`
- **مرکز تماس و کالرآیدی (CTI):** پروکسی مستقیم تلفن‌های Yealink (Action URI با پشتیبانی از پیش‌کد آزادسازی خط شهری)، وب‌هوک سانترال و شنونده کالرآیدی روی پورت UDP `6699` به همراه استریم زنده `SSE`
- **گزارش‌گیری و خروجی:** موتور تولید اکسل چندشیته راست‌به‌چپ (`ExcelJS` / `XLSX`) و قالب‌های چاپی استاندارد A4

---

## شروع سریع (Quick Start)

```bash
# نصب پکیج‌ها
npm install

# اجرای محیط توسعه روی پورت 3000
npm run dev

# بررسی تایپ‌ها (TypeScript)
npm run lint

# بیلد نسخه نهایی و اجرای سرور شبکه محلی (LAN)
npm run start:lan
```

---

## فهرست مستندات فنی پروژه

| فایل مستندات | توضیحات |
| :--- | :--- |
| [**`DEVELOPER_GUIDE.md`**](./DEVELOPER_GUIDE.md) | **مرجع جامع فنی توسعه‌دهندگان:** معماری سیستم، جدول کامل APIها، منطق واحد تاریخ تعویض روغن (`lastChangeDate`)، پروتکل تلفن یالینک و کالرآیدی و چک‌لیست بروزرسانی |
| [`ARCHITECTURE_AND_USER_MANAGEMENT.md`](./ARCHITECTURE_AND_USER_MANAGEMENT.md) | مستندات سیستم احراز هویت، سطوح دسترسی کاربران (RBAC) و لاگ ممیزی |
| [`LOCAL_SERVER_INSTALLATION_GUIDE.md`](./LOCAL_SERVER_INSTALLATION_GUIDE.md) | راهنمای نصب و راه‌اندازی سرور شبکه محلی (LAN) بدون نیاز به اینترنت |
| [`WINDOWS_DEPLOYMENT_AND_DEVELOPER_GUIDE.md`](./WINDOWS_DEPLOYMENT_AND_DEVELOPER_GUIDE.md) | راهنمای استقرار در ویندوز و اجرای اسکریپت‌های راه‌اندازی خودکار |
| [`BALE_INTEGRATION_GUIDE.md`](./BALE_INTEGRATION_GUIDE.md) | راهنمای اتصال بازوی اطلاع‌رسانی پیام‌رسان بله و ایتا |
