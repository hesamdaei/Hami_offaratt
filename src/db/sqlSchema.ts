/**
 * ساختار مهندسی و اصولی دیتابیس رابطه‌ای بر اساس استاندارد SQL
 * شامل تعاریف DDL جداول نرمال‌سازی شده، کلیدهای اصلی و خارجی، ایندکس‌ها، محدودیت‌ها و نماها (Views)
 */

export interface SqlColumnDef {
  name: string;
  type: string;
  isPrimary?: boolean;
  isNullable?: boolean;
  defaultValue?: string;
  foreignKey?: {
    table: string;
    column: string;
    onDelete?: string;
  };
  description: string;
}

export interface SqlTableDef {
  name: string;
  label: string;
  description: string;
  columns: SqlColumnDef[];
  indexes: string[];
}

export const RELATIONAL_SQL_SCHEMA: SqlTableDef[] = [
  {
    name: 'users',
    label: 'کاربران سامانه',
    description: 'مدیریت حساب‌های کاربری، سطوح دسترسی، هش رمز عبور و کدهای بازیابی',
    columns: [
      { name: 'id', type: 'VARCHAR(64)', isPrimary: true, isNullable: false, description: 'شناسه یکتای کاربر' },
      { name: 'username', type: 'VARCHAR(64)', isNullable: false, description: 'نام کاربری یکتا جهت ورود' },
      { name: 'full_name', type: 'VARCHAR(128)', isNullable: false, description: 'نام و نام خانوادگی' },
      { name: 'email', type: 'VARCHAR(128)', isNullable: true, description: 'پست الکترونیکی جهت بازیابی رمز عبور' },
      { name: 'phone_number', type: 'VARCHAR(32)', isNullable: true, description: 'شماره همراه' },
      { name: 'password_hash', type: 'VARCHAR(255)', isNullable: true, description: 'هش امنیتی رمز عبور (PBKDF2/SHA256)' },
      { name: 'plain_password', type: 'VARCHAR(255)', isNullable: true, description: 'رمز عبور پشتیبان سیستم' },
      { name: 'role_title', type: 'VARCHAR(64)', isNullable: false, defaultValue: "'کاربر عادی'", description: 'عنوان شغلی/نقش' },
      { name: 'is_master_admin', type: 'BOOLEAN', isNullable: false, defaultValue: 'FALSE', description: 'دسترسی مدیریت ارشد سیستم' },
      { name: 'is_active', type: 'BOOLEAN', isNullable: false, defaultValue: 'TRUE', description: 'وضعیت فعال/مسدود بودن حساب' },
      { name: 'permissions_json', type: 'TEXT', isNullable: true, description: 'مجوزهای ماژول‌های سامانه در قالب JSON' },
      { name: 'recovery_code', type: 'VARCHAR(32)', isNullable: true, description: 'کد ۶ رقمی یکبار مصرف بازیابی رمز' },
      { name: 'recovery_expires_at', type: 'TIMESTAMP', isNullable: true, description: 'تاریخ و ساعت انقضای کد بازیابی' },
      { name: 'last_login_at', type: 'TIMESTAMP', isNullable: true, description: 'زمان آخرین ورود موفق' },
      { name: 'created_at', type: 'TIMESTAMP', isNullable: false, defaultValue: 'CURRENT_TIMESTAMP', description: 'زمان ایجاد حساب' },
      { name: 'updated_at', type: 'TIMESTAMP', isNullable: false, defaultValue: 'CURRENT_TIMESTAMP', description: 'زمان آخرین ویرایش' },
    ],
    indexes: [
      'CREATE UNIQUE INDEX uq_users_username ON users(username);',
      'CREATE INDEX idx_users_email ON users(email);',
      'CREATE INDEX idx_users_active ON users(is_active);',
    ],
  },
  {
    name: 'vehicles',
    label: 'ناوگان خودروها',
    description: 'اطلاعات کامل خودروها، پلاک، بیمه، معاینه فنی و کیلومتر سرویس',
    columns: [
      { name: 'id', type: 'VARCHAR(64)', isPrimary: true, isNullable: false, description: 'شناسه یکتای خودرو' },
      { name: 'code', type: 'VARCHAR(32)', isNullable: true, description: 'کد سازمانی خودرو' },
      { name: 'plate_number', type: 'VARCHAR(64)', isNullable: false, description: 'پلاک انتظامی خودرو' },
      { name: 'vehicle_type', type: 'VARCHAR(64)', isNullable: true, defaultValue: "'ایسوزو'", description: 'نوع و کاربری خودرو' },
      { name: 'model', type: 'VARCHAR(64)', isNullable: true, description: 'مدل و سال ساخت' },
      { name: 'status', type: 'VARCHAR(32)', isNullable: false, defaultValue: "'فعال'", description: 'وضعیت عملیاتی خودرو' },
      { name: 'driver_name', type: 'VARCHAR(128)', isNullable: true, description: 'نام راننده تخصیص‌یافته' },
      { name: 'driver_phone', type: 'VARCHAR(32)', isNullable: true, description: 'شماره تماس راننده' },
      { name: 'third_party_expiry', type: 'VARCHAR(32)', isNullable: true, description: 'تاریخ انقضای بیمه شخص ثالث' },
      { name: 'inspection_expiry', type: 'VARCHAR(32)', isNullable: true, description: 'تاریخ انقضای معاینه فنی' },
      { name: 'body_insurance_expiry', type: 'VARCHAR(32)', isNullable: true, description: 'تاریخ انقضای بیمه بدنه' },
      { name: 'current_mileage', type: 'INTEGER', isNullable: false, defaultValue: '0', description: 'کارکرد کیلومتر فعلی' },
      { name: 'last_change_mileage', type: 'INTEGER', isNullable: false, defaultValue: '0', description: 'کیلومتر آخرین سرویس تعویض روغن' },
      { name: 'last_change_date', type: 'VARCHAR(32)', isNullable: true, description: 'تاریخ آخرین سرویس' },
      { name: 'oil_change_interval', type: 'INTEGER', isNullable: false, defaultValue: '10000', description: 'دوره کارکرد مجاز تعویض روغن' },
      { name: 'notes', type: 'TEXT', isNullable: true, description: 'توضیحات و سوابق فنی' },
      { name: 'created_at', type: 'TIMESTAMP', isNullable: false, defaultValue: 'CURRENT_TIMESTAMP', description: 'زمان ثبت' },
      { name: 'updated_at', type: 'TIMESTAMP', isNullable: false, defaultValue: 'CURRENT_TIMESTAMP', description: 'زمان به‌روزرسانی' },
    ],
    indexes: [
      'CREATE UNIQUE INDEX uq_vehicles_plate ON vehicles(plate_number);',
      'CREATE INDEX idx_vehicles_status ON vehicles(status);',
      'CREATE INDEX idx_vehicles_driver ON vehicles(driver_name);',
    ],
  },
  {
    name: 'drivers',
    label: 'رانندگان',
    description: 'مشخصات هویتی، پرسنلی، شماره تماس، گواهینامه و خودروی منتسب',
    columns: [
      { name: 'id', type: 'VARCHAR(64)', isPrimary: true, isNullable: false, description: 'شناسه یکتای راننده' },
      { name: 'code', type: 'VARCHAR(32)', isNullable: true, description: 'کد بایگانی' },
      { name: 'personnel_code', type: 'VARCHAR(32)', isNullable: true, description: 'کد پرسنلی راننده' },
      { name: 'name', type: 'VARCHAR(128)', isNullable: false, description: 'نام و نام خانوادگی کامل' },
      { name: 'phone', type: 'VARCHAR(32)', isNullable: true, description: 'شماره تلفن همراه' },
      { name: 'national_id', type: 'VARCHAR(32)', isNullable: true, description: 'کد ملی' },
      { name: 'vehicle_plate', type: 'VARCHAR(64)', isNullable: true, description: 'پلاک خودروی منتسب' },
      { name: 'assigned_vehicle_id', type: 'VARCHAR(64)', isNullable: true, foreignKey: { table: 'vehicles', column: 'id', onDelete: 'SET NULL' }, description: 'کلید خارجی به جدول خودروها' },
      { name: 'status', type: 'VARCHAR(32)', isNullable: false, defaultValue: "'active'", description: 'وضعیت فعالیت راننده' },
      { name: 'notes', type: 'TEXT', isNullable: true, description: 'یادداشت‌های پرونده' },
      { name: 'created_at', type: 'TIMESTAMP', isNullable: false, defaultValue: 'CURRENT_TIMESTAMP', description: 'تاریخ ثبت راننده' },
    ],
    indexes: [
      'CREATE INDEX idx_drivers_name ON drivers(name);',
      'CREATE INDEX idx_drivers_personnel_code ON drivers(personnel_code);',
      'CREATE INDEX idx_drivers_vehicle ON drivers(assigned_vehicle_id);',
    ],
  },
  {
    name: 'staff_members',
    label: 'کادر اداری و ستادی',
    description: 'پرسنل دیسپچ، اداری، مالی، انبار و انتظامات به همراه اطلاعات پرونده',
    columns: [
      { name: 'id', type: 'VARCHAR(64)', isPrimary: true, isNullable: false, description: 'شناسه پرسنل' },
      { name: 'code', type: 'VARCHAR(32)', isNullable: false, description: 'کد پرسنلی' },
      { name: 'name', type: 'VARCHAR(128)', isNullable: false, description: 'نام و نام خانوادگی' },
      { name: 'department', type: 'VARCHAR(64)', isNullable: false, description: 'واحد سازمانی' },
      { name: 'role', type: 'VARCHAR(64)', isNullable: false, description: 'سمت سازمانی' },
      { name: 'phone', type: 'VARCHAR(32)', isNullable: true, description: 'تلفن همراه' },
      { name: 'office_phone', type: 'VARCHAR(32)', isNullable: true, description: 'شماره داخلی دفتر' },
      { name: 'shift', type: 'VARCHAR(32)', isNullable: false, defaultValue: "'day'", description: 'شیفت کاری (روز/شب)' },
      { name: 'national_id', type: 'VARCHAR(32)', isNullable: true, description: 'کد ملی' },
      { name: 'hire_date', type: 'VARCHAR(32)', isNullable: true, description: 'تاریخ استخدام' },
      { name: 'contract_type', type: 'VARCHAR(64)', isNullable: true, description: 'نوع قرارداد کاری' },
      { name: 'status', type: 'VARCHAR(32)', isNullable: false, defaultValue: "'active'", description: 'وضعیت همکاری' },
      { name: 'notes', type: 'TEXT', isNullable: true, description: 'توضیحات تکمیلی' },
      { name: 'created_at', type: 'TIMESTAMP', isNullable: false, defaultValue: 'CURRENT_TIMESTAMP', description: 'زمان ایجاد پرونده' },
    ],
    indexes: [
      'CREATE UNIQUE INDEX uq_staff_code ON staff_members(code);',
      'CREATE INDEX idx_staff_department ON staff_members(department);',
      'CREATE INDEX idx_staff_status ON staff_members(status);',
    ],
  },
  {
    name: 'attendance_records',
    label: 'سوابق حضور و غیاب رانندگان',
    description: 'ثبت روزانه وضعیت حضور، مرخصی، تعمیرگاه و غیبت رانندگان',
    columns: [
      { name: 'id', type: 'VARCHAR(64)', isPrimary: true, isNullable: false, description: 'شناسه ثبت' },
      { name: 'driver_id', type: 'VARCHAR(64)', isNullable: false, foreignKey: { table: 'drivers', column: 'id', onDelete: 'CASCADE' }, description: 'کلید راننده' },
      { name: 'attendance_date', type: 'VARCHAR(32)', isNullable: false, description: 'تاریخ روز (مثال: 1403/12/01)' },
      { name: 'status', type: 'VARCHAR(32)', isNullable: false, description: 'وضعیت (none=حاضر, leave=مرخصی, workshop=تعمیرگاه, absent=غیبت)' },
      { name: 'delay_minutes', type: 'INTEGER', isNullable: false, defaultValue: '0', description: 'دقیقه تأخیر ورود' },
      { name: 'notes', type: 'TEXT', isNullable: true, description: 'علت مرخصی یا یادداشت شیفت' },
      { name: 'created_at', type: 'TIMESTAMP', isNullable: false, defaultValue: 'CURRENT_TIMESTAMP', description: 'زمان ثبت سیستم' },
    ],
    indexes: [
      'CREATE UNIQUE INDEX uq_driver_date ON attendance_records(driver_id, attendance_date);',
      'CREATE INDEX idx_attendance_date ON attendance_records(attendance_date);',
      'CREATE INDEX idx_attendance_status ON attendance_records(status);',
    ],
  },
  {
    name: 'staff_attendance_records',
    label: 'سوابق حضور و غیاب پرسنل ستادی',
    description: 'ثبت روزانه ورود، خروج، مرخصی و شیفت کاری پرسنل اداری',
    columns: [
      { name: 'id', type: 'VARCHAR(64)', isPrimary: true, isNullable: false, description: 'شناسه رکورد' },
      { name: 'staff_id', type: 'VARCHAR(64)', isNullable: false, foreignKey: { table: 'staff_members', column: 'id', onDelete: 'CASCADE' }, description: 'کلید پرسنل' },
      { name: 'attendance_date', type: 'VARCHAR(32)', isNullable: false, description: 'تاریخ روز' },
      { name: 'status', type: 'VARCHAR(32)', isNullable: false, description: 'وضعیت حضور' },
      { name: 'entry_time', type: 'VARCHAR(16)', isNullable: true, description: 'ساعت ورود' },
      { name: 'exit_time', type: 'VARCHAR(16)', isNullable: true, description: 'ساعت خروج' },
      { name: 'notes', type: 'TEXT', isNullable: true, description: 'یادداشت یا علت تأخیر' },
      { name: 'created_at', type: 'TIMESTAMP', isNullable: false, defaultValue: 'CURRENT_TIMESTAMP', description: 'زمان ثبت' },
    ],
    indexes: [
      'CREATE UNIQUE INDEX uq_staff_date ON staff_attendance_records(staff_id, attendance_date);',
      'CREATE INDEX idx_staff_att_date ON staff_attendance_records(attendance_date);',
    ],
  },
  {
    name: 'vehicle_handover_records',
    label: 'فرم‌های تحویل و تحول خودرو (۶۶ قلمی)',
    description: 'ثبت صورت‌جلسات تحویل خودرو، چک‌لیست ۶۶ قلمی، کروکی بدنه و تاییدیه راننده',
    columns: [
      { name: 'id', type: 'VARCHAR(64)', isPrimary: true, isNullable: false, description: 'شناسه فرم تحویل' },
      { name: 'vehicle_id', type: 'VARCHAR(64)', isNullable: true, foreignKey: { table: 'vehicles', column: 'id', onDelete: 'SET NULL' }, description: 'خودروی مورد تحویل' },
      { name: 'driver_id', type: 'VARCHAR(64)', isNullable: true, foreignKey: { table: 'drivers', column: 'id', onDelete: 'SET NULL' }, description: 'راننده تحویل‌گیرنده' },
      { name: 'handover_date', type: 'VARCHAR(32)', isNullable: false, description: 'تاریخ تحویل' },
      { name: 'plate_number', type: 'VARCHAR(64)', isNullable: false, description: 'شماره پلاک' },
      { name: 'driver_name', type: 'VARCHAR(128)', isNullable: false, description: 'نام راننده' },
      { name: 'current_mileage', type: 'INTEGER', isNullable: true, description: 'کیلومتر زمان تحویل' },
      { name: 'fuel_level', type: 'VARCHAR(32)', isNullable: true, description: 'میزان سوخت در باک' },
      { name: 'checklist_items_json', type: 'TEXT', isNullable: true, description: 'وضعیت ۶۶ قلم تجهیزات خودرو به صورت JSON' },
      { name: 'body_damages_json', type: 'TEXT', isNullable: true, description: 'نقاط علامت‌گذاری شده روی بدنه به صورت JSON' },
      { name: 'officer_name', type: 'VARCHAR(128)', isNullable: true, description: 'نام مسئول تحویل‌دهنده' },
      { name: 'notes', type: 'TEXT', isNullable: true, description: 'توضیحات و شروط انضباطی' },
      { name: 'created_at', type: 'TIMESTAMP', isNullable: false, defaultValue: 'CURRENT_TIMESTAMP', description: 'زمان ثبت فرم' },
    ],
    indexes: [
      'CREATE INDEX idx_handover_vehicle ON vehicle_handover_records(vehicle_id);',
      'CREATE INDEX idx_handover_driver ON vehicle_handover_records(driver_id);',
      'CREATE INDEX idx_handover_date ON vehicle_handover_records(handover_date);',
    ],
  },
  {
    name: 'service_rules',
    label: 'قوانین و حدنصاب‌های سرویس ناوگان',
    description: 'تنظیمات کیلومتر تعویض روغن، فیلترها و روزهای مانده به هشدار بیمه',
    columns: [
      { name: 'id', type: 'VARCHAR(64)', isPrimary: true, isNullable: false, description: 'شناسه قانون' },
      { name: 'rule_key', type: 'VARCHAR(64)', isNullable: false, description: 'کلید فنی قانون' },
      { name: 'rule_value_num', type: 'INTEGER', isNullable: false, description: 'مقدار عددی قانون' },
      { name: 'label', type: 'VARCHAR(128)', isNullable: false, description: 'عنوان فارسی قانون' },
      { name: 'description', type: 'TEXT', isNullable: true, description: 'شرح عملکرد قانون' },
      { name: 'updated_at', type: 'TIMESTAMP', isNullable: false, defaultValue: 'CURRENT_TIMESTAMP', description: 'تاریخ بروزرسانی' },
    ],
    indexes: [
      'CREATE UNIQUE INDEX uq_rule_key ON service_rules(rule_key);',
    ],
  },
  {
    name: 'audit_logs',
    label: 'لاگ رویدادها و امنیت سیستم',
    description: 'رهگیری عملیات کاربران، ورودها، تغییر گذرواژه و ویرایش‌های حساس',
    columns: [
      { name: 'id', type: 'VARCHAR(64)', isPrimary: true, isNullable: false, description: 'شناسه لاگ' },
      { name: 'user_id', type: 'VARCHAR(64)', isNullable: true, foreignKey: { table: 'users', column: 'id', onDelete: 'SET NULL' }, description: 'کاربر انجام‌دهنده' },
      { name: 'action', type: 'VARCHAR(64)', isNullable: false, description: 'نوع عملیات (LOGIN, PASSWORD_RESET, DATA_EXPORT)' },
      { name: 'entity_type', type: 'VARCHAR(64)', isNullable: true, description: 'موجودیت تحت تأثیر' },
      { name: 'entity_id', type: 'VARCHAR(64)', isNullable: true, description: 'شناسه موجودیت' },
      { name: 'details', type: 'TEXT', isNullable: true, description: 'جزئیات عملیات' },
      { name: 'ip_address', type: 'VARCHAR(45)', isNullable: true, description: 'نشانی IP کلاینت' },
      { name: 'created_at', type: 'TIMESTAMP', isNullable: false, defaultValue: 'CURRENT_TIMESTAMP', description: 'زمان دقیق رویداد' },
    ],
    indexes: [
      'CREATE INDEX idx_audit_user ON audit_logs(user_id);',
      'CREATE INDEX idx_audit_action ON audit_logs(action);',
      'CREATE INDEX idx_audit_created ON audit_logs(created_at);',
    ],
  },
];

