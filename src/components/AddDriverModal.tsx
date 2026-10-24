import { FC, useState, FormEvent } from 'react';
import { X, UserPlus, Truck, Hash, Phone, CreditCard } from 'lucide-react';
import { Driver } from '../types';

interface AddDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (driver: Omit<Driver, 'id' | 'createdAt'>) => void;
}

export const AddDriverModal: FC<AddDriverModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState('');
  const [personnelCode, setPersonnelCode] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('نام و نام خانوادگی راننده الزامی است');
      return;
    }
    if (!personnelCode.trim()) {
      setError('کد پرسنلی راننده الزامی است');
      return;
    }

    onAdd({
      name: name.trim(),
      personnelCode: personnelCode.trim(),
      vehiclePlate: vehiclePlate.trim() || undefined,
      nationalId: nationalId.trim() || undefined,
      phone: phone.trim() || undefined,
      status: 'active',
    });

    setName('');
    setPersonnelCode('');
    setVehiclePlate('');
    setNationalId('');
    setPhone('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slideUp my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 bg-[#0F172A] text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 shrink-0">
              <UserPlus className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-white">
              ثبت راننده جدید در سامانه
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              نام و نام خانوادگی <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: علی احمدی"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Hash className="w-3 h-3 text-slate-400" />
                کد پرسنلی <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={personnelCode}
                onChange={(e) => setPersonnelCode(e.target.value)}
                placeholder="مثال: 1045"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-mono focus:outline-none focus:border-amber-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Truck className="w-3 h-3 text-slate-400" />
                  پلاک خودرو (اختیاری)
                </span>
                {vehiclePlate && (
                  <button
                    type="button"
                    onClick={() => setVehiclePlate('')}
                    className="text-[10px] text-amber-600 hover:text-amber-700 font-bold"
                  >
                    بدون خودرو
                  </button>
                )}
              </label>
              <input
                type="text"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                placeholder="اختیاری - مثال: ۲۲ع۶۷۸-ایران۳۳"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white transition"
              />
              {!vehiclePlate && (
                <span className="text-[10px] text-amber-600 block mt-1 leading-tight">
                  بدون خودرو: به عنوان راننده کمکی/ذخیره ثبت شده و کلیه مرخصی‌های او ثبت و نگهداری می‌شود.
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                شماره تماس
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912xxxxxxx"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-mono focus:outline-none focus:border-amber-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-slate-400" />
                کد ملی
              </label>
              <input
                type="text"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder="0012345678"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-mono focus:outline-none focus:border-amber-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-lg text-slate-600 hover:bg-slate-100 transition"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-black rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 transition shadow-sm"
            >
              افزودن راننده
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
