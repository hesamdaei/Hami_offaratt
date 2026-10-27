import { FC, useState, useMemo, FormEvent, useRef } from 'react';
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
  KeyRound,
  Upload,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  List,
  LayoutGrid,
} from 'lucide-react';
import { StaffMember, StaffContractType } from '../types';
import { AppUser, UserPermissions } from '../types/auth';
import { getStoredUsers, saveStoredUsers } from '../utils/authService';

export type StaffSortField =
  | 'code'
  | 'name'
  | 'department'
  | 'role'
  | 'shift'
  | 'contractType'
  | 'status'
  | 'phone'
  | 'nationalId'
  | 'hireDate'
  | 'rating'
  | 'missions';

export type StaffSortDirection = 'asc' | 'desc';
import { STAFF_DOC_SLOTS, STAFF_DEPARTMENTS } from '../utils/staffSeedData';
import { toFaDigits } from '../utils/jalaali';
import { DocumentUploaderModal } from './DocumentUploaderModal';
import { PersianDatePicker } from './PersianDatePicker';
import { StaffDossierPrintModal } from './StaffDossierPrintModal';
import * as XLSX from 'xlsx';

const compressImageFile = (file: File, maxW = 360, maxH = 480, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxW || height > maxH) {
          if (width / height > maxW / maxH) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          } else {
            width = Math.round((width * maxH) / height);
            height = maxH;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

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
  // View Mode: default to TABLE (نمایش سطری)
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('TABLE');
  const [sortField, setSortField] = useState<StaffSortField>('code');
  const [sortDirection, setSortDirection] = useState<StaffSortDirection>('asc');

  const handleToggleSort = (field: StaffSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Dossier View Modal (شناسنامه جامع کارمند)
  const [viewingDossier, setViewingDossier] = useState<StaffMember | null>(null);
  const [printingMember, setPrintingMember] = useState<StaffMember | null>(null);

  // Document Uploader Modal
  const [viewingDocsStaff, setViewingDocsStaff] = useState<StaffMember | null>(null);

  // Register / Edit Modal & Tab
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [activeTab, setActiveTab] = useState<'PERSONAL' | 'JOB' | 'CONTACT' | 'FINANCIAL' | 'ACCOUNT'>('PERSONAL');

  // Quick User Account Creation Modal
  const [accountModalStaff, setAccountModalStaff] = useState<StaffMember | null>(null);
  const [accountUsername, setAccountUsername] = useState('');
  const [accountPassword, setAccountPassword] = useState('123456');
  const [accountRoleTitle, setAccountRoleTitle] = useState('');
  const [accountPreset, setAccountPreset] = useState<'DISPATCH' | 'OPERATOR' | 'ADMIN' | 'FLEET' | 'VIEWER'>('OPERATOR');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    photoUrl: '',
    name: '',
    code: '',
    department: 'مدیریت و دفتر مرکزی',
    role: '',
    phone: '',
    officePhone: '',
    shift: 'day' as 'day' | 'night' | 'morning' | 'evening',
    nationalId: '',
    fatherName: '',
    birthDate: '',
    gender: 'male' as 'male' | 'female',
    militaryStatus: 'کارت پایان خدمت',
    education: '',
    maritalStatus: 'married' as 'single' | 'married',
    childrenCount: 0,
    address: '',
    postalCode: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: '',
    contractType: 'PERMANENT' as StaffContractType,
    hireDate: '',
    contractEndDate: '',
    insuranceNumber: '',
    bankName: 'بانک ملت',
    bankAccount: 'IR',
    bankCardNumber: '',
    baseSalary: '',
    taxCode: '',
    rating: 5.0,
    bloodType: 'A+',
    entryTime: '08:00',
    exitTime: '16:00',
    status: 'active' as 'active' | 'inactive',
    notes: '',
    performanceNotes: '',
    createAppUser: false,
    appUsername: '',
    appPassword: '123',
    appUserRole: 'اپراتور سیستم',
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

  // Smart Sorted Staff list for row table & cards
  const sortedStaff = useMemo(() => {
    const list = [...filtered];
    return list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'code':
          comparison = (a.code || '').localeCompare(b.code || '', undefined, { numeric: true });
          break;
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '', 'fa');
          break;
        case 'department':
          comparison = (a.department || '').localeCompare(b.department || '', 'fa');
          break;
        case 'role':
          comparison = (a.role || '').localeCompare(b.role || '', 'fa');
          break;
        case 'shift':
          comparison = (a.shift || '').localeCompare(b.shift || '', 'fa');
          break;
        case 'contractType':
          comparison = (a.contractType || '').localeCompare(b.contractType || '', 'fa');
          break;
        case 'status':
          comparison = (a.status || 'active').localeCompare(b.status || 'active', 'fa');
          break;
        case 'phone':
          comparison = (a.phone || '').localeCompare(b.phone || '', 'fa');
          break;
        case 'nationalId':
          comparison = (a.nationalId || '').localeCompare(b.nationalId || '', 'fa');
          break;
        case 'hireDate':
          comparison = (a.hireDate || '').localeCompare(b.hireDate || '', 'fa');
          break;
        case 'rating':
          comparison = (a.rating || 0) - (b.rating || 0);
          break;
        case 'missions':
          comparison = (a.totalMissions || a.missionsCountToday || 0) - (b.totalMissions || b.missionsCountToday || 0);
          break;
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filtered, sortField, sortDirection]);

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
      photoUrl: '',
      name: '',
      code: `EMP-${100 + staffMembers.length + 1}`,
      department: 'مدیریت و دفتر مرکزی',
      role: '',
      phone: '',
      officePhone: '',
      shift: 'day',
      nationalId: '',
      fatherName: '',
      birthDate: '1370/01/01',
      gender: 'male',
      militaryStatus: 'کارت پایان خدمت',
      education: 'کارشناسی',
      maritalStatus: 'married',
      childrenCount: 0,
      address: '',
      postalCode: '',
      emergencyName: '',
      emergencyPhone: '',
      emergencyRelation: 'همسر',
      contractType: 'PERMANENT',
      hireDate: '1403/01/01',
      contractEndDate: '1404/12/29',
      insuranceNumber: '',
      bankName: 'بانک ملت',
      bankAccount: 'IR',
      bankCardNumber: '',
      baseSalary: '۲۸,۰۰۰,۰۰۰ تومان',
      taxCode: '',
      rating: 5.0,
      bloodType: 'A+',
      entryTime: '08:00',
      exitTime: '16:00',
      status: 'active',
      notes: '',
      performanceNotes: '',
      createAppUser: false,
      appUsername: `emp_${100 + staffMembers.length + 1}`,
      appPassword: '123',
      appUserRole: 'اپراتور شیفت',
    });
    setActiveTab('PERSONAL');
    setIsModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (s: StaffMember) => {
    setEditingStaff(s);
    setFormData({
      photoUrl: s.photoUrl || s.documents?.avatarPhoto || '',
      name: s.name,
      code: s.code,
      department: s.department,
      role: s.role,
      phone: s.phone || '',
      officePhone: s.officePhone || '',
      shift: s.shift,
      nationalId: s.nationalId || '',
      fatherName: s.fatherName || '',
      birthDate: s.birthDate || '',
      gender: s.gender || 'male',
      militaryStatus: s.militaryStatus || 'کارت پایان خدمت',
      education: s.education || '',
      maritalStatus: s.maritalStatus || 'married',
      childrenCount: s.childrenCount || 0,
      address: s.address || '',
      postalCode: s.postalCode || '',
      emergencyName: s.emergencyName || '',
      emergencyPhone: s.emergencyPhone || '',
      emergencyRelation: s.emergencyRelation || '',
      contractType: s.contractType || 'PERMANENT',
      hireDate: s.hireDate || '',
      contractEndDate: s.contractEndDate || '',
      insuranceNumber: s.insuranceNumber || '',
      bankName: s.bankName || 'بانک ملت',
      bankAccount: s.bankAccount || 'IR',
      bankCardNumber: s.bankCardNumber || '',
      baseSalary: s.baseSalary || '',
      taxCode: s.taxCode || '',
      rating: s.rating || 5.0,
      bloodType: s.bloodType || 'A+',
      entryTime: s.entryTime || '08:00',
      exitTime: s.exitTime || '16:00',
      status: s.status || 'active',
      notes: s.notes || '',
      performanceNotes: s.performanceNotes || '',
      createAppUser: false,
      appUsername: s.code ? `user_${s.code.toLowerCase().replace(/[^a-z0-9]/g, '')}` : '',
      appPassword: '123',
      appUserRole: s.role || 'کاربر سیستم',
    });
    setActiveTab('PERSONAL');
    setIsModalOpen(true);
  };

  // Quick User Account Creation from Staff
  const handleOpenCreateUserAccount = (staff: StaffMember) => {
    setAccountModalStaff(staff);
    const suggestedUsername = staff.code
      ? `emp_${staff.code.toLowerCase().replace(/[^a-z0-9]/g, '')}`
      : `staff_${staff.id.slice(-4)}`;
    setAccountUsername(suggestedUsername);
    setAccountPassword('123456');
    setAccountRoleTitle(staff.role || 'کاربر سیستم');
    if (staff.department.includes('دیسپچ')) setAccountPreset('DISPATCH');
    else if (staff.department.includes('فنی')) setAccountPreset('FLEET');
    else if (staff.department.includes('مدیریت') || staff.department.includes('اداری')) setAccountPreset('ADMIN');
    else setAccountPreset('OPERATOR');
  };

  const handleConfirmCreateAccount = (e: FormEvent) => {
    e.preventDefault();
    if (!accountModalStaff) return;
    const cleanUsername = accountUsername.trim().toLowerCase();
    if (!cleanUsername) {
      onShowToast?.('لطفاً نام کاربری را وارد نمایید.', 'error');
      return;
    }
    if (!accountPassword.trim()) {
      onShowToast?.('لطفاً رمز عبور را وارد نمایید.', 'error');
      return;
    }
    const currentUsers = getStoredUsers();
    if (currentUsers.some((u) => u.username.toLowerCase() === cleanUsername)) {
      onShowToast?.('این نام کاربری قبلاً در سامانه ثبت شده است. لطفاً نام دیگری انتخاب کنید.', 'error');
      return;
    }

    let permissions: UserPermissions = {
      attendance: 'full',
      drivers: 'view',
      staff: 'view',
      oilService: 'none',
      regulations: 'view',
      backupRestore: false,
      userManagement: false,
      networkSettings: false,
    };
    if (accountPreset === 'DISPATCH') {
      permissions = { attendance: 'full', drivers: 'full', staff: 'view', oilService: 'view', regulations: 'full', backupRestore: false, userManagement: false, networkSettings: false };
    } else if (accountPreset === 'ADMIN') {
      permissions = { attendance: 'full', drivers: 'full', staff: 'full', oilService: 'full', regulations: 'full', backupRestore: true, userManagement: true, networkSettings: false };
    } else if (accountPreset === 'FLEET') {
      permissions = { attendance: 'view', drivers: 'full', staff: 'none', oilService: 'full', regulations: 'full', backupRestore: false, userManagement: false, networkSettings: false };
    } else if (accountPreset === 'VIEWER') {
      permissions = { attendance: 'view', drivers: 'view', staff: 'view', oilService: 'view', regulations: 'view', backupRestore: false, userManagement: false, networkSettings: false };
    }

    const newUser: AppUser = {
      id: `usr-${Date.now()}`,
      username: cleanUsername,
      password: accountPassword.trim(),
      fullName: accountModalStaff.name,
      roleTitle: accountRoleTitle.trim() || accountModalStaff.role,
      phoneNumber: accountModalStaff.phone,
      isMasterAdmin: false,
      isActive: true,
      permissions,
      createdAt: new Date().toLocaleDateString('fa-IR'),
      avatarColor: accountModalStaff.avatarColor || 'from-blue-600 to-indigo-700',
    };

    saveStoredUsers([...currentUsers, newUser]);
    setAccountModalStaff(null);
    onShowToast?.(`حساب کاربری ورود به برنامه با نام کاربری «${cleanUsername}» برای ${accountModalStaff.name} با موفقیت ایجاد شد.`, 'success');
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
        photoUrl: formData.photoUrl.trim() || editingStaff.photoUrl,
        name: formData.name.trim(),
        code: formData.code.trim() || editingStaff.code,
        department: formData.department,
        role: formData.role.trim() || 'کارشناس',
        phone: formData.phone.trim(),
        officePhone: formData.officePhone.trim(),
        shift: formData.shift,
        nationalId: formData.nationalId.trim(),
        fatherName: formData.fatherName.trim(),
        birthDate: formData.birthDate.trim(),
        gender: formData.gender,
        militaryStatus: formData.militaryStatus.trim(),
        education: formData.education.trim(),
        maritalStatus: formData.maritalStatus,
        childrenCount: Number(formData.childrenCount) || 0,
        address: formData.address.trim(),
        postalCode: formData.postalCode.trim(),
        emergencyName: formData.emergencyName.trim(),
        emergencyPhone: formData.emergencyPhone.trim(),
        emergencyRelation: formData.emergencyRelation.trim(),
        contractType: formData.contractType,
        hireDate: formData.hireDate.trim(),
        contractEndDate: formData.contractEndDate.trim(),
        insuranceNumber: formData.insuranceNumber.trim(),
        bankName: formData.bankName.trim(),
        bankAccount: formData.bankAccount.trim(),
        bankCardNumber: formData.bankCardNumber.trim(),
        baseSalary: formData.baseSalary.trim(),
        taxCode: formData.taxCode.trim(),
        rating: Number(formData.rating) || 5.0,
        bloodType: formData.bloodType.trim(),
        entryTime: formData.entryTime.trim(),
        exitTime: formData.exitTime.trim(),
        status: formData.status,
        notes: formData.notes.trim(),
        performanceNotes: formData.performanceNotes.trim(),
        documents: {
          ...(editingStaff.documents || {}),
          avatarPhoto: formData.photoUrl.trim() || editingStaff.documents?.avatarPhoto,
        },
      };
      onUpdateStaffMember(updated);
      onShowToast?.(`پرونده کارمند «${updated.name}» با موفقیت به‌روزرسانی شد.`, 'success');
      if (viewingDossier && viewingDossier.id === updated.id) {
        setViewingDossier(updated);
      }
    } else {
      const newStaff: StaffMember = {
        id: `staff-${Date.now()}`,
        photoUrl: formData.photoUrl.trim() || undefined,
        name: formData.name.trim(),
        code: formData.code.trim() || `EMP-${100 + staffMembers.length + 1}`,
        department: formData.department,
        role: formData.role.trim() || 'کارمند عملیات',
        phone: formData.phone.trim(),
        officePhone: formData.officePhone.trim() || undefined,
        shift: formData.shift,
        nationalId: formData.nationalId.trim(),
        fatherName: formData.fatherName.trim(),
        birthDate: formData.birthDate.trim(),
        gender: formData.gender,
        militaryStatus: formData.militaryStatus.trim(),
        education: formData.education.trim(),
        maritalStatus: formData.maritalStatus,
        childrenCount: Number(formData.childrenCount) || 0,
        address: formData.address.trim(),
        postalCode: formData.postalCode.trim() || undefined,
        emergencyName: formData.emergencyName.trim(),
        emergencyPhone: formData.emergencyPhone.trim(),
        emergencyRelation: formData.emergencyRelation.trim(),
        contractType: formData.contractType,
        hireDate: formData.hireDate.trim(),
        contractEndDate: formData.contractEndDate.trim() || undefined,
        insuranceNumber: formData.insuranceNumber.trim(),
        bankName: formData.bankName.trim(),
        bankAccount: formData.bankAccount.trim(),
        bankCardNumber: formData.bankCardNumber.trim(),
        baseSalary: formData.baseSalary.trim(),
        taxCode: formData.taxCode.trim() || undefined,
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
        documents: formData.photoUrl ? { avatarPhoto: formData.photoUrl } : undefined,
      };

      // Also create app user if checked and valid username
      if (formData.createAppUser && formData.appUsername.trim()) {
        const cleanUser = formData.appUsername.trim().toLowerCase();
        const currentUsers = getStoredUsers();
        if (!currentUsers.some((u) => u.username.toLowerCase() === cleanUser)) {
          const newUser: AppUser = {
            id: `usr-${Date.now()}`,
            username: cleanUser,
            password: formData.appPassword.trim() || '123',
            fullName: newStaff.name,
            roleTitle: formData.appUserRole.trim() || newStaff.role,
            phoneNumber: newStaff.phone,
            isMasterAdmin: false,
            isActive: true,
            permissions: {
              attendance: 'full',
              drivers: 'view',
              staff: 'view',
              oilService: 'none',
              regulations: 'view',
              backupRestore: false,
              userManagement: false,
              networkSettings: false,
            },
            createdAt: new Date().toLocaleDateString('fa-IR'),
            avatarColor: 'from-blue-600 to-indigo-700',
          };
          saveStoredUsers([...currentUsers, newUser]);
          onShowToast?.(`حساب ورود با نام کاربری «${cleanUser}» نیز همزمان ایجاد شد.`, 'info');
        }
      }

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

          {/* Quick Sort Selector */}
          <div className="flex items-center gap-1.5 bg-[#0a101f] border border-[#1f2c45] rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] text-slate-400 whitespace-nowrap font-medium">مرتب‌سازی:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as StaffSortField)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer font-medium"
            >
              <option value="code" className="bg-[#0f172a]">کد پرسنلی</option>
              <option value="name" className="bg-[#0f172a]">نام و نام خانوادگی</option>
              <option value="department" className="bg-[#0f172a]">واحد سازمانی</option>
              <option value="role" className="bg-[#0f172a]">سمت شغلی</option>
              <option value="shift" className="bg-[#0f172a]">شیفت کاری</option>
              <option value="contractType" className="bg-[#0f172a]">نوع قرارداد</option>
              <option value="status" className="bg-[#0f172a]">وضعیت کاری</option>
              <option value="hireDate" className="bg-[#0f172a]">تاریخ استخدام</option>
              <option value="rating" className="bg-[#0f172a]">امتیاز عملکرد (KPI)</option>
              <option value="missions" className="bg-[#0f172a]">تعداد مأموریت‌ها</option>
            </select>
            <button
              type="button"
              onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
              className="p-1 rounded bg-[#172542] hover:bg-slate-700 text-indigo-400 transition cursor-pointer"
              title={sortDirection === 'asc' ? 'صعودی (جهت تغییر به نزولی کلیک کنید)' : 'نزولی (جهت تغییر به صعودی کلیک کنید)'}
            >
              {sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* View Mode Toggle: Row-based Table vs Cards */}
          <div className="flex items-center bg-[#0a101f] border border-[#1f2c45] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              title="نمایش سطری در قالب جدول با قابلیت چینش بر اساس ستون‌ها"
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'TABLE' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>نمایش سطری (جدول)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('GRID')}
              title="نمایش در قالب کارت‌های پرسنلی"
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'GRID' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>نمایش کارتی</span>
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
      {/* 4. CARDS GRID VIEW */}
      {viewMode === 'GRID' && sortedStaff.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {sortedStaff.map((s) => {
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
                    {/* 3x4 Portrait photo or stylized initials */}
                    <div
                      onClick={() => setViewingDocsStaff(s)}
                      className="w-12 h-14 rounded-xl bg-[#0a101f] border border-[#1f2c45] flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-indigo-500 transition-colors relative shadow-inner"
                      title="کلیک برای مشاهده یا بارگذاری عکس پرسنلی و مدارک"
                    >
                      {(s.photoUrl || s.documents?.avatarPhoto) ? (
                        <img
                          src={s.photoUrl || s.documents?.avatarPhoto}
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
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-[#0a101f] rounded-full" />
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
                    {/* Create Login User Button */}
                    <button
                      onClick={() => handleOpenCreateUserAccount(s)}
                      className="px-2 py-1 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs flex items-center gap-1 transition-colors"
                      title="ساخت کاربری ورود به برنامه (با نام کاربری قابل ویرایش)"
                    >
                      <KeyRound className="w-3 h-3 text-emerald-400" />
                      <span>کاربری ورود</span>
                    </button>

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

      {/* 5. ROW-BASED TABLE VIEW WITH COLUMN SORTING */}
      {viewMode === 'TABLE' && sortedStaff.length > 0 && (
        <div className="bg-[#111b2e] border border-[#1f2c45] rounded-xl overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#0a101f] text-slate-300 border-b border-[#1f2c45] font-semibold select-none">
                  <th className="py-3 px-3 text-center w-12">ردیف</th>

                  <th
                    onClick={() => handleToggleSort('name')}
                    className="py-3 px-3 cursor-pointer hover:bg-[#142340] transition-colors"
                    title="کلیک برای مرتب‌سازی بر اساس نام کارمند"
                  >
                    <div className="flex items-center gap-1 font-bold">
                      <span>کارمند</span>
                      {sortField === 'name' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('code')}
                    className="py-3 px-3 text-center cursor-pointer hover:bg-[#142340] transition-colors"
                    title="کلیک برای مرتب‌سازی بر اساس کد پرسنلی"
                  >
                    <div className="flex items-center justify-center gap-1 font-bold">
                      <span>کد پرسنلی</span>
                      {sortField === 'code' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('department')}
                    className="py-3 px-3 cursor-pointer hover:bg-[#142340] transition-colors"
                    title="کلیک برای مرتب‌سازی بر اساس واحد سازمانی"
                  >
                    <div className="flex items-center gap-1 font-bold">
                      <span>واحد سازمانی</span>
                      {sortField === 'department' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('role')}
                    className="py-3 px-3 cursor-pointer hover:bg-[#142340] transition-colors"
                    title="کلیک برای مرتب‌سازی بر اساس سمت شغلی"
                  >
                    <div className="flex items-center gap-1 font-bold">
                      <span>سمت شغلی</span>
                      {sortField === 'role' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('shift')}
                    className="py-3 px-3 text-center cursor-pointer hover:bg-[#142340] transition-colors"
                    title="کلیک برای مرتب‌سازی بر اساس شیفت کاری"
                  >
                    <div className="flex items-center justify-center gap-1 font-bold">
                      <span>شیفت</span>
                      {sortField === 'shift' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th className="py-3 px-3 text-center">ساعت کار</th>

                  <th
                    onClick={() => handleToggleSort('phone')}
                    className="py-3 px-3 text-center cursor-pointer hover:bg-[#142340] transition-colors"
                    title="کلیک برای مرتب‌سازی بر اساس شماره تماس"
                  >
                    <div className="flex items-center justify-center gap-1 font-bold">
                      <span>شماره تماس</span>
                      {sortField === 'phone' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('nationalId')}
                    className="py-3 px-3 text-center cursor-pointer hover:bg-[#142340] transition-colors"
                    title="کلیک برای مرتب‌سازی بر اساس کد ملی"
                  >
                    <div className="flex items-center justify-center gap-1 font-bold">
                      <span>کد ملی</span>
                      {sortField === 'nationalId' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('contractType')}
                    className="py-3 px-3 text-center cursor-pointer hover:bg-[#142340] transition-colors"
                    title="کلیک برای مرتب‌سازی بر اساس نوع قرارداد"
                  >
                    <div className="flex items-center justify-center gap-1 font-bold">
                      <span>نوع قرارداد</span>
                      {sortField === 'contractType' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('status')}
                    className="py-3 px-3 text-center cursor-pointer hover:bg-[#142340] transition-colors"
                    title="کلیک برای مرتب‌سازی بر اساس وضعیت"
                  >
                    <div className="flex items-center justify-center gap-1 font-bold">
                      <span>وضعیت</span>
                      {sortField === 'status' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th className="py-3 px-3 text-center">عملیات پرونده</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2c45]">
                {sortedStaff.map((s, idx) => {
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
                            className="w-8 h-9 rounded-lg bg-[#0a101f] border border-[#1f2c45] overflow-hidden shrink-0 cursor-pointer hover:border-indigo-500 transition-colors"
                            title="کلیک برای عکس پرسنلی و مدارک"
                          >
                            {(s.photoUrl || s.documents?.avatarPhoto) ? (
                              <img
                                src={s.photoUrl || s.documents?.avatarPhoto}
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
                            onClick={() => handleOpenCreateUserAccount(s)}
                            title="ساخت کاربری برای ورود به برنامه با نام کاربری دلخواه و قابل ویرایش"
                            className="p-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg transition-colors"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
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
                    className="w-16 h-20 rounded-xl bg-[#0a101f] border-2 border-indigo-500/50 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer shadow-lg hover:border-indigo-400 transition-colors relative"
                    title="مشاهده یا ویرایش عکس پرسنلی و مدارک"
                  >
                    {(viewingDossier.photoUrl || viewingDossier.documents?.avatarPhoto) ? (
                      <img
                        src={viewingDossier.photoUrl || viewingDossier.documents?.avatarPhoto}
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
                      <span>•</span>
                      <span>نظام وظیفه: {viewingDossier.militaryStatus || 'پایان خدمت'}</span>
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
                  <span>۱. مشخصات فردی، سجلی و عکس پرسنلی</span>
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
                    <div className="text-slate-400 text-[11px]">وضعیت نظام وظیفه</div>
                    <div className="font-semibold text-slate-200 mt-1">{viewingDossier.militaryStatus || 'کارت پایان خدمت'}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45]">
                    <div className="text-slate-400 text-[11px]">گروه خونی</div>
                    <div className="font-semibold text-rose-300 mt-1 font-mono">
                      {viewingDossier.bloodType || 'A+'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45]">
                    <div className="text-slate-400 text-[11px]">تلفن همراه</div>
                    <div className="font-semibold text-blue-300 mt-1 font-mono">
                      {toFaDigits(viewingDossier.phone || '---')}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45]">
                    <div className="text-slate-400 text-[11px]">تلفن داخلی دفتر</div>
                    <div className="font-semibold text-slate-200 mt-1 font-mono">
                      {toFaDigits(viewingDossier.officePhone || '---')}
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-3 p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45]">
                    <div className="text-slate-400 text-[11px]">نشانی محل سکونت</div>
                    <div className="font-semibold text-slate-200 mt-1">{viewingDossier.address || 'تهران'}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0a101f] border border-[#1f2c45]">
                    <div className="text-slate-400 text-[11px]">کد پستی</div>
                    <div className="font-semibold text-slate-200 mt-1 font-mono">{toFaDigits(viewingDossier.postalCode || '---')}</div>
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
                    <div className="text-slate-400 text-[11px]">پایان اعتبار قرارداد</div>
                    <div className="font-semibold text-slate-200 mt-1 font-mono">
                      {toFaDigits(viewingDossier.contractEndDate || 'پایان سال')}
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
                  type="button"
                  onClick={() => {
                    const target = viewingDossier;
                    setViewingDossier(null);
                    handleOpenCreateUserAccount(target);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>ساخت کاربری ورود</span>
                </button>
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
                    {editingStaff ? `ویرایش پرونده پرسنل: ${editingStaff.name}` : 'افتتاح پرونده پرسنلی کادری و دفتر'}
                  </h3>
                  <p className="text-[11px] text-slate-400">ثبت اطلاعات جامع هویتی، شغلی، عکس ۳×۴ و کاربری ورود به سامانه</p>
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
            <div className="flex items-center border-b border-[#1f2c45] bg-[#0a101f] px-3 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('PERSONAL')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'PERSONAL'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>۱. فردی و عکس ۳×۴</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('JOB')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'JOB'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>۲. شغلی و احکام کادری</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('CONTACT')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'CONTACT'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>۳. تماس و نشانی</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('FINANCIAL')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'FINANCIAL'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>۴. مالی، بیمه و مالیات</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ACCOUNT')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'ACCOUNT'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>۵. کاربری ورود و ارزیابی</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Tab 1: Personal & 3x4 Photo */}
              {activeTab === 'PERSONAL' && (
                <div className="space-y-5 animate-in fade-in duration-100">
                  {/* Photo Uploader Box */}
                  <div className="p-4 rounded-xl bg-[#0a101f] border border-[#1f2c45] flex flex-col sm:flex-row items-center gap-4">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setIsUploadingPhoto(true);
                          try {
                            const base64 = await compressImageFile(file, 360, 480, 0.85);
                            setFormData((prev) => ({ ...prev, photoUrl: base64 }));
                            onShowToast?.('عکس پرسنلی ۳×۴ با موفقیت بارگذاری شد.', 'success');
                          } catch {
                            onShowToast?.('خطا در پردازش تصویر', 'error');
                          } finally {
                            setIsUploadingPhoto(false);
                          }
                        }
                      }}
                    />

                    {/* Photo Preview Container (3x4 aspect ratio: 96px x 128px) */}
                    <div className="relative group w-24 h-32 rounded-xl bg-[#111b2e] border-2 border-dashed border-indigo-500/40 overflow-hidden flex flex-col items-center justify-center shrink-0 shadow-md">
                      {formData.photoUrl ? (
                        <>
                          <img
                            src={formData.photoUrl}
                            alt="عکس پرسنلی"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                            <button
                              type="button"
                              onClick={() => photoInputRef.current?.click()}
                              className="px-2 py-1 bg-indigo-600 rounded text-[10px] text-white font-medium"
                            >
                              تغییر
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData((prev) => ({ ...prev, photoUrl: '' }))}
                              className="px-2 py-1 bg-rose-600 rounded text-[10px] text-white font-medium"
                            >
                              حذف
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-2 flex flex-col items-center">
                          <ImageIcon className="w-7 h-7 text-indigo-400/70 mb-1" />
                          <span className="text-[10px] text-slate-400 font-medium">عکس ۳×۴ پرسنلی</span>
                        </div>
                      )}
                    </div>

                    {/* Uploader Controls */}
                    <div className="flex-1 space-y-2 text-center sm:text-right">
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5 justify-center sm:justify-start">
                          <Camera className="w-3.5 h-3.5 text-indigo-400" />
                          <span>عکس پرسنلی رسمی ۳×۴ کارمند</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          برای نمایش در پرونده اداری، کارت شناسایی و چاپ رسمی شناسنامه پرسنل حامی
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start pt-1">
                        <button
                          type="button"
                          disabled={isUploadingPhoto}
                          onClick={() => photoInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isUploadingPhoto ? 'در حال بهینه‌سازی...' : 'بارگذاری عکس از دستگاه'}</span>
                        </button>

                        {formData.photoUrl && (
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, photoUrl: '' }))}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-xs transition-colors border border-slate-700 hover:border-rose-500/30"
                          >
                            حذف تصویر
                          </button>
                        )}
                      </div>

                      {/* Sample Preset Avatars for quick selection */}
                      <div className="flex items-center gap-1.5 pt-1 justify-center sm:justify-start">
                        <span className="text-[10px] text-slate-500">انتخاب سریع پرتره:</span>
                        {[
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=180&h=240&fit=crop&crop=face',
                          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=180&h=240&fit=crop&crop=face',
                          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=180&h=240&fit=crop&crop=face',
                          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=180&h=240&fit=crop&crop=face',
                        ].map((url, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, photoUrl: url }))}
                            className="w-7 h-7 rounded-full overflow-hidden border border-slate-700 hover:border-indigo-400 transition-all hover:scale-110"
                            title={`پرتره آماده شماره ${i + 1}`}
                          >
                            <img src={url} alt={`نمونه ${i + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Personal Fields Grid */}
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
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">جنسیت</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })}
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="male">مرد</option>
                        <option value="female">زن</option>
                      </select>
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
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">وضعیت نظام وظیفه</label>
                      <select
                        value={formData.militaryStatus}
                        onChange={(e) => setFormData({ ...formData, militaryStatus: e.target.value })}
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="کارت پایان خدمت">کارت پایان خدمت</option>
                        <option value="معافیت دائم پزشکی">معافیت دائم پزشکی</option>
                        <option value="معافیت دائم کفالت">معافیت دائم کفالت</option>
                        <option value="معافیت تحصیلی">معافیت تحصیلی</option>
                        <option value="مشمول در حال خدمت">مشمول در حال خدمت</option>
                        <option value="عدم شمول / بانوان">عدم شمول / بانوان</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">مدرک و رشته تحصیلی</label>
                      <input
                        type="text"
                        value={formData.education}
                        onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                        placeholder="دیپلم / کارشناسی مدیریت / مهندسی کامپیوتر..."
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">وضعیت تأهل و عائله‌مندی</label>
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
                  </div>
                </div>
              )}

              {/* Tab 2: Job & Office Cadre */}
              {activeTab === 'JOB' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">کد پرسنلی کادری</label>
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="مثلاً: EMP-101"
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">واحد سازمانی و اداری</label>
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
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">سمت شغلی و رده اداری</label>
                      <input
                        type="text"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        placeholder="مثلاً: کارشناس ارشد دیسپچ، مدیر دفتر، حسابدار..."
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
                        <option value="day">شیفت روز (۰۸:۰۰ الی ۱۶:۳۰ ☀️)</option>
                        <option value="night">شیفت شب (۱۹:۰۰ الی ۰۷:۰۰ 🌙)</option>
                        <option value="morning">شیفت صبحگاهی (۰۶:۰۰ الی ۱۴:۰۰ 🌅)</option>
                        <option value="evening">شیفت عصرگاهی (۱۴:۰۰ الی ۲۲:۰۰ 🌆)</option>
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
                        placeholder="08:00"
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">ساعت خروج مقرر</label>
                      <input
                        type="text"
                        value={formData.exitTime}
                        onChange={(e) => setFormData({ ...formData, exitTime: e.target.value })}
                        placeholder="16:30"
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <PersianDatePicker
                        label="تاریخ شروع به کار (استخدام)"
                        value={formData.hireDate}
                        onChange={(val) => setFormData({ ...formData, hireDate: val })}
                        placeholder="انتخاب تاریخ استخدام..."
                        minYear={1370}
                        maxYear={1415}
                      />
                    </div>

                    <div>
                      <PersianDatePicker
                        label="تاریخ خاتمه قرارداد جاری"
                        value={formData.contractEndDate}
                        onChange={(val) => setFormData({ ...formData, contractEndDate: val })}
                        placeholder="انتخاب تاریخ پایان قرارداد..."
                        minYear={1400}
                        maxYear={1420}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">وضعیت فعالیت</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="active">فعال و مجاز برای شیفت کاری</option>
                        <option value="inactive">غیرفعال / تعلیق اداری</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Contact & Address */}
              {activeTab === 'CONTACT' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">شماره تلفن همراه</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="09120000000"
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        شماره تلفن دفتر / داخلی مستقیم
                      </label>
                      <input
                        type="text"
                        value={formData.officePhone}
                        onChange={(e) => setFormData({ ...formData, officePhone: e.target.value })}
                        placeholder="021-88000000 داخلی 104"
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">کد پستی ده‌رقمی</label>
                      <input
                        type="text"
                        value={formData.postalCode}
                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                        placeholder="1998765432"
                        maxLength={10}
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">نشانی کامل محل سکونت</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="تهران، خیابان، کوچه، پلاک، طبقه، واحد..."
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Emergency Contact Group */}
                  <div className="p-3.5 rounded-xl bg-[#0a101f] border border-[#1f2c45] space-y-3">
                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5" />
                      <span>مشخصات رابط در شرایط بحران و اضطرار</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">نام و نام خانوادگی رابط</label>
                        <input
                          type="text"
                          value={formData.emergencyName}
                          onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                          placeholder="نام فرد رابط"
                          className="w-full bg-[#111b2e] border border-[#1f2c45] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">شماره تماس رابط</label>
                        <input
                          type="text"
                          value={formData.emergencyPhone}
                          onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                          placeholder="09120000000"
                          className="w-full bg-[#111b2e] border border-[#1f2c45] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">نسبت با کارمند</label>
                        <input
                          type="text"
                          value={formData.emergencyRelation}
                          onChange={(e) => setFormData({ ...formData, emergencyRelation: e.target.value })}
                          placeholder="همسر / پدر / برادر..."
                          className="w-full bg-[#111b2e] border border-[#1f2c45] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Financial, Insurance & Tax */}
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
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        کد کلاسه مالیاتی / شماره اقتصادی پرسنل
                      </label>
                      <input
                        type="text"
                        value={formData.taxCode}
                        onChange={(e) => setFormData({ ...formData, taxCode: e.target.value })}
                        placeholder="مثلاً: TAX-405-9921"
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">پایه حقوق و دستمزد ماهانه</label>
                      <input
                        type="text"
                        value={formData.baseSalary}
                        onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                        placeholder="مثلاً: ۲۸,۰۰۰,۰۰۰ تومان"
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">نام بانک عامل</label>
                      <input
                        type="text"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        placeholder="بانک ملت / ملی / پاسارگاد / تجارت..."
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

                    <div>
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

              {/* Tab 5: Login Account Creation & Evaluation */}
              {activeTab === 'ACCOUNT' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  {/* App User Account Integration Box */}
                  <div className="p-4 rounded-xl bg-[#0a101f] border border-indigo-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formData.createAppUser}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setFormData((prev) => ({
                              ...prev,
                              createAppUser: checked,
                              appUsername:
                                prev.appUsername ||
                                (prev.code ? prev.code.toLowerCase().replace(/[^a-z0-9]/g, '') : `user${Math.floor(100 + Math.random() * 900)}`),
                            }));
                          }}
                          className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-[#111b2e]"
                        />
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                          ایجاد حساب کاربری ورود به برنامه (حامی) برای این کارمند
                        </span>
                      </label>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        نام کاربری قابل ویرایش
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      با فعال‌سازی این بخش، پرسنل می‌تواند با نام کاربری و رمز عبور اختصاصی وارد سامانه مدیریت تردد و ترابری حامی شود.
                    </p>

                    {formData.createAppUser && (
                      <div className="p-3 rounded-lg bg-[#111b2e] border border-[#1f2c45] space-y-3 mt-2 animate-in fade-in duration-150">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-semibold text-slate-300">
                                نام کاربری ورود <span className="text-indigo-400 font-normal">(کاملاً قابل ویرایش)</span>
                              </label>
                              <span className="text-[10px] text-emerald-400">حروف انگلیسی و ارقام</span>
                            </div>
                            <input
                              type="text"
                              required={formData.createAppUser}
                              value={formData.appUsername}
                              onChange={(e) => setFormData({ ...formData, appUsername: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                              placeholder="مثلاً: ahmadi یا hesam.d"
                              className="w-full bg-[#0a101f] border border-indigo-500/40 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-400 font-mono text-left"
                              dir="ltr"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">
                              نام کاربری دلخواه خود را تایپ کنید؛ این شناسه برای ورود به برنامه استفاده خواهد شد.
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">رمز عبور ورود</label>
                            <input
                              type="text"
                              required={formData.createAppUser}
                              value={formData.appPassword}
                              onChange={(e) => setFormData({ ...formData, appPassword: e.target.value })}
                              placeholder="رمز عبور مثلاً 123456"
                              className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono text-left"
                              dir="ltr"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-slate-300 mb-1">عنوان نقش کاربری در سامانه</label>
                            <input
                              type="text"
                              value={formData.appUserRole}
                              onChange={(e) => setFormData({ ...formData, appUserRole: e.target.value })}
                              placeholder="اپراتور دیسپچ / کارشناس ثبت تردد / مدیر سیستم..."
                              className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Evaluation & Supervisor Notes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">یادداشت‌های محرمانه سرپرست</label>
                      <input
                        type="text"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="سوابق، ملاحظات حفاظتی، تقدیرنامه‌ها..."
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">شرح سوابق ارزیابی و صلاحیت شغلی</label>
                      <textarea
                        rows={3}
                        value={formData.performanceNotes}
                        onChange={(e) => setFormData({ ...formData, performanceNotes: e.target.value })}
                        placeholder="توضیحات پیرامون شرح وظایف کادری، تعهدات اداری، سوابق آموزشی و تشویقی‌ها..."
                        className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-[#1f2c45]">
                <div className="text-[11px] text-slate-400">
                  اطلاعات پرسنل به همراه عکس ۳×۴ در پرونده اداری حامی ثبت و محافظت می‌شود.
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
      {/* 7.5 QUICK USER LOGIN ACCOUNT CREATION MODAL */}
      {/* ======================================================== */}
      {accountModalStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#111b2e] border border-[#1f2c45] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2c45] bg-[#0d1524]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">ساخت حساب کاربری ورود به سامانه</h3>
                  <p className="text-[11px] text-slate-400">
                    برای پرسنل: {accountModalStaff.name} ({accountModalStaff.department})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAccountModalStaff(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Account Creation Form */}
            <form onSubmit={handleConfirmCreateAccount} className="p-6 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-200">
                    نام کاربری ورود (Username) <span className="text-emerald-400 font-normal">*(کاملاً قابل ویرایش)*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">حروف انگلیسی و ارقام</span>
                </div>
                <input
                  type="text"
                  required
                  value={accountUsername}
                  onChange={(e) => setAccountUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="مثلاً: ahmadi یا hesam.d"
                  className="w-full bg-[#0a101f] border border-emerald-500/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400 font-mono text-left tracking-wide"
                  dir="ltr"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  نام کاربری برای ورود به برنامه کاملاً قابل ویرایش است. کاربر با این نام کاربری وارد سامانه حامی خواهد شد.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">رمز عبور اختصاصی</label>
                <input
                  type="text"
                  required
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  placeholder="رمز عبور..."
                  className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">عنوان نقش کاربری در سامانه</label>
                <input
                  type="text"
                  value={accountRoleTitle}
                  onChange={(e) => setAccountRoleTitle(e.target.value)}
                  placeholder="مثلاً: کارشناس دیسپچ، سرپرست انبار، حسابدار..."
                  className="w-full bg-[#0a101f] border border-[#1f2c45] rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Preset selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-2">قالب سطح دسترسی پیش‌فرض</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'OPERATOR', label: 'اپراتور استاندارد', desc: 'حضور و غیاب + مشاهده رانندگان' },
                    { id: 'DISPATCH', label: 'دیسپچ و ترابری', desc: 'دسترسی کامل رانندگان و تردد' },
                    { id: 'FLEET', label: 'فنی و سرویس روغن', desc: 'مدیریت ناوگان و سرویس‌ها' },
                    { id: 'ADMIN', label: 'مدیر اداری / کادر', desc: 'دسترسی کامل اداری و پرسنل' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setAccountPreset(preset.id as any)}
                      className={`p-2.5 rounded-xl border text-right transition-all ${
                        accountPreset === preset.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                          : 'bg-[#0a101f] border-[#1f2c45] text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="font-semibold text-xs text-slate-200">{preset.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{preset.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-[#1f2c45]">
                <button
                  type="button"
                  onClick={() => setAccountModalStaff(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 transition-colors flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>تأیید و ساخت کاربری</span>
                </button>
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