/**
 * ایجاد اسکریپت کامل DDL برای ساخت پایگاه‌داده رابطه‌ای استاندارد SQL
 */
export function generateSqlSchemaDdl(dialect: 'postgres' | 'sqlite' | 'standard' = 'standard'): string {
  const lines: string[] = [];

  lines.push(`-- ====================================================================`);
  lines.push(`-- پایگاه‌داده رابطه‌ای سامانه یکپارچه حمل و نقل و ناوگان صداقت بار پیشرو (حامی)`);
  lines.push(`-- ساختار استاندارد SQL - نگارش ۲.۰ مهندسی و نرمال‌سازی شده`);
  lines.push(`-- تاریخ تولید: ${new Date().toISOString()}`);
  lines.push(`-- ====================================================================\n`);

  if (dialect === 'postgres') {
    lines.push(`-- فعال‌سازی افزونه‌های مورد نیاز PostgreSQL`);
    lines.push(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n`);
  }

  // DDL جداول
  for (const table of RELATIONAL_SQL_SCHEMA) {
    lines.push(`-- --------------------------------------------------------------------`);
    lines.push(`-- جدول: ${table.name} (${table.label})`);
    lines.push(`-- توضیحات: ${table.description}`);
    lines.push(`-- --------------------------------------------------------------------`);
    lines.push(`CREATE TABLE IF NOT EXISTS ${table.name} (`);

    const colDefs: string[] = [];
    for (const col of table.columns) {
      let colLine = `  ${col.name} ${col.type}`;
      if (col.isPrimary) {
        colLine += ' PRIMARY KEY';
      }
      if (col.isNullable === false && !col.isPrimary) {
        colLine += ' NOT NULL';
      }
      if (col.defaultValue) {
        colLine += ` DEFAULT ${col.defaultValue}`;
      }
      if (col.foreignKey) {
        colLine += ` REFERENCES ${col.foreignKey.table}(${col.foreignKey.column})`;
        if (col.foreignKey.onDelete) {
          colLine += ` ON DELETE ${col.foreignKey.onDelete}`;
        }
      }
      colDefs.push(colLine);
    }

    lines.push(colDefs.join(',\n'));
    lines.push(`);\n`);

    // ایندکس‌ها
    if (table.indexes.length > 0) {
      lines.push(`-- ایندکس‌های جدول ${table.name}`);
      for (const idx of table.indexes) {
        lines.push(idx);
      }
      lines.push('');
    }
  }

  // نماهای کاربردی (Views)
  lines.push(`-- ====================================================================`);
  lines.push(`-- نماهای رابطه‌ای تحلیلی (Analytical SQL Views)`);
  lines.push(`-- ====================================================================`);

  lines.push(`
CREATE OR REPLACE VIEW v_fleet_health_summary AS
SELECT 
  v.id AS vehicle_id,
  v.code AS vehicle_code,
  v.plate_number,
  v.status,
  v.driver_name,
  v.current_mileage,
  v.last_change_mileage,
  (v.current_mileage - v.last_change_mileage) AS mileage_since_last_oil_change,
  (v.oil_change_interval - (v.current_mileage - v.last_change_mileage)) AS mileage_remaining_oil,
  CASE 
    WHEN (v.current_mileage - v.last_change_mileage) >= v.oil_change_interval THEN 'انقضای موعد تعویض روغن'
    WHEN (v.current_mileage - v.last_change_mileage) >= (v.oil_change_interval - 1000) THEN 'نزدیک به موعد تعویض روغن'
    ELSE 'عادی'
  END AS oil_status,
  v.third_party_expiry,
  v.inspection_expiry
FROM vehicles v;
`);

  lines.push(`
CREATE OR REPLACE VIEW v_driver_dossier_full AS
SELECT 
  d.id AS driver_id,
  d.personnel_code,
  d.name AS driver_name,
  d.phone,
  d.national_id,
  d.status AS driver_status,
  v.id AS vehicle_id,
  v.plate_number AS assigned_vehicle_plate,
  v.vehicle_type
FROM drivers d
LEFT JOIN vehicles v ON d.assigned_vehicle_id = v.id OR d.vehicle_plate = v.plate_number;
`);

  return lines.join('\n');
}

/**
 * گریزدهی مقادیر رشته‌ای جهت جلوگیری از خطای SQL Injection در ساخت اسکریپت خروجی
 */
function escapeSqlValue(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return isNaN(val) ? '0' : String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'object') {
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return `'${jsonStr}'`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

/**
 * تولید فایل کامل خروجی دیتابیس رابطه‌ای SQL (.sql dump) همراه با جداول و کلیه داده‌های زنده موجود
 */
export function generateFullSqlDump(dbData: {
  users?: any[];
  vehicles?: any[];
  drivers?: any[];
  records?: Record<string, any>;
  driverDirectory?: any[];
  staffMembers?: any[];
  staffRecords?: Record<string, any>;
  rules?: any;
}): string {
  const parts: string[] = [];

  // هدر و تعاریف ساختار
  parts.push(generateSqlSchemaDdl('standard'));
  parts.push(`\n-- ====================================================================`);
  parts.push(`-- بارگذاری داده‌های موجود به صورت مهندسی (Data Inserts)`);
  parts.push(`-- ====================================================================\n`);
  parts.push(`BEGIN TRANSACTION;\n`);

  // ۱. کاربران (Users)
  const users = Array.isArray(dbData.users) ? dbData.users : [];
  if (users.length > 0) {
    parts.push(`-- داده‌های جدول users (${users.length} رکورد)`);
    for (const u of users) {
      parts.push(
        `INSERT INTO users (id, username, full_name, email, phone_number, password_hash, plain_password, role_title, is_master_admin, is_active, permissions_json, created_at) ` +
        `VALUES (${escapeSqlValue(u.id || u.username)}, ${escapeSqlValue(u.username)}, ${escapeSqlValue(u.fullName || u.username)}, ${escapeSqlValue(u.email || (u.isMasterAdmin ? 'hesam.daei@gmail.com' : null))}, ${escapeSqlValue(u.phoneNumber)}, ${escapeSqlValue(u.passwordHash)}, ${escapeSqlValue(u.password)}, ${escapeSqlValue(u.roleTitle || 'کاربر')}, ${escapeSqlValue(Boolean(u.isMasterAdmin))}, ${escapeSqlValue(u.isActive !== false)}, ${escapeSqlValue(u.permissions)}, ${escapeSqlValue(u.createdAt || new Date().toISOString())}) ` +
        `ON CONFLICT (id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP;`
      );
    }
    parts.push('');
  }

  // ۲. خودروها (Vehicles)
  const vehicles = Array.isArray(dbData.vehicles) ? dbData.vehicles : [];
  if (vehicles.length > 0) {
    parts.push(`-- داده‌های جدول vehicles (${vehicles.length} رکورد)`);
    for (const v of vehicles) {
      parts.push(
        `INSERT INTO vehicles (id, code, plate_number, vehicle_type, model, status, driver_name, driver_phone, third_party_expiry, inspection_expiry, current_mileage, last_change_mileage, last_change_date, notes) ` +
        `VALUES (${escapeSqlValue(v.id || v.plateNumber)}, ${escapeSqlValue(v.code)}, ${escapeSqlValue(v.plateNumber)}, ${escapeSqlValue(v.vehicleType || 'ایسوزو')}, ${escapeSqlValue(v.model)}, ${escapeSqlValue(v.status || 'فعال')}, ${escapeSqlValue(v.driverName)}, ${escapeSqlValue(v.driverPhone)}, ${escapeSqlValue(v.thirdPartyInsuranceExpiry)}, ${escapeSqlValue(v.technicalInspectionExpiry)}, ${escapeSqlValue(Number(v.currentMileage) || 0)}, ${escapeSqlValue(Number(v.lastOilChangeMileage) || 0)}, ${escapeSqlValue(v.lastOilChangeDate)}, ${escapeSqlValue(v.notes)}) ` +
        `ON CONFLICT (id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP;`
      );
    }
    parts.push('');
  }

  // ۳. رانندگان (Drivers)
  const drivers = Array.isArray(dbData.drivers) ? dbData.drivers : [];
  if (drivers.length > 0) {
    parts.push(`-- داده‌های جدول drivers (${drivers.length} رکورد)`);
    for (const d of drivers) {
      parts.push(
        `INSERT INTO drivers (id, code, personnel_code, name, phone, national_id, vehicle_plate, status, notes) ` +
        `VALUES (${escapeSqlValue(d.id || d.name)}, ${escapeSqlValue(d.code)}, ${escapeSqlValue(d.personnelCode || d.code)}, ${escapeSqlValue(d.name)}, ${escapeSqlValue(d.phone)}, ${escapeSqlValue(d.nationalId)}, ${escapeSqlValue(d.vehiclePlate)}, ${escapeSqlValue(d.status || 'active')}, ${escapeSqlValue(d.notes)}) ` +
        `ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;`
      );
    }
    parts.push('');
  }

  // ۴. پرسنل ستادی (Staff Members)
  const staff = Array.isArray(dbData.staffMembers) ? dbData.staffMembers : [];
  if (staff.length > 0) {
    parts.push(`-- داده‌های جدول staff_members (${staff.length} رکورد)`);
    for (const s of staff) {
      parts.push(
        `INSERT INTO staff_members (id, code, name, department, role, phone, office_phone, shift, national_id, hire_date, contract_type, status, notes) ` +
        `VALUES (${escapeSqlValue(s.id || s.code)}, ${escapeSqlValue(s.code)}, ${escapeSqlValue(s.name)}, ${escapeSqlValue(s.department || 'اداری')}, ${escapeSqlValue(s.role || 'کارشناس')}, ${escapeSqlValue(s.phone)}, ${escapeSqlValue(s.officePhone)}, ${escapeSqlValue(s.shift || 'day')}, ${escapeSqlValue(s.nationalId)}, ${escapeSqlValue(s.hireDate)}, ${escapeSqlValue(s.contractType)}, ${escapeSqlValue(s.status || 'active')}, ${escapeSqlValue(s.notes)}) ` +
        `ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;`
      );
    }
    parts.push('');
  }

  // ۵. قوانین سرویس (Service Rules)
  if (dbData.rules && typeof dbData.rules === 'object') {
    parts.push(`-- داده‌های جدول service_rules`);
    for (const [key, val] of Object.entries(dbData.rules)) {
      const numVal = typeof val === 'number' ? val : Number(val) || 0;
      parts.push(
        `INSERT INTO service_rules (id, rule_key, rule_value_num, label, description) ` +
        `VALUES (${escapeSqlValue(key)}, ${escapeSqlValue(key)}, ${escapeSqlValue(numVal)}, ${escapeSqlValue(key)}, 'حدنصاب سیستمی سرویس') ` +
        `ON CONFLICT (id) DO UPDATE SET rule_value_num = EXCLUDED.rule_value_num;`
      );
    }
    parts.push('');
  }

  // ثبت اولین لاگ امنیت
  parts.push(`-- ثبت اولین لاگ ایجاد پایگاه‌داده`);
  parts.push(
    `INSERT INTO audit_logs (id, user_id, action, entity_type, details) ` +
    `VALUES ('log-init-001', 'admin', 'DATABASE_INITIALIZATION', 'SYSTEM', 'ایجاد ساختار مهندسی دیتابیس رابطه‌ای SQL با موفقیت انجام شد.');`
  );

  parts.push(`\nCOMMIT;\n`);
  parts.push(`-- انتهای اسکریپت خروجی SQL حامی`);

  return parts.join('\n');
}
