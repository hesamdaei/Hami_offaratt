import React, { FC, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  X,
  UserCheck,
  Building,
} from 'lucide-react';
import { StaffMember } from '../types';
import { toFaDigits, getTodayJalaali } from '../utils/jalaali';
import { getStoredPrintSettings, PrintWatermarkSettings } from '../utils/printSettings';
import { LaserPrintWatermark } from './LaserPrintWatermark';
import { LaserPrintControlToolbar } from './LaserPrintControlToolbar';

interface StaffDossierPrintModalProps {
  member: StaffMember;
  onClose: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const StaffDossierPrintModal: FC<StaffDossierPrintModalProps> = ({
  member,
  onClose,
  onShowToast,
}) => {
  const [printSettings, setPrintSettings] = useState<PrintWatermarkSettings>(() => ({
    ...getStoredPrintSettings(),
    text: getStoredPrintSettings().text || 'پرونده پرسنلی',
    subText: getStoredPrintSettings().subText || 'CONFIDENTIAL HR DOSSIER',
  }));

  const handlePrint = () => {
    window.print();
  };

  const todayStr = getTodayJalaali().fullFa;

  const modalContent = (
    <div className="print-modal-container fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs overflow-y-auto animate-fadeIn select-none print:p-0 print:m-0 print:bg-white print:static print:block print:w-full print:shadow-none print:border-none">
      <div className="print-modal-content bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[96vh] print:bg-white print:border-none print:shadow-none print:max-h-none print:w-full print:m-0 print:p-0 print:overflow-visible">
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5 text-blue-400">
            <UserCheck className="w-5 h-5" />
            <h2 className="text-sm md:text-base font-bold text-white">
              شناسنامه و پرونده پرسنلی رسمی: {member.name} (کد: {toFaDigits(member.code)})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ پرونده (لیزری)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Laser Print Control Toolbar */}
        <LaserPrintControlToolbar
          settings={printSettings}
          onChange={setPrintSettings}
          onPrint={handlePrint}
          title={`شناسنامه پرسنلی ${member.name}`}
          onShowToast={onShowToast}
        />

        {/* Printable Document Sheet (Zero Graphic Background, Crisp Laser Lines) */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-950 flex-1 print:bg-white print:p-0 print:text-black flex justify-center">
          <div
            id="printable-a4-area"
            data-printable-a4="true"
            className="w-full max-w-[210mm] bg-white text-black rounded-xl p-6 sm:p-8 border border-black shadow-md print:border-none print:shadow-none print:p-0 text-xs leading-relaxed relative overflow-hidden font-['Vazirmatn',sans-serif] a4-single-page"
            style={{ direction: 'rtl' }}
          >
            {/* Watermark */}
            <LaserPrintWatermark
              enabled={printSettings.enabled}
              text={printSettings.text}
              subText={printSettings.subText}
              opacity={printSettings.opacity}
              fontSizePt={printSettings.fontSizePt}
            />

            {/* Content */}
            <div className="relative z-10 space-y-4">
              {/* Letterhead */}
              <div className="border-b-2 border-black pb-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 border-2 border-black bg-white text-black rounded-lg flex items-center justify-center font-black">
                    <Building className="w-7 h-7 text-black" />
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-black text-black">
                      سامانه جامع مدیریت منابع انسانی و امور پرسنلی «حامی»
                    </h1>
                    <p className="text-[11px] text-black font-bold">
                      شناسنامه شغلی، سجلی و خلاصه پرونده رسمی پرسنل کادری و دفتر
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Official 3x4 Personnel Photo Frame */}
                  <div className="w-20 h-24 border-2 border-black rounded bg-white flex flex-col items-center justify-center overflow-hidden shrink-0 text-center p-0.5 shadow-xs">
                    {(member.photoUrl || member.documents?.avatarPhoto) ? (
                      <img
                        src={member.photoUrl || member.documents?.avatarPhoto}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full border border-dashed border-black/60 flex flex-col items-center justify-center p-1 text-[9px] text-black/70 font-bold">
                        <span>محل الصاق</span>
                        <span>عکس پرسنلی</span>
                        <span className="font-mono text-[8px]">۳ × ۴</span>
                      </div>
                    )}
                  </div>

                  <div className="text-left font-mono text-[11px] space-y-0.5 text-black border border-black px-2.5 py-1.5 rounded bg-white">
                    <div><strong>تاریخ استعلام:</strong> {toFaDigits(todayStr)}</div>
                    <div><strong>کد پرسنلی:</strong> {toFaDigits(member.code)}</div>
                    <div><strong>وضعیت:</strong> {member.status !== 'inactive' ? 'شاغل فعال' : 'غیرفعال'}</div>
                  </div>
                </div>
              </div>

              {/* Personal Identification & Cadre Specs Box */}
              <div className="border border-black bg-white">
                <div className="laser-hatch-header px-3 py-1.5 text-xs font-black">
                  ۱. مشخصات سجلی، فردی و اطلاعات تکمیلی پرسنل کادری و دفتر
                </div>
                <div className="p-3 space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                    <div className="border-b border-dotted border-black pb-1">
                      <span className="font-bold">نام و نام خانوادگی:</span> {member.name}
                    </div>
                    <div className="border-b border-dotted border-black pb-1">
                      <span className="font-bold">کد پرسنلی:</span> <span className="font-mono">{toFaDigits(member.code)}</span>
                    </div>
                    <div className="border-b border-dotted border-black pb-1">
                      <span className="font-bold">کد ملی:</span> <span className="font-mono">{toFaDigits(member.nationalId || '—')}</span>
                    </div>
                    <div className="border-b border-dotted border-black pb-1">
                      <span className="font-bold">نام پدر:</span> {member.fatherName || '—'}
                    </div>

                    <div className="border-b border-dotted border-black pb-1">
                      <span className="font-bold">تاریخ تولد:</span> <span className="font-mono">{toFaDigits(member.birthDate || '—')}</span>
                    </div>
                    <div className="border-b border-dotted border-black pb-1">
                      <span className="font-bold">وضعیت نظام وظیفه:</span> {member.militaryStatus || 'پایان خدمت'}
                    </div>
                    <div className="border-b border-dotted border-black pb-1">
                      <span className="font-bold">مدرک تحصیلی:</span> {member.education || '—'}
                    </div>
                    <div className="border-b border-dotted border-black pb-1">
                      <span className="font-bold">وضعیت تأهل:</span> {member.maritalStatus === 'single' ? 'مجرد' : `متأهل (${toFaDigits(member.childrenCount || 0)} فرزند)`}
                    </div>

                    <div className="border-b border-dotted border-black pb-1">
                      <span className="font-bold">واحد سازمانی:</span> {member.department}
                    </div>
                    <div className="border-b border-dotted border-black pb-1">
                      <span className="font-bold">سمت شغلی:</span> {member.role}
                    </div>
                    <div className="border-b border-dotted border-black pb-1">
                      <span className="font-bold">نوع قرارداد:</span> {
                        member.contractType === 'PERMANENT' ? 'استخدام رسمی قطعی' :
                        member.contractType === 'CONTRACT' ? 'قراردادی سالانه' :
                        member.contractType === 'TEMPORARY' ? 'پاره‌وقت / پروژه‌ای' : 'آزمایشی'
                      }
                    </div>
                    <div className="border-b border-dotted border-black pb-1">
                      <span className="font-bold">تاریخ استخدام:</span> <span className="font-mono">{toFaDigits(member.hireDate || '—')}</span>
                    </div>

                    <div className="border-b border-dotted border-black pb-1">
                      <span className="font-bold">پایان قرارداد:</span> <span className="font-mono">{toFaDigits(member.contractEndDate || 'پایان سال جاری')}</span>
                    </div>
                    <div className="border-b border-dotted border-black pb-1">
                      <span className="font-bold">شیفت سازمانی:</span> {member.shift === 'night' ? 'شیفت شب' : 'شیفت اداری / روز'}
                    </div>
                    <div className="border-b border-dotted border-black pb-1">
                      <span className="font-bold">ساعت کار مقرر:</span> <span className="font-mono">{toFaDigits(member.entryTime || '۰۸:۰۰')} تا {toFaDigits(member.exitTime || '۱۶:۰۰')}</span>
                    </div>
                    <div className="border-b border-dotted border-black pb-1">
                      <span className="font-bold">گروه خونی:</span> {member.bloodType || 'A+'}
                    </div>
                  </div>

                  {/* Financial & Insurance line */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] pt-1 border-t border-dashed border-black">
                    <div>
                      <span className="font-bold">شماره بیمه:</span> <span className="font-mono">{toFaDigits(member.insuranceNumber || '—')}</span>
                    </div>
                    <div>
                      <span className="font-bold">بانک عامل:</span> {member.bankName || 'بانک ملت'}
                    </div>
                    <div className="sm:col-span-2">
                      <span className="font-bold">شماره شبا (IBAN):</span> <span className="font-mono tracking-wider">{member.bankAccount || 'IR—'}</span>
                    </div>
                  </div>

                  {/* Address and Contacts */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] pt-1 border-t border-dashed border-black">
                    <div>
                      <span className="font-bold">تلفن همراه:</span> <span className="font-mono">{toFaDigits(member.phone || '—')}</span>
                      {member.officePhone && <span className="mr-2 text-black/80 font-mono">(داخلی: {toFaDigits(member.officePhone)})</span>}
                    </div>
                    <div>
                      <span className="font-bold">تماس اضطراری:</span> <span className="font-mono">{toFaDigits(member.emergencyPhone || '—')}</span> ({member.emergencyName || 'رابط'} - {member.emergencyRelation || 'بستگان'})
                    </div>
                    <div>
                      <span className="font-bold">کد پستی:</span> <span className="font-mono">{toFaDigits(member.postalCode || '—')}</span>
                    </div>
                  </div>

                  {member.address && (
                    <div className="text-[11px] border-t border-dashed border-black pt-1">
                      <span className="font-bold">نشانی محل سکونت:</span> {member.address}
                    </div>
                  )}
                </div>
              </div>

              {/* Documentation & Legal Compliance Checklist */}
              <div className="border border-black bg-white">
                <div className="laser-hatch-header px-3 py-1.5 text-xs font-black">
                  ۲. مدارک و اسناد بایگانی شده در پرونده فیزیکی
                </div>
                <div className="p-3">
                  <table className="w-full border-collapse border border-black text-center text-[10px]">
                    <thead>
                      <tr className="laser-dot-header border-b border-black font-bold">
                        <th className="border-l border-black p-1.5 w-10">ردیف</th>
                        <th className="border-l border-black p-1.5 text-right">عنوان مدرک اداری</th>
                        <th className="border-l border-black p-1.5">وضعیت تحویل</th>
                        <th className="border-l border-black p-1.5">تاریخ تأیید</th>
                        <th className="p-1.5">توضیحات حراست / بازرسی</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-dotted border-black">
                        <td className="border-l border-black p-1.5 font-mono">۱</td>
                        <td className="border-l border-black p-1.5 text-right">تصویر صفحه اول و دوم شناسنامه و کارت ملی هوشمند</td>
                        <td className="border-l border-black p-1.5 font-bold">تکمیل و برابر اصل</td>
                        <td className="border-l border-black p-1.5 font-mono">{toFaDigits(member.hireDate || todayStr)}</td>
                        <td className="p-1.5">موجود در زونکن امور اداری</td>
                      </tr>
                      <tr className="border-b border-dotted border-black">
                        <td className="border-l border-black p-1.5 font-mono">۲</td>
                        <td className="border-l border-black p-1.5 text-right">قرارداد رسمی کار و تعهدنامه حفظ محرمانگی اطلاعات</td>
                        <td className="border-l border-black p-1.5 font-bold">امضاء شده با اثر انگشت</td>
                        <td className="border-l border-black p-1.5 font-mono">{toFaDigits(member.hireDate || todayStr)}</td>
                        <td className="p-1.5">تأییدیه واحد حقوقی</td>
                      </tr>
                      <tr className="border-b border-dotted border-black">
                        <td className="border-l border-black p-1.5 font-mono">۳</td>
                        <td className="border-l border-black p-1.5 text-right">گواهی سلامت طب کار و عدم سوءپیشینه کیفری</td>
                        <td className="border-l border-black p-1.5 font-bold">تأییدیه معتبر</td>
                        <td className="border-l border-black p-1.5 font-mono">{toFaDigits(todayStr)}</td>
                        <td className="p-1.5">معتبر</td>
                      </tr>
                      <tr>
                        <td className="border-l border-black p-1.5 font-mono">۴</td>
                        <td className="border-l border-black p-1.5 text-right">سفته و ضمانت‌نامه حسن انجام کار سازمانی</td>
                        <td className="border-l border-black p-1.5 font-bold">تحویل خزانه اسناد</td>
                        <td className="border-l border-black p-1.5 font-mono">{toFaDigits(member.hireDate || todayStr)}</td>
                        <td className="p-1.5">تأییدیه امور مالی</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Administrative Notes */}
              <div className="border border-black bg-white text-[10px]">
                <div className="laser-dot-header px-2.5 py-1 font-bold">یادداشت‌های پرونده پرسنلی:</div>
                <p className="p-2.5">
                  {member.notes || member.performanceNotes || 'کلیه دوره‌های آموزشی بدو خدمت و آشنایی با فرآیندهای لجستیک و اعزام سپری شده و صلاحیت شغلی نامبرده به تأیید کمیته انضباطی رسیده است.'}
                </p>
              </div>

              {/* Signatures */}
              <div className="border-t-2 border-black pt-4 grid grid-cols-3 gap-6 text-center text-[11px] font-bold text-black mt-6 avoid-page-break">
                <div className="space-y-9">
                  <div>کارشناس امور پرسنلی و بایگانی</div>
                  <div className="border-t border-dashed border-black pt-1 font-normal text-[10px]">امضاء و اثر انگشت</div>
                </div>
                <div className="space-y-9">
                  <div>مدیر منابع انسانی و پشتیبانی</div>
                  <div className="border-t border-dashed border-black pt-1 font-normal text-[10px]">امضاء و تاریخ</div>
                </div>
                <div className="space-y-9">
                  <div>مدیریت عامل و امور اداری</div>
                  <div className="border-t border-dashed border-black pt-1 font-normal text-[10px]">مهر رسمی شرکت</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
