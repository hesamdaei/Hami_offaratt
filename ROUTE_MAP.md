# مستند جامع معماری مسیریابی و آدرس‌دهی سامانه حامی (Hami)
## نسخه سامانه: Hami Beta 1.1786.1
**تاریخ بازنگری:** پاییز ۱۴۰۳  
**معماری:** معماری یکپارچه تک‌صفحه‌ای (Single Page Application - SPA) با آدرس پایه یکتا و تاریخچه مرورگر استاندارد (HTML5 History API)

---

## ۱. اصول و ساختار کلی مسیریابی (Routing Architecture)

سامانه حامی بر اساس استانداردهای مدرن نرم‌افزارهای سازمانی طراحی شده است:

1. **آدرس پایه مشترک (Base URL & Single IP):**
   - تمامی بخش‌ها، زیرسیستم‌ها و ابزارهای نرم‌افزار روی یک IP سرور و یک پورت مشترک (`http://localhost:3000` در شبکه لوکال یا IP مشترک سرور شبکه مانند `http://192.168.1.100:3000`) اجرا می‌شوند.
   - از ایجاد سرورها یا پورت‌های پراکنده و متفرقه برای هر بخش پرهیز شده است.

2. **پوسته کاربری و نشست یکپارچه (Shared Layout & Session):**
   - هدر (Header)، سایدبار ناوبری (Sidebar12)، نوار مسیر پویا (BreadcrumbsBar)، اعلان‌ها و نشست امنیتی کاربری میان تمام بخش‌ها مشترک هستند.
   - وضعیت احراز هویت (`currentUser`) در جابه‌جایی میان مسیرها حفظ می‌شود.

3. **سازگاری کامل با مرورگر:**
   - با وارد کردن مستقیم URL هر بخش (Direct URL Navigation)، همان صفحه بارگذاری می‌شود.
   - با تازه‌سازی صفحه (Browser Refresh)، خطای 404 سرور رخ نمی‌دهد (پشتیبانی با Vite SPA Dev Middleware و Node.js Express Catch-All).
   - دکمه‌های بازگشت (Back) و جلو (Forward) مرورگر با رویداد `popstate` هماهنگ هستند.
   - در صورت ورود به مسیر تعریف‌نشده، صفحه اختصاصی ۴۰۴ (`NotFoundView`) با دکمه بازگشت و دسترسی سریع به بخش‌های اصلی نمایش داده می‌شود.

4. **امنیت و کنترل دسترسی مسیرها (Route Guards & RBAC):**
   - دسترسی به هر مسیر بر مبنای جدول مجوزهای نقش کاربر (`permissions` و `isMasterAdmin`) سنجیده می‌شود.
   - در صورت تلاش برای ورود مستقیم به مسیر فاقد مجوز، صفحه امنیتی ۴۰۳ (`AccessDeniedView`) نمایش یافته و لاگ امنیتی در سیستم ثبت می‌گردد.
   - صدور خروجی اکسل و گزارش‌های تحلیلی منحصراً به مدیر ارشد (`usr-master-admin`) محدود است.

---

## ۲. جدول جامع مسیرهای نرم‌افزار (Route Map Matrix)

