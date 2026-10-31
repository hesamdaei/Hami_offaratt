import { FC, useState, useEffect, FormEvent } from 'react';
import {
  X,
  User,
  Phone,
  Building2,
  Briefcase,
  Star,
  ShieldAlert,
  Tag,
  Save,
  Check,
} from 'lucide-react';
import { PhonebookContact, PhonebookCategory } from '../types/phonebook';

interface PhonebookContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactToEdit?: PhonebookContact | null;
  onSave: (contact: PhonebookContact) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PhonebookContactModal: FC<PhonebookContactModalProps> = ({
  isOpen,
  onClose,
  contactToEdit,
  onSave,
  onShowToast,
}) => {
  const [formData, setFormData] = useState<Partial<PhonebookContact>>({
    name: '',
    phone: '',
    altPhone: '',
    extension: '',
    category: 'CUSTOM',
    organization: '',
    role: '',
    notes: '',
    isFavorite: false,
    isEmergency: false,
    tags: [],
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (contactToEdit) {
      setFormData({ ...contactToEdit });
      setTagInput(contactToEdit.tags?.join(', ') || '');
    } else {
      setFormData({
        name: '',
        phone: '',
        altPhone: '',
        extension: '',
        category: 'CUSTOM',
        organization: '',
        role: '',
        notes: '',
        isFavorite: false,
        isEmergency: false,
        tags: [],
      });
      setTagInput('');
    }
  }, [contactToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      onShowToast?.('لطفاً نام مخاطب را وارد کنید.', 'error');
      return;
    }
    if (!formData.phone?.trim()) {
      onShowToast?.('لطفاً شماره تماس را وارد کنید.', 'error');
      return;
    }

    const tagsArray = tagInput
      .split(/[,،]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const newContact: PhonebookContact = {
      id: contactToEdit?.id || `cnt-${Date.now()}`,
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      altPhone: formData.altPhone?.trim() || undefined,
      extension: formData.extension?.trim() || undefined,
      category: (formData.category as PhonebookCategory) || 'CUSTOM',
      organization: formData.organization?.trim() || undefined,
      role: formData.role?.trim() || undefined,
      notes: formData.notes?.trim() || undefined,
      isFavorite: !!formData.isFavorite,
      isEmergency: !!formData.isEmergency,
      isCustom: true,
      tags: tagsArray,
      updatedAt: new Date().toLocaleDateString('fa-IR'),
      createdAt: contactToEdit?.createdAt || new Date().toLocaleDateString('fa-IR'),
    };

    onSave(newContact);
    onShowToast?.(
      contactToEdit ? 'مخاطب با موفقیت ویرایش شد.' : 'مخاطب جدید به دفترچه تلفن اضافه شد.',
      'success'
    );
    onClose();
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#0e172a] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 to-[#121d33] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                {contactToEdit ? 'ویرایش اطلاعات مخاطب' : 'افزودن مخاطب جدید به دفترچه تلفن'}
              </h3>
              <p className="text-[11px] text-slate-400">ثبت در پایگاه اطلاعاتی مخاطبین و دیسپچ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Row 1: Name and Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">نام مخاطب / عنوان *</label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: مهندس حسینی / تعمیرگاه مرکزی"
                className="w-full px-3 py-2 text-xs bg-[#091020] border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">دسته‌بندی مخاطب</label>
              <select
                value={formData.category || 'CUSTOM'}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-3 py-2 text-xs bg-[#091020] border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-amber-500"
              >
                <option value="CUSTOM">مخاطب اختصاصی / متفرقه</option>
                <option value="WORKSHOP">تعمیرگاه، آپاراتی و امداد خودرو</option>
                <option value="CONTRACTOR">باربری همکار و پیمانکار</option>
                <option value="CUSTOMER">مشتری و صاحب کالا</option>
                <option value="EMERGENCY">پلیس راه، اورژانس و امدادی</option>
                <option value="STAFF">پرسنل و کادر اداری</option>
                <option value="DRIVER">راننده اختصاصی</option>
              </select>
            </div>
          </div>

          {/* Row 2: Organization and Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>نام شرکت / سازمان / تعمیرگاه</span>
              </label>
              <input
                type="text"
                value={formData.organization || ''}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                placeholder="مثال: بیمه آسیا / انبار کهریزک"
                className="w-full px-3 py-2 text-xs bg-[#091020] border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>سمت / زمینه فعالیت</span>
              </label>
              <input
                type="text"
                value={formData.role || ''}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="مثال: کارشناس خسارت / مکانیک دیزل"
                className="w-full px-3 py-2 text-xs bg-[#091020] border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          {/* Row 3: Phones & VoIP Extension */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>شماره تماس اصلی *</span>
              </label>
              <input
                type="tel"
                required
                dir="ltr"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0912..."
                className="w-full px-3 py-2 text-xs bg-[#091020] border border-slate-700 rounded-xl text-emerald-300 font-mono font-bold text-left focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">شماره تماس دوم / ثابت</label>
              <input
                type="tel"
                dir="ltr"
                value={formData.altPhone || ''}
                onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                placeholder="021..."
                className="w-full px-3 py-2 text-xs bg-[#091020] border border-slate-700 rounded-xl text-slate-200 font-mono text-left focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">داخلی سانترال ویپ (PBX)</label>
              <input
                type="text"
                dir="ltr"
                value={formData.extension || ''}
                onChange={(e) => setFormData({ ...formData, extension: e.target.value })}
                placeholder="101"
                className="w-full px-3 py-2 text-xs bg-[#091020] border border-slate-700 rounded-xl text-amber-300 font-mono font-bold text-center focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          {/* Row 4: Tags and Flags */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span>تگ‌ها و کلیدواژه‌ها (با کاما جدا کنید)</span>
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="مثال: شب‌کار, مکانیک_سیار, باربری_غرب"
              className="w-full px-3 py-2 text-xs bg-[#091020] border border-slate-700 rounded-xl text-slate-200 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Row 5: Favorites & Emergency check */}
          <div className="flex flex-wrap items-center gap-4 p-3 rounded-xl bg-[#091020] border border-slate-800 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={!!formData.isFavorite}
                onChange={(e) => setFormData({ ...formData, isFavorite: e.target.checked })}
                className="rounded accent-amber-500"
              />
              <Star className="w-4 h-4 text-amber-400 fill-amber-400/30" />
              <span>افزودن به مخاطبین برگزیده و تماس سریع</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={!!formData.isEmergency}
                onChange={(e) => setFormData({ ...formData, isEmergency: e.target.checked })}
                className="rounded accent-rose-500"
              />
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>علامت‌گذاری به عنوان شماره اضطراری / امدادی</span>
            </label>
          </div>

          {/* Row 6: Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">یادداشت و توضیحات تکمیلی</label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="توضیحات ساعت پاسخگویی، آدرس دقیق، کد اشتراک یا هماهنگی لازم..."
              className="w-full px-3 py-2 text-xs bg-[#091020] border border-slate-700 rounded-xl text-slate-200 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{contactToEdit ? 'ذخیره تغییرات' : 'ثبت مخاطب در دفترچه تلفن'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
