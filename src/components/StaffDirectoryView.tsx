import { FC, useState, useMemo, FormEvent } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  FileCheck,
  Star,
  Edit2,
  Trash2,
  ShieldCheck,
  FileSpreadsheet,
  X,
  Camera,
  FileText,
  CreditCard,
  HeartPulse,
  Printer,
  Building2,
  Briefcase,
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Award,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Eye,
  IdCard,
} from 'lucide-react';
import { StaffMember, StaffContractType } from '../types';
import { STAFF_DOC_SLOTS, STAFF_DEPARTMENTS } from '../utils/staffSeedData';
import { toFaDigits } from '../utils/jalaali';
import { DocumentUploaderModal } from './DocumentUploaderModal';
import { PersianDatePicker } from './PersianDatePicker';
import { StaffDossierPrintModal } from './StaffDossierPrintModal';
import * as XLSX from 'xlsx';

interface StaffDirectoryViewProps {
  staffMembers: StaffMember[];
  onAddStaffMember: (staff: StaffMember) => void;
  onUpdateStaffMember: (staff: StaffMember) => void;
  onDeleteStaffMember: (id: string) => void;
  onToggleStaffActive: (id: string) => void;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const StaffDirectoryView: FC<StaffDirectoryViewProps> = ({
  staffMembers,
  onAddStaffMember,
  onUpdateStaffMember,
  onDeleteStaffMember,
  onToggleStaffActive,
  onShowToast,
}) => {
  // Search & Filter State
  const [search, setSearch] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [filterShift, setFilterShift] = useState('ALL');
  const [filterContract, setFilterContract] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Dossier View Modal (شناسنامه جامع کارمند)
  const [viewingDossier, setViewingDossier] = useState<StaffMember | null>(null);
  const [printingMember, setPrintingMember] = useState<StaffMember | null>(null);

  // Document Uploader Modal
  const [viewingDocsStaff, setViewingDocsStaff] = useState<StaffMember | null>(null);

  // Register / Edit Modal & Tab
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [activeTab, setActiveTab] = useState<'PERSONAL' | 'JOB' | 'FINANCIAL' | 'EMERGENCY'>('PERSONAL');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    department: 'دیسپچ و کنترل عملیات',
    role: '',
    phone: '',
    shift: 'day' as 'day' | 'night' | 'morning' | 'evening',
    nationalId: '',
    fatherName: '',
    birthDate: '',
    education: '',
    maritalStatus: 'married' as 'single' | 'married',
    childrenCount: 0,
    address: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: '',
    contractType: 'PERMANENT' as StaffContractType,
    hireDate: '',
    insuranceNumber: '',
    bankName: 'بانک ملت',
    bankAccount: 'IR',
    bankCardNumber: '',
    baseSalary: '',
    rating: 5.0,
    bloodType: 'A+',
    entryTime: '20:00',
    exitTime: '06:00',
    status: 'active' as 'active' | 'inactive',
    notes: '',
    performanceNotes: '',
  });

  // Filtered staff calculation
  const filtered = useMemo(() => {
    return staffMembers.filter((s) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.code && s.code.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.nationalId && s.nationalId.includes(q)) ||
        (s.role && s.role.toLowerCase().includes(q)) ||
        (s.department && s.department.toLowerCase().includes(q));

      const matchDept = filterDepartment === 'ALL' || s.department === filterDepartment;
      const matchShift =
        filterShift === 'ALL' ||
        (filterShift === 'day' && (s.shift === 'day' || s.shift === 'morning' || s.shift === 'evening')) ||
        (filterShift === 'night' && s.shift === 'night') ||
        s.shift === filterShift;
      const matchContract = filterContract === 'ALL' || s.contractType === filterContract;
      const matchStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'ACTIVE' && s.status !== 'inactive') ||
        (filterStatus === 'INACTIVE' && s.status === 'inactive');

      return matchSearch && matchDept && matchShift && matchContract && matchStatus;
    });
  }, [staffMembers, search, filterDepartment, filterShift, filterContract, filterStatus]);

  // Executive KPI summary calculations
  const totalStaffCount = staffMembers.length;
  const activeStaffCount = staffMembers.filter((s) => s.status !== 'inactive').length;
  const permanentContracts = staffMembers.filter((s) => s.contractType === 'PERMANENT' || !s.contractType).length;
  const avgRating = useMemo(() => {
    if (staffMembers.length === 0) return 5.0;
    const total = staffMembers.reduce((sum, s) => sum + (s.rating || 4.8), 0);
    return (total / staffMembers.length).toFixed(1);
  }, [staffMembers]);

  // Open Add modal
  const handleOpenAdd = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      code: `EMP-${100 + staffMembers.length + 1}`,
      department: 'دیسپچ و کنترل عملیات',
      role: '',
      phone: '',
      shift: 'night',
      nationalId: '',
      fatherName: '',
      birthDate: '1370/01/01',
      education: 'کارشناسی',
      maritalStatus: 'married',
      childrenCount: 0,
      address: '',
      emergencyName: '',
      emergencyPhone: '',
      emergencyRelation: 'همسر',
      contractType: 'PERMANENT',
      hireDate: '1403/01/01',
      insuranceNumber: '',
      bankName: 'بانک ملت',
      bankAccount: 'IR',
      bankCardNumber: '',
      baseSalary: '۲۸,۰۰۰,۰۰۰ تومان',
      rating: 5.0,
      bloodType: 'A+',
      entryTime: '20:00',
      exitTime: '06:00',
      status: 'active',
      notes: '',
      performanceNotes: '',
    });
    setActiveTab('PERSONAL');
    setIsModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (s: StaffMember) => {
    setEditingStaff(s);
    setFormData({
      name: s.name,
      code: s.code,
      department: s.department,
      role: s.role,
      phone: s.phone || '',
      shift: s.shift,
      nationalId: s.nationalId || '',
      fatherName: s.fatherName || '',
      birthDate: s.birthDate || '',
      education: s.education || '',
      maritalStatus: s.maritalStatus || 'married',
      childrenCount: s.childrenCount || 0,
      address: s.address || '',
      emergencyName: s.emergencyName || '',
      emergencyPhone: s.emergencyPhone || '',
      emergencyRelation: s.emergencyRelation || '',
      contractType: s.contractType || 'PERMANENT',
      hireDate: s.hireDate || '',
      insuranceNumber: s.insuranceNumber || '',
      bankName: s.bankName || 'بانک ملت',
      bankAccount: s.bankAccount || 'IR',
      bankCardNumber: s.bankCardNumber || '',
      baseSalary: s.baseSalary || '',
      rating: s.rating || 5.0,
      bloodType: s.bloodType || 'A+',
      entryTime: s.entryTime || '20:00',
      exitTime: s.exitTime || '06:00',
      status: s.status || 'active',
      notes: s.notes || '',
      performanceNotes: s.performanceNotes || '',
    });
    setActiveTab('PERSONAL');
    setIsModalOpen(true);
  };

  // Submit Add / Edit Form
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      onShowToast?.('لطفاً نام و نام خانوادگی کارمند را وارد کنید.', 'error');
      return;
    }

    if (editingStaff) {
      const updated: StaffMember = {
        ...editingStaff,
        name: formData.name.trim(),
        code: formData.code.trim() || editingStaff.code,
        department: formData.department,
        role: formData.role.trim() || 'کارشناس',
        phone: formData.phone.trim(),
        shift: formData.shift,
        nationalId: formData.nationalId.trim(),
        fatherName: formData.fatherName.trim(),
        birthDate: formData.birthDate.trim(),
        education: formData.education.trim(),
        maritalStatus: formData.maritalStatus,
        childrenCount: Number(formData.childrenCount) || 0,
        address: formData.address.trim(),
        emergencyName: formData.emergencyName.trim(),
        emergencyPhone: formData.emergencyPhone.trim(),
        emergencyRelation: formData.emergencyRelation.trim(),
        contractType: formData.contractType,
        hireDate: formData.hireDate.trim(),
        insuranceNumber: formData.insuranceNumber.trim(),
        bankName: formData.bankName.trim(),
        bankAccount: formData.bankAccount.trim(),
        bankCardNumber: formData.bankCardNumber.trim(),
        baseSalary: formData.baseSalary.trim(),
        rating: Number(formData.rating) || 5.0,
        bloodType: formData.bloodType.trim(),
        entryTime: formData.entryTime.trim(),
        exitTime: formData.exitTime.trim(),
        status: formData.status,
        notes: formData.notes.trim(),
        performanceNotes: formData.performanceNotes.trim(),
      };
      onUpdateStaffMember(updated);
      onShowToast?.(`پرونده کارمند «${updated.name}» با موفقیت به‌روزرسانی شد.`, 'success');
      if (viewingDossier && viewingDossier.id === updated.id) {
        setViewingDossier(updated);
      }
    } else {
      const newStaff: StaffMember = {
        id: `staff-${Date.now()}`,
        name: formData.name.trim(),
        code: formData.code.trim() || `EMP-${100 + staffMembers.length + 1}`,
        department: formData.department,
        role: formData.role.trim() || 'کارمند عملیات',
        phone: formData.phone.trim(),
        shift: formData.shift,
        nationalId: formData.nationalId.trim(),
        fatherName: formData.fatherName.trim(),
        birthDate: formData.birthDate.trim(),
        education: formData.education.trim(),
        maritalStatus: formData.maritalStatus,
        childrenCount: Number(formData.childrenCount) || 0,
        address: formData.address.trim(),
        emergencyName: formData.emergencyName.trim(),
        emergencyPhone: formData.emergencyPhone.trim(),
        emergencyRelation: formData.emergencyRelation.trim(),
        contractType: formData.contractType,
        hireDate: formData.hireDate.trim(),
        insuranceNumber: formData.insuranceNumber.trim(),
        bankName: formData.bankName.trim(),
        bankAccount: formData.bankAccount.trim(),
        bankCardNumber: formData.bankCardNumber.trim(),
        baseSalary: formData.baseSalary.trim(),
        rating: Number(formData.rating) || 5.0,
        bloodType: formData.bloodType.trim(),
        entryTime: formData.entryTime.trim(),
        exitTime: formData.exitTime.trim(),
        status: formData.status,
        missionsCountToday: 0,
        totalMissions: 0,
        notes: formData.notes.trim(),
        performanceNotes: formData.performanceNotes.trim(),
        avatarColor: 'from-blue-600 to-indigo-700',
      };
      onAddStaffMember(newStaff);
      onShowToast?.(`پرونده جدید برای «${newStaff.name}» با موفقیت افتتاح شد.`, 'success');
    }
    setIsModalOpen(false);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const data = filtered.map((s) => ({
      'کد پرسنلی': s.code,
      'نام و نام خانوادگی': s.name,
      'واحد سازمانی': s.department,
      'سمت شغلی': s.role,
      'شیفت کاری':
        s.shift === 'night' ? 'شیفت شب' : 'شیفت روز',
      'ساعت کاری ورود و خروج': `${s.entryTime || '---'} تا ${s.exitTime || '---'}`,
      'شماره تماس': s.phone || '---',
      'کد ملی': s.nationalId || '---',
      'نام پدر': s.fatherName || '---',
      'تاریخ تولد': s.birthDate || '---',
      'مدرک تحصیلی': s.education || '---',
      'وضعیت تأهل': s.maritalStatus === 'married' ? 'متأهل' : 'مجرد',
      'نوع قرارداد':
        s.contractType === 'PERMANENT'
          ? 'استخدامی رسمی'
          : s.contractType === 'CONTRACT'
          ? 'قراردادی'
          : s.contractType === 'TEMPORARY'
          ? 'پاره‌وقت / پروژه‌ای'
          : 'آزمایشی',
      'تاریخ استخدام': s.hireDate || '---',
      'شماره بیمه تامین اجتماعی': s.insuranceNumber || '---',
      'بانک عامل': s.bankName || '---',
      'شماره شبا': s.bankAccount || '---',
      'پایه حقوق': s.baseSalary || '---',
      'تماس اضطراری': `${s.emergencyName || '---'} (${s.emergencyRelation || '---'} - ${s.emergencyPhone || '---'})`,
      'وضعیت فعالیت': s.status === 'inactive' ? 'غیرفعال' : 'فعال',
      'امتیاز عملکرد': s.rating || 5.0,
      'تعداد مأموریت‌ها': s.totalMissions || s.missionsCountToday || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'پرونده پرسنل حامی');
    XLSX.writeFile(workbook, `پرونده_پرسنل_حامی_بار_${Date.now()}.xlsx`);
    onShowToast?.('فایل اکسل پرونده پرسنل با موفقیت استخراج شد.', 'success');
  };

  // Helper color for departments
  const getDeptColor = (dept: string) => {
    if (dept.includes('دیسپچ')) return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
    if (dept.includes('انبار')) return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    if (dept.includes('فنی')) return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
    if (dept.includes('بارنامه') || dept.includes('مالی')) return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
    if (dept.includes('انتظامات')) return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
    return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
  };

  const getShiftBadge = (shift: string) => {
    if (shift === 'night') return { text: 'شیفت شب (۱۹-۰۷)', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
    return { text: 'شیفت روز (۰۷-۱۹)', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* 1. Executive Top KPI Banners */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-xl p-3.5 flex items-center justify-between shadow-md">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">کل پرسنل اداری و عملیاتی</div>
            <div className="text-xl font-bold text-white mt-1 flex items-baseline gap-1">
              <span>{toFaDigits(totalStaffCount)}</span>
              <span className="text-xs text-slate-400 font-normal">نفر</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-xl p-3.5 flex items-center justify-between shadow-md">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">پرسنل فعال و حاضر در شیفت</div>
            <div className="text-xl font-bold text-emerald-400 mt-1 flex items-baseline gap-1">
              <span>{toFaDigits(activeStaffCount)}</span>
              <span className="text-xs text-slate-400 font-normal">نفر فعال</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-xl p-3.5 flex items-center justify-between shadow-md">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">استخدام رسمی و بلندمدت</div>
            <div className="text-xl font-bold text-indigo-300 mt-1 flex items-baseline gap-1">
              <span>{toFaDigits(permanentContracts)}</span>
              <span className="text-xs text-slate-400 font-normal">حکم رسمی</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-xl p-3.5 flex items-center justify-between shadow-md">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">میانگین ارزیابی عملکرد (KPI)</div>
            <div className="text-xl font-bold text-amber-400 mt-1 flex items-baseline gap-1 font-mono">
              <span>{toFaDigits(avgRating)}</span>
              <span className="text-xs text-slate-400 font-normal">از ۵</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Star className="w-5 h-5 fill-amber-400/40" />
          </div>
        </div>
      </div>

      {/* 2. Control & Search Bar */}
      <div className="bg-[#111b2e] border border-[#1f2c45] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        {/* Search */}
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="جستجوی پرسنل با نام، کد پرسنلی، کدملی، شماره تماس، سمت سازمانی..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0a101f] border border-[#1f2c45] text-slate-200 text-sm rounded-lg pr-9 pl-4 py-2 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="bg-[#0a101f] border border-[#1f2c45] text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">همه واحدهای سازمانی</option>
            {STAFF_DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* Shift Filter */}
          <select
            value={filterShift}
            onChange={(e) => setFilterShift(e.target.value)}
            className="bg-[#0a101f] border border-[#1f2c45] text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">همه شیفت‌ها</option>
            <option value="day">شیفت روز (۰۷:۰۰ الی ۱۹:۰۰ ☀️)</option>
            <option value="night">شیفت شب (۱۹:۰۰ الی ۰۷:۰۰ 🌙)</option>
          </select>

          {/* Contract Filter */}
          <select
            value={filterContract}
            onChange={(e) => setFilterContract(e.target.value)}
            className="bg-[#0a101f] border border-[#1f2c45] text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">همه قراردادها</option>
            <option value="PERMANENT">استخدامی رسمی</option>
            <option value="CONTRACT">قراردادی</option>
            <option value="TEMPORARY">پاره‌وقت / پروژه‌ای</option>
            <option value="PROBATION">آزمایشی</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#0a101f] border border-[#1f2c45] text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="ACTIVE">فقط فعال</option>
            <option value="INACTIVE">فقط غیرفعال</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#0a101f] border border-[#1f2c45] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('GRID')}
              title="نمایش کارتی پرونده‌ها"
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'GRID' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>کارت‌ها</span>
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              title="نمایش جدولی جامع"
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'TABLE' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>جدول</span>
            </button>
          </div>

          {/* Excel Export */}
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>خروجی اکسل</span>
          </button>

          {/* Add Staff Dossier */}
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-900/30"
          >
            <UserPlus className="w-4 h-4" />
            <span>افتتاح پرونده کارمند جدید</span>
          </button>
        </div>
      </div>

      {/* 3. Empty State if nothing matches */}
      {filtered.length === 0 && (
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500">
            <Users className="w-7 h-7" />
          </div>
          <div className="text-base font-bold text-slate-200">کارمندی با مشخصات جستجو شده یافت نشد</div>
          <div className="text-xs text-slate-400">
            می‌توانید فیلترها را بازنشانی کرده یا با زدن دکمه «افتتاح پرونده کارمند جدید» مشخصات را ثبت نمایید.
          </div>
          <button
            onClick={() => {
              setSearch('');
              setFilterDepartment('ALL');
              setFilterShift('ALL');
              setFilterContract('ALL');
              setFilterStatus('ALL');
            }}
            className="px-4 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
          >
            پاک کردن فیلترها
          </button>
        </div>
      )}

      {/* 4. GRID VIEW */}
      {viewMode === 'GRID' && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((s) => {
            const shiftInfo = getShiftBadge(s.shift);
            const deptColor = getDeptColor(s.department);
            const isInactive = s.status === 'inactive';
            const docsCount = s.documents ? Object.values(s.documents).filter(Boolean).length : 0;

            return (
              <div
                key={s.id}
                className={`bg-[#111b2e] border rounded-xl p-4 shadow-md transition-all space-y-3 relative group ${
                  isInactive
                    ? 'border-[#2d1f2a] opacity-80 bg-[#141525]'
                    : 'border-[#1f2c45] hover:border-indigo-500/50'
                }`}
              >
                {/* Header: Photo, Name, Dept, Shift, Rating */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {/* Avatar photo or stylized initials */}
                    <div
                      onClick={() => setViewingDocsStaff(s)}
                      className="w-11 h-11 rounded-xl bg-[#0a101f] border border-[#1f2c45] flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-indigo-500 transition-colors relative"
                      title="کلیک برای مشاهده یا بارگذاری مدارک و عکس پرسنلی"
                    >
                      {s.documents?.avatarPhoto ? (
                        <img
                          src={s.documents.avatarPhoto}
                          alt={s.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className={`w-full h-full bg-gradient-to-br ${
                            s.avatarColor || 'from-blue-600 to-indigo-700'
                          } flex items-center justify-center text-white font-bold text-xs`}
                        >
                          {s.name.slice(0, 2)}
                        </div>
                      )}
                      {docsCount > 0 && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border border-[#0a101f] rounded-full" />
                      )}
                    </div>

                    <div>
                      <div className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                        <span
                          onClick={() => setViewingDossier(s)}
                          className="cursor-pointer hover:text-indigo-400 transition-colors"
                          title="مشاهده شناسنامه جامع کارمند"
                        >
                          {s.name}
                        </span>
                        {isInactive && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md">
                            غیرفعال
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5 font-medium flex items-center gap-1.5">
                        <span>{s.role}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>کد: {toFaDigits(s.code)}</span>
                        <span>•</span>
                        <span>کدملی: {toFaDigits(s.nationalId || '---')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rating Badge */}
                  <div className="flex items-center gap-1 px-2 py-0.8 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-xs font-bold font-mono">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{toFaDigits(s.rating || 5.0)}</span>
                  </div>
                </div>

                {/* Department & Shift Tags */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${deptColor}`}>
                    {s.department}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${shiftInfo.color}`}>
                    {shiftInfo.text}
                  </span>
                  {s.contractType && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-medium border bg-slate-800 text-slate-300 border-slate-700">
                      {s.contractType === 'PERMANENT'
                        ? 'استخدام رسمی'
                        : s.contractType === 'CONTRACT'
                        ? 'قراردادی'
                        : s.contractType === 'TEMPORARY'
                        ? 'پاره‌وقت'
                        : 'آزمایشی'}
                    </span>
                  )}
                </div>

                {/* Contact & Hours Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#1a273f]">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-mono">{toFaDigits(s.phone || 'فاقد شماره')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {toFaDigits(s.entryTime || '۲۰:۰۰')} - {toFaDigits(s.exitTime || '۰۶:۰۰')}
                    </span>
                  </div>
                </div>

                {/* Emergency Contact & Education */}
                <div className="p-2.5 rounded-lg bg-[#0a101f] border border-[#1a273f] text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3 h-3 text-slate-400" />
                      <span>تحصیلات: {s.education || 'دیپلم'}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <HeartPulse className="w-3 h-3 text-rose-400" />
                      <span>گروه خونی: {s.bloodType || 'A+'}</span>
                    </span>
                  </div>
                  {s.emergencyName && (
                    <div className="text-[11px] text-slate-300 pt-1 border-t border-[#182338]/60 flex items-center justify-between">
                      <span className="text-slate-400">رابط اضطراری:</span>
                      <span className="font-medium">
                        {s.emergencyName} ({s.emergencyRelation || 'بستگان'}) - {toFaDigits(s.emergencyPhone || '')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-[#1a273f]">
                  {/* Status Toggle Button */}
                  <button
                    onClick={() => onToggleStaffActive(s.id)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-colors ${
                      s.status !== 'inactive'
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                    }`}
                  >
                    {s.status !== 'inactive' ? (
                      <>
                        <ToggleRight className="w-3.5 h-3.5 text-emerald-400" />
                        <span>فعال</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-3.5 h-3.5 text-rose-400" />
                        <span>غیرفعال</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* View Dossier Button */}
                    <button
                      onClick={() => setViewingDossier(s)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs flex items-center gap-1 transition-colors"
                      title="مشاهده شناسنامه جامع کارمند"
                    >
                      <Eye className="w-3 h-3" />
                      <span>شناسنامه</span>
                    </button>

                    {/* Docs Button */}
                    <button
                      onClick={() => setViewingDocsStaff(s)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-xs flex items-center gap-1 transition-colors"
                      title="مدارک، تصاویر، قرارداد و سلامت"
                    >
                      <Camera className="w-3 h-3" />
                      <span>مدارک ({toFaDigits(docsCount)})</span>
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => handleOpenEdit(s)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors"
                      title="ویرایش پرونده"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>ویرایش</span>
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => {
                        if (window.confirm(`آیا از حذف کارمند «${s.name}» از لیست اطمینان دارید؟`)) {
                          onDeleteStaffMember(s.id);
                        }
                      }}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="حذف کارمند"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. TABLE VIEW */}
      {viewMode === 'TABLE' && filtered.length > 0 && (
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-xl overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#0a101f] text-slate-300 border-b border-[#1f2c45] font-semibold">
                  <th className="py-3 px-3">ردیف</th>
                  <th className="py-3 px-3">کارمند</th>
                  <th className="py-3 px-3">کد پرسنلی</th>
                  <th className="py-3 px-3">واحد سازمانی</th>
                  <th className="py-3 px-3">سمت شغلی</th>
                  <th className="py-3 px-3">شیفت</th>
                  <th className="py-3 px-3">ساعت کار</th>
                  <th className="py-3 px-3">شماره تماس</th>
                  <th className="py-3 px-3">کد ملی</th>
                  <th className="py-3 px-3">نوع قرارداد</th>
                  <th className="py-3 px-3">وضعیت</th>
                  <th className="py-3 px-3 text-center">عملیات پرونده</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2c45]">
                {filtered.map((s, idx) => {
                  const shiftInfo = getShiftBadge(s.shift);
                  const isInactive = s.status === 'inactive';
                  const docsCount = s.documents ? Object.values(s.documents).filter(Boolean).length : 0;

                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-[#142340]/40 transition-colors ${
                        isInactive ? 'opacity-70 bg-[#161726]' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-slate-400 font-mono">{toFaDigits(idx + 1)}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div
                            onClick={() => setViewingDocsStaff(s)}
                            className="w-7 h-7 rounded-lg bg-[#0a101f] border border-[#1f2c45] overflow-hidden shrink-0 cursor-pointer"
                          >
                            {s.documents?.avatarPhoto ? (
                              <img
                                src={s.documents.avatarPhoto}
                                alt={s.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div
                                className={`w-full h-full bg-gradient-to-br ${
                                  s.avatarColor || 'from-blue-600 to-indigo-700'
                                } flex items-center justify-center text-white text-[10px] font-bold`}
                              >
                                {s.name.slice(0, 1)}
                              </div>
                            )}
                          </div>
                          <span
                            onClick={() => setViewingDossier(s)}
                            className="font-bold text-slate-100 hover:text-indigo-400 cursor-pointer"
                          >
                            {s.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">{toFaDigits(s.code)}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] border ${getDeptColor(s.department)}`}>
                          {s.department}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-200 font-medium">{s.role}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] border ${shiftInfo.color}`}>
                          {shiftInfo.text}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">
                        {toFaDigits(s.entryTime || '۲۰:۰۰')} - {toFaDigits(s.exitTime || '۰۶:۰۰')}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">{toFaDigits(s.phone || '---')}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">{toFaDigits(s.nationalId || '---')}</td>
                      <td className="py-3 px-3 text-slate-300">
                        {s.contractType === 'PERMANENT'
                          ? 'استخدام رسمی'
                          : s.contractType === 'CONTRACT'
                          ? 'قراردادی'
                          : s.contractType === 'TEMPORARY'
                          ? 'پاره‌وقت'
                          : 'آزمایشی'}
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => onToggleStaffActive(s.id)}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            !isInactive
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {!isInactive ? 'فعال' : 'غیرفعال'}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setViewingDossier(s)}
                            title="مشاهده شناسنامه جامع"
                            className="px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-[11px] flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>شناسنامه</span>
                          </button>
                          <button
                            onClick={() => setViewingDocsStaff(s)}
                            title="مدارک و ضمائم"
                            className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 rounded-lg text-[11px] flex items-center gap-1"
                          >
                            <Camera className="w-3 h-3" />
                            <span>({toFaDigits(docsCount)})</span>
                          </button>
                          <button
                            onClick={() => handleOpenEdit(s)}
                            title="ویرایش"
                            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`آیا از حذف کارمند «${s.name}» اطمینان دارید؟`)) {
                                onDeleteStaffMember(s.id);
                              }
                            }}
                            title="حذف"
                            className="p-1 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. FULL EMPLOYEE DOSSIER MODAL (شناسنامه جامع کارمند) */}
      {/* ======================================================== */}
      {viewingDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2c45] bg-[#0d1524]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <IdCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    شناسنامه جامع و پرونده پرسنلی: {viewingDossier.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    کد پرسنلی: {toFaDigits(viewingDossier.code)} • واحد: {viewingDossier.department}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrintingMember(viewingDossier)}
                  title="چاپ شناسنامه رسمی پرسنلی (بهینه لیزری)"
                  className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>چاپ شناسنامه (لیزری)</span>
                </button>
                <button
                  onClick={() => setViewingDossier(null)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              {/* Profile Card Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-[#142340] to-[#0c1626] border border-[#233555] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => {
                      setViewingDocsStaff(viewingDossier);
                    }}
                    className="w-16 h-16 rounded-2xl bg-[#0a101f] border-2 border-indigo-500/40 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer shadow-lg"
                    title="مشاهده یا ویرایش عکس پرسنلی"
                  >
                    {viewingDossier.documents?.avatarPhoto ? (
                      <img
                        src={viewingDossier.documents.avatarPhoto}
                        alt={viewingDossier.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className={`w-full h-full bg-gradient-to-br ${
                          viewingDossier.avatarColor || 'from-blue-600 to-indigo-700'
                        } flex items-center justify-center text-white text-lg font-bold`}
                      >
                        {viewingDossier.name.slice(0, 2)}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-lg font-bold text-white flex items-center gap-2">
                      <span>{viewingDossier.name}</span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                          viewingDossier.status !== 'inactive'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {viewingDossier.status !== 'inactive' ? 'شاغل فعال' : 'غیرفعال'}
                      </span>
                    </div>
                    <div className="text-xs text-indigo-300 mt-1 font-semibold flex items-center gap-2">
                      <span>{viewingDossier.role}</span>
                      <span>•</span>
                      <span>{viewingDossier.department}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                      <span>کد پرسنلی: {toFaDigits(viewingDossier.code)}</span>
                      <span>•</span>
                      <span>کدملی: {toFaDigits(viewingDossier.nationalId || '---')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3.5 py-2 rounded-xl bg-[#0a101f] border border-[#1f2c45] text-center">
                    <div className="text-[10px] text-slate-400 font-medium">ارزیابی عملکرد</div>
                    <div className="text-sm font-bold text-amber-300 flex items-center justify-center gap-1 mt-0.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{toFaDigits(viewingDossier.rating || 5.0)}</span>
                    </div>
                  </div>

                  <div className="px-3.5 py-2 rounded-xl bg-[#0a101f] border border-[#1f2c45] text-center">
                    <div className="text-[10px] text-slate-400 font-medium">تعداد وظایف/مأموریت</div>
                    <div className="text-sm font-bold text-blue-300 mt-0.5">
                      {toFaDigits(viewingDossier.totalMissions || 120)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 1: مشخصات هویتی و شناسنامه‌ای */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs border-b border-[#1f2c45] pb-2">
                  <FileText className="w-4 h-4" />
                  <span>۱. مشخصات فردی و سجلی</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45]">
                    <div className="text-slate-400 text-[11px]">نام پدر</div>
                    <div className="font-semibold text-slate-200 mt-1">{viewingDossier.fatherName || '---'}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45]">
                    <div className="text-slate-400 text-[11px]">تاریخ تولد</div>
                    <div className="font-semibold text-slate-200 mt-1 font-mono">
                      {toFaDigits(viewingDossier.birthDate || '---')}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45]">
                    <div className="text-slate-400 text-[11px]">مدرک تحصیلی</div>
                    <div className="font-semibold text-slate-200 mt-1">{viewingDossier.education || '---'}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45]">
                    <div className="text-slate-400 text-[11px]">وضعیت تأهل</div>
                    <div className="font-semibold text-slate-200 mt-1">
                      {viewingDossier.maritalStatus === 'married'
                        ? `متأهل (${toFaDigits(viewingDossier.childrenCount || 0)} فرزند)`
                        : 'مجرد'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45]">
                    <div className="text-slate-400 text-[11px]">گروه خونی</div>
                    <div className="font-semibold text-rose-300 mt-1 font-mono">
                      {viewingDossier.bloodType || 'A+'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45]">
                    <div className="text-slate-400 text-[11px]">شماره تماس مستقیم</div>
                    <div className="font-semibold text-blue-300 mt-1 font-mono">
                      {toFaDigits(viewingDossier.phone || '---')}
                    </div>
                  </div>
                  <div className="col-span-2 p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45]">
                    <div className="text-slate-400 text-[11px]">نشانی محل سکونت</div>
                    <div className="font-semibold text-slate-200 mt-1">{viewingDossier.address || 'تهران'}</div>
                  </div>
                </div>
              </div>

              {/* Section 2: احکام کارگزینی، شیفت و وضعیت سازمانی */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs border-b border-[#1f2c45] pb-2">
                  <Briefcase className="w-4 h-4" />
                  <span>۲. اطلاعات سازمانی، احکام و شیفت کاری</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45]">
                    <div className="text-slate-400 text-[11px]">نوع قرارداد / استخدام</div>
                    <div className="font-semibold text-emerald-300 mt-1">
                      {viewingDossier.contractType === 'PERMANENT'
                        ? 'استخدام رسمی قطعی'
                        : viewingDossier.contractType === 'CONTRACT'
                        ? 'قراردادی سالانه'
                        : viewingDossier.contractType === 'TEMPORARY'
                        ? 'پاره‌وقت / پروژه‌ای'
                        : 'آزمایشی'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45]">
                    <div className="text-slate-400 text-[11px]">تاریخ شروع به کار</div>
                    <div className="font-semibold text-slate-200 mt-1 font-mono">
                      {toFaDigits(viewingDossier.hireDate || '---')}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45]">
                    <div className="text-slate-400 text-[11px]">شیفت کاری موظف</div>
                    <div className="font-semibold text-indigo-300 mt-1">
                      {getShiftBadge(viewingDossier.shift).text}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45]">
                    <div className="text-slate-400 text-[11px]">ساعت کاری مقرر</div>
                    <div className="font-semibold text-amber-300 mt-1 font-mono">
                      {toFaDigits(viewingDossier.entryTime || '۲۰:۰۰')} تا{' '}
                      {toFaDigits(viewingDossier.exitTime || '۰۶:۰۰')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: اطلاعات مالی، بانکی و بیمه */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs border-b border-[#1f2c45] pb-2">
                  <CreditCard className="w-4 h-4" />
                  <span>۳. امور مالی، بیمه و حساب بانکی</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45]">
                    <div className="text-slate-400 text-[11px]">شماره بیمه تأمین اجتماعی</div>
                    <div className="font-semibold text-slate-200 mt-1 font-mono">
                      {toFaDigits(viewingDossier.insuranceNumber || '---')}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45]">
                    <div className="text-slate-400 text-[11px]">پایه حقوق ماهانه</div>
                    <div className="font-semibold text-emerald-300 mt-1">
                      {toFaDigits(viewingDossier.baseSalary || '---')}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45]">
                    <div className="text-slate-400 text-[11px]">بانک عامل</div>
                    <div className="font-semibold text-slate-200 mt-1">{viewingDossier.bankName || 'بانک ملت'}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45]">
                    <div className="text-slate-400 text-[11px]">شماره کارت بانکی</div>
                    <div className="font-semibold text-slate-200 mt-1 font-mono">
                      {toFaDigits(viewingDossier.bankCardNumber || '---')}
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-4 p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45]">
                    <div className="text-slate-400 text-[11px]">شماره شبا (IBAN)</div>
                    <div className="font-semibold text-slate-200 mt-1 font-mono tracking-wider">
                      {viewingDossier.bankAccount || 'IR---'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: تماس اضطراری و یادداشت سرپرست */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs border-b border-[#1f2c45] pb-2">
                  <HeartPulse className="w-4 h-4" />
                  <span>۴. اطلاعات شرایط اضطراری و ارزیابی سرپرست</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45] space-y-1">
                    <div className="text-slate-400 text-[11px]">مشخصات رابط اضطراری</div>
                    <div className="font-semibold text-slate-200">
                      {viewingDossier.emergencyName || '---'} ({viewingDossier.emergencyRelation || 'بستگان'})
                    </div>
                    <div className="text-blue-300 font-mono">
                      تلفن: {toFaDigits(viewingDossier.emergencyPhone || '---')}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45] space-y-1">
                    <div className="text-slate-400 text-[11px]">یادداشت‌های پرونده و ارزیابی</div>
                    <div className="text-slate-300 leading-relaxed">
                      {viewingDossier.performanceNotes ||
                        viewingDossier.notes ||
                        'سوابق منظم، عملکرد شیفت عالی و فاقد تخلف انضباطی'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: مدارک و اسناد پرونده استخدامی */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#1f2c45] pb-2">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                    <span>۵. اسناد، تصاویر و مدارک ثبت شده</span>
                  </div>
                  <button
                    onClick={() => {
                      setViewingDocsStaff(viewingDossier);
                    }}
                    className="text-xs text-indigo-300 hover:text-indigo-200 font-semibold flex items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>مدیریت و بارگذاری مدارک جدید</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {STAFF_DOC_SLOTS.map((slot) => {
                    const hasDoc = viewingDossier.documents?.[slot.key as keyof typeof viewingDossier.documents];
                    const IconComp = slot.icon || FileText;

                    return (
                      <div
                        key={slot.key}
                        onClick={() => setViewingDocsStaff(viewingDossier)}
                        className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                          hasDoc
                            ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/60'
                            : 'bg-[#0a101f] border-[#1f2c45] hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <IconComp
                            className={`w-4 h-4 ${hasDoc ? 'text-emerald-400' : 'text-slate-400'}`}
                          />
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                              hasDoc
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {hasDoc ? 'تکمیل' : 'فاقد سند'}
                          </span>
                        </div>
                        <div className="text-[11px] font-semibold text-slate-200 line-clamp-1">{slot.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#1f2c45] bg-[#0d1524]">
              <div className="text-xs text-slate-400">
                سیستم جامع پرونده پرسنل و کارکنان حامی • نسخه ۱۴۰۵
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleOpenEdit(viewingDossier);
                    setViewingDossier(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>ویرایش پرونده</span>
                </button>
                <button
                  onClick={() => setViewingDossier(null)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. MULTI-TAB REGISTER / EDIT STAFF MODAL */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2c45] bg-[#0d1524]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {editingStaff ? `ویرایش پرونده کارمند: ${editingStaff.name}` : 'افتتاح پرونده کارمند جدید'}
                  </h3>
                  <p className="text-[11px] text-slate-400">ثبت و نگهداری اطلاعات جامع پرسنلی در پایگاه داده</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center border-b border-[#1f2c45] bg-[#0a101f] px-6">
              <button
                type="button"
                onClick={() => setActiveTab('PERSONAL')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'PERSONAL'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>۱. فردی و شناسنامه‌ای</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('JOB')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'JOB'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>۲. شغلی و سازمانی</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('FINANCIAL')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'FINANCIAL'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>۳. مالی و بیمه</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('EMERGENCY')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'EMERGENCY'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <HeartPulse className="w-3.5 h-3.5" />
                <span>۴. سلامت و اضطراری</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Tab 1: Personal */}
              {activeTab === 'PERSONAL' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        نام و نام خانوادگی <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="مثلاً: مهندس حسام داداشی"
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">کد پرسنلی</label>
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="مثلاً: EMP-101"
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">کد ملی ده‌رقمی</label>
                      <input
                        type="text"
                        value={formData.nationalId}
                        onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                        placeholder="0012345678"
                        maxLength={10}
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">شماره همراه</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="09120000000"
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">نام پدر</label>
                      <input
                        type="text"
                        value={formData.fatherName}
                        onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                        placeholder="نام پدر"
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <PersianDatePicker
                        label="تاریخ تولد"
                        value={formData.birthDate}
                        onChange={(val) => setFormData({ ...formData, birthDate: val })}
                        placeholder="انتخاب تاریخ تولد..."
                        minYear={1330}
                        maxYear={1410}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">مدرک تحصیلی</label>
                      <input
                        type="text"
                        value={formData.education}
                        onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                        placeholder="دیپلم / کارشناسی مدیریت / مهندسی ..."
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">وضعیت تأهل</label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={formData.maritalStatus}
                          onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value as any })}
                          className="bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="married">متأهل</option>
                          <option value="single">مجرد</option>
                        </select>
                        <input
                          type="number"
                          min={0}
                          value={formData.childrenCount}
                          onChange={(e) => setFormData({ ...formData, childrenCount: Number(e.target.value) })}
                          placeholder="تعداد فرزند"
                          className="bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">نشانی محل سکونت</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="تهران، خیابان، پلاک، واحد..."
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Job & Org */}
              {activeTab === 'JOB' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">واحد سازمانی</label>
                      <select
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        {STAFF_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">سمت شغلی</label>
                      <input
                        type="text"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        placeholder="مثلاً: سرپرست شیفت شب، کارشناس دیسپچ، حسابدار..."
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">شیفت کاری</label>
                      <select
                        value={formData.shift}
                        onChange={(e) => setFormData({ ...formData, shift: e.target.value as any })}
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="day">شیفت روز (۰۷:۰۰ الی ۱۹:۰۰ ☀️)</option>
                        <option value="night">شیفت شب (۱۹:۰۰ الی ۰۷:۰۰ 🌙)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">نوع استخدام و قرارداد</label>
                      <select
                        value={formData.contractType}
                        onChange={(e) => setFormData({ ...formData, contractType: e.target.value as any })}
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="PERMANENT">استخدام رسمی قطعی</option>
                        <option value="CONTRACT">قراردادی سالانه</option>
                        <option value="TEMPORARY">پاره‌وقت / پروژه‌ای</option>
                        <option value="PROBATION">دوره آزمایشی (۳ ماهه)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">ساعت ورود مقرر</label>
                      <input
                        type="text"
                        value={formData.entryTime}
                        onChange={(e) => setFormData({ ...formData, entryTime: e.target.value })}
                        placeholder="20:00"
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">ساعت خروج مقرر</label>
                      <input
                        type="text"
                        value={formData.exitTime}
                        onChange={(e) => setFormData({ ...formData, exitTime: e.target.value })}
                        placeholder="06:00"
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <PersianDatePicker
                        label="تاریخ شروع به کار"
                        value={formData.hireDate}
                        onChange={(val) => setFormData({ ...formData, hireDate: val })}
                        placeholder="انتخاب تاریخ استخدام..."
                        minYear={1370}
                        maxYear={1415}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">وضعیت فعالیت</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="active">فعال و مجاز برای شیفت</option>
                        <option value="inactive">غیرفعال / تعلیق</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Financial */}
              {activeTab === 'FINANCIAL' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        شماره بیمه تأمین اجتماعی
                      </label>
                      <input
                        type="text"
                        value={formData.insuranceNumber}
                        onChange={(e) => setFormData({ ...formData, insuranceNumber: e.target.value })}
                        placeholder="مثلاً: 88349201"
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">پایه حقوق و دستمزد ماهانه</label>
                      <input
                        type="text"
                        value={formData.baseSalary}
                        onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                        placeholder="مثلاً: ۲۹,۰۰۰,۰۰۰ تومان"
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">نام بانک عامل</label>
                      <input
                        type="text"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        placeholder="بانک ملت / ملی / پاسارگاد..."
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">شماره کارت بانکی (۱۶ رقم)</label>
                      <input
                        type="text"
                        value={formData.bankCardNumber}
                        onChange={(e) => setFormData({ ...formData, bankCardNumber: e.target.value })}
                        placeholder="6104-3378-..."
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">شماره شبا (IBAN)</label>
                      <input
                        type="text"
                        value={formData.bankAccount}
                        onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                        placeholder="IR000000000000000000000000"
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono tracking-wider"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Emergency & Health */}
              {activeTab === 'EMERGENCY' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">نام و نام خانوادگی رابط اضطراری</label>
                      <input
                        type="text"
                        value={formData.emergencyName}
                        onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                        placeholder="نام فرد رابط در شرایط بحرانی"
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">شماره تماس اضطراری</label>
                      <input
                        type="text"
                        value={formData.emergencyPhone}
                        onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                        placeholder="09120000000"
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">نسبت با کارمند</label>
                      <input
                        type="text"
                        value={formData.emergencyRelation}
                        onChange={(e) => setFormData({ ...formData, emergencyRelation: e.target.value })}
                        placeholder="همسر / پدر / برادر..."
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">گروه خونی</label>
                      <select
                        value={formData.bloodType}
                        onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">امتیاز ارزیابی عملکرد (۱ تا ۵)</label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        step={0.1}
                        value={formData.rating}
                        onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">یادداشت ارزیابی و سوابق سرپرست</label>
                      <textarea
                        rows={3}
                        value={formData.performanceNotes}
                        onChange={(e) => setFormData({ ...formData, performanceNotes: e.target.value })}
                        placeholder="توضیحات پیرامون شرح وظایف، عملکرد، تشویقی‌ها یا تذکرات..."
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-[#1f2c45]">
                <div className="text-[11px] text-slate-400">
                  اطلاعات مستقیماً در پرونده کارمند ثبت و ذخیره می‌شود.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-900/30 transition-colors"
                  >
                    {editingStaff ? 'ذخیره تغییرات پرونده' : 'تأیید و ثبت پرونده پرسنلی'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. DOCUMENT UPLOADER MODAL (عکس، کارت ملی، شناسنامه، قرارداد، سلامت) */}
      {/* ======================================================== */}
      {viewingDocsStaff && (
        <DocumentUploaderModal
          isOpen={!!viewingDocsStaff}
          onClose={() => setViewingDocsStaff(null)}
          title={`مدارک و ضمائم پرونده کارمند: ${viewingDocsStaff.name}`}
          subtitle={`کد پرسنلی: ${toFaDigits(viewingDocsStaff.code)} • واحد: ${viewingDocsStaff.department}`}
          slots={STAFF_DOC_SLOTS}
          documents={(viewingDocsStaff.documents as any) || {}}
          onSave={(newDocs) => {
            const updated: StaffMember = {
              ...viewingDocsStaff,
              documents: newDocs as any,
            };
            onUpdateStaffMember(updated);
            if (viewingDossier && viewingDossier.id === updated.id) {
              setViewingDossier(updated);
            }
            onShowToast?.(`مدارک و تصاویر پرونده «${updated.name}» به‌روزرسانی شد.`, 'success');
            setViewingDocsStaff(null);
          }}
        />
      )}

      {/* Laser-Optimized A4 Staff Dossier Print Modal with Customizable Watermark */}
      {printingMember && (
        <StaffDossierPrintModal
          member={printingMember}
          onClose={() => setPrintingMember(null)}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