| مسیر (Path) | شناسه مسیر | عنوان فارسی | کامپوننت مقصد | سطح دسترسی لازم | نقش‌های مجاز | APIهای مرتبط در سرور |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | `home` | صفحه اصلی / ورود | ریدایرکت خودکار به داشبورد | ورود به سیستم | همه کاربران مجاز | `POST /api/auth/login` |
| `/dashboard` | `dashboard` | داشبورد عملیات | `OperationalDashboardView` | دسترسی عمومی | مدیر ارشد، مدیر ترابری، اپراتور، راننده | `GET /api/database` |
| `/attendance` | `attendance` | حضور و غیاب رانندگان و پرسنل | `AttendanceManagementHubView` | `attendance: view/full` | مدیر ارشد، اپراتور شیفت | `POST /api/database/save` |
| `/drivers` | `drivers` | پرونده و کارنامه رانندگان | `DriversDirectoryView` | `drivers: view/full` | مدیر ارشد، مدیر ترابری، اپراتور | `GET /api/database` |
| `/drivers/new` | `drivers-new` | ثبت راننده جدید | `DriversDirectoryView` + فرم مدال | `drivers: full` | مدیر ارشد، مدیر ترابری | `POST /api/database/save` |
| `/drivers/:id` | `drivers-detail` | پرونده کامل راننده | `DriversDirectoryView` (کارت راننده) | `drivers: view/full` | مدیر ارشد، مدیر ترابری، اپراتور | `GET /api/database` |
| `/drivers/:id/edit` | `drivers-edit` | ویرایش مشخصات راننده | `DriversDirectoryView` + ویرایش | `drivers: full` | مدیر ارشد، مدیر ترابری | `POST /api/database/save` |
| `/trucks` یا `/vehicles` | `trucks` | ناوگان، خودروها و تعویض روغن | `OilServiceManagementView` | `oilService: view/full` | مدیر ارشد، مدیر ترابری | `GET /api/database`, `POST /api/service-rules/save` |
| `/trucks/new` | `trucks-new` | ثبت خودرو و کامیونت جدید | `OilServiceManagementView` + فرم ثبت | `oilService: full` | مدیر ارشد، مدیر ترابری | `POST /api/database/save` |
| `/trucks/:id` | `trucks-detail` | شناسنامه فنی و سوابق سرویس | `OilServiceManagementView` (کارت خودرو) | `oilService: view/full` | مدیر ارشد، مدیر ترابری | `GET /api/database` |
| `/assignments` | `assignments` | تخصیص رانندگان به خودروها | `VehicleAssignmentHubView` | `oilService: view/full` | مدیر ارشد، مدیر ترابری | `POST /api/database/save` |
| `/handover` | `handover` | صورت‌جلسه تحویل و تحول ناوگان | `VehicleHandoverManager` | `regulations: view/full` | مدیر ارشد، مدیر ترابری | `POST /api/database/save` |
| `/staff` | `staff` | پرونده پرسنل ستادی و انبار | `StaffDirectoryView` | `staff: view/full` | مدیر ارشد، اپراتور شیفت | `POST /api/database/save` |
| `/customers` | `customers` | پرتال مشتریان و رهگیری بار | `CargoTrackingCustomerPortal` | دسترسی عمومی | همه کاربران و مشتریان | `GET /api/database` |
| `/orders` | `orders` | مدیریت بارها و رزرو خودرو | `UnifiedOrdersAndReservationHub` | دسترسی عمومی | مدیر ارشد، اپراتور، مشتری | `POST /api/database/save` |
| `/orders/new` | `orders-new` | استعلام تعرفه و ثبت سفارش | `UnifiedOrdersAndReservationHub` (فرم جدید) | دسترسی عمومی | مدیر ارشد، اپراتور، مشتری | `POST /api/database/save` |
| `/orders/:id` | `orders-detail` | رهگیری وضعیت سفارش | `UnifiedOrdersAndReservationHub` (جزئیات) | دسترسی عمومی | مدیر ارشد، اپراتور، مشتری | `GET /api/database` |
| `/operations` | `operations` | مانیتورینگ اعزام و دیسپچینگ | `OperationsDashboardView` | `attendance/drivers: view` | مدیر ارشد، مدیر ترابری، اپراتور | `GET /api/database` |
| `/finance` | `finance` | امور مالی، نرخ کرایه و تعرفه | `ReservationGuideAndCalculatorView` | دسترسی عمومی | مدیر ارشد، حسابداری، اپراتور | `GET /api/database` |
| `/reports` | `reports` | گزارش‌های مدیریتی و خروجی اکسل | `ReportsManagementView` | مدیر ارشد (`isMasterAdmin`) | منحصراً مدیر ارشد سامانه | `POST /api/reports/export-excel` |
| `/users` | `users` | مدیریت کاربران و سطوح دسترسی | `IntegratedUserAndAuditHubView` | `userManagement: true` | منحصراً مدیر ارشد سامانه | `POST /api/users/update`, `POST /api/users/create` |
| `/activity-logs` | `activity-logs` | وقایع‌نگاری و لاگ‌های امنیتی | `IntegratedUserAndAuditHubView` (تب وقایع) | `userManagement: true` | منحصراً مدیر ارشد سامانه | `GET /api/audit-logs` |
| `/phonebook` | `phonebook` | دفترچه تلفن و سانترال هوشمند | `PhonebookView` | دسترسی عمومی | همه کاربران سازمانی | `POST /api/voip/call` |
| `/regulations` | `regulations` | آیین‌نامه انضباطی و تعهدنامه | `DriverRegulationsView` | `regulations: view/full` | مدیر ارشد، مدیر ترابری | `POST /api/regulations/save` |
| `/settings` | `settings` | تنظیمات سیستم، شبکه و سانترال | `MasterAdminModal` | مدیر ارشد (`isMasterAdmin`) | منحصراً مدیر ارشد سامانه | `GET /api/system/network-ips`, `POST /api/voip/config` |
| `*` | `not-found` | صفحه ۴۰۴ مسیر یافت نشد | `NotFoundView` | عمومی | همه کاربران | - |

---

## ۳. نحوه پیاده‌سازی فنی مسیریاب (Implementation Details)

### ۱. ماژول‌های مسیریابی
- **`src/router/routes.ts`**: تعریف آرایه مسیرها (`APP_ROUTES`)، استخراج پارامترهای داینامیک از URL (`matchAppRoute`)، و اعتبارسنجی سطح دسترسی کاربر (`canUserAccessRoute`).
- **`src/router/RouterContext.tsx`**: ارائه‌دهنده کانتکست عمومی ناوبری (`AppRouterProvider`)، هوک `useAppRouter()`، کامپوننت `<AppRouteLink>` و کنترل خودکار `popstate` برای تاریخچه مرورگر.
- **`src/router/tabMapping.ts`**: نگاشت دوطرفه پایدار میان شناسه‌های تب‌ها (`ActiveAppTab`) و مسیرهای URL استاندارد انگلیسی (`tabToPath` و `pathToTab`).
- **`src/components/BreadcrumbsBar.tsx`**: نوار ناوبری سلسله‌مراتبی داینامیک برای نمایش موقعیت فعلی کاربر و جابه‌جایی سریع میان شاخه‌ها.
- **`src/components/NotFoundView.tsx`**: نمای رسمی خطای ۴۰۴ برای آدرس‌های نامعتبر.
- **`src/components/AccessDeniedView.tsx`**: نمای امنیتی خطای ۴۰۳ با تفکیک نقش و نمایش نیازمندی مجوز.

### ۲. رفتار سرور در درخواست‌های مستقیم (Server Fallback)
در فایل `server.ts`:
- در محیط توسعه: `appType: 'spa'` در میان‌افزار Vite فعال است.
- در محیط عملیاتی: مسیر سراسری `app.get('*', (req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')))` پیاده‌سازی شده است تا هر آدرسی مستقیماً به نقطه ورود برنامه هدایت شود.

---
**تأییدیه نسخه:** `Hami Beta 1.1786.1` بدون تغییر در شماره نسخه با پایداری کامل پیاده‌سازی شد.
