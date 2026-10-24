export interface Driver {
  id: string;
  name: string;
  code: string;
  personnelCode?: string;
  phone?: string;
  vehiclePlate?: string;
  nationalId?: string;
  notes?: string;
  status?: 'active' | 'inactive';
  createdAt?: string;
}

export type AttendanceStatus = 'none' | 'leave' | 'workshop' | 'absent' | 'mission' | 'not_joined' | 'م' | 'ت';

export const STATUS_LABELS: Record<string, string> = {
  none: 'حاضر و فعال',
  leave: 'مرخصی (م)',
  workshop: 'تعمیرگاه / استراحت (ت)',
  absent: 'غیبت',
  not_joined: 'قبل از شروع به کار (ثبت‌نشده)',
  م: 'مرخصی (م)',
  ت: 'تعمیرگاه / استراحت (ت)',
};

export interface StaffDocuments {
  avatarPhoto?: string; // عکس پرسنلی ۳×۴
  nationalCard?: string; // کارت ملی هوشمند
  birthCertificate?: string; // صفحه اول و دوم شناسنامه
  contractFile?: string; // قرارداد کاری / حکم کارگزینی
  healthCard?: string; // کارت بهداشت و طب کار
  policeClearance?: string; // گواهی عدم سوء‌پیشینه
  educationCert?: string; // مدرک تحصیلی / گواهینامه مهارتی
}

export type StaffContractType = 'PERMANENT' | 'CONTRACT' | 'TEMPORARY' | 'PROBATION';

export type WorkShift = 'day' | 'night';

export interface StaffMember {
  id: string;
  name: string;
  code: string; // کد پرسنلی
  department: string; // واحد سازمانی (دیسپچ، اداری و مالی، انبار و لجستیک، فنی، انتظامات، پشتیبانی)
  role: string; // سمت شغلی
  phone?: string;
  shift: 'day' | 'night' | 'morning' | 'evening'; // شیفت کاری اصلی: روز و شب
  nationalId?: string;
  notes?: string;
  entryTime?: string; // ساعت ورود
  exitTime?: string; // ساعت خروج
  status?: 'active' | 'inactive';
  missionsCountToday?: number;
  avatarColor?: string;

  // پرونده جامع پرسنلی (Employee Dossier Details)
  birthDate?: string; // تاریخ تولد
  fatherName?: string; // نام پدر
  education?: string; // مدرک تحصیلی
  maritalStatus?: 'single' | 'married'; // وضعیت تأهل
  childrenCount?: number; // تعداد فرزندان
  address?: string; // نشانی محل سکونت
  emergencyName?: string; // نام رابط در شرایط اضطراری
  emergencyPhone?: string; // تلفن تماس اضطراری
  emergencyRelation?: string; // نسبت رابط اضطراری
  contractType?: StaffContractType; // نوع همکاری / قرارداد
  hireDate?: string; // تاریخ استخدام / شروع به کار
  createdAt?: string; // تاریخ ثبت در سامانه
  insuranceNumber?: string; // شماره بیمه تأمین اجتماعی
  bankName?: string; // نام بانک
  bankAccount?: string; // شماره شبا یا شماره حساب
  bankCardNumber?: string; // شماره کارت بانکی
  baseSalary?: string; // پایه حقوق ماهانه
  rating?: number; // امتیاز ارزیابی عملکرد (۱ تا ۵)
  totalMissions?: number; // کل مأموریت‌ها و وظایف ثبت شده
  documents?: StaffDocuments; // مدارک و ضمائم پرونده
  performanceNotes?: string; // یادداشت ارزیابی و سوابق تشویق/توبیخ
  bloodType?: string; // گروه خونی
}

export type AttendanceRecords = Record<string, Record<string, AttendanceStatus>>;

export interface DailySummary {
  day: number;
  weekday: string;
  leaveCount: number;
  workshopCount: number;
  activeCount: number;
}

export type FilterView = 'all' | 'has_leave' | 'has_workshop';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info';
}
