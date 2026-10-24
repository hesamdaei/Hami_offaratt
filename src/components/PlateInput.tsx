import { FC, useState, useEffect } from 'react';
import { toFaDigits } from '../utils/jalaali';
import { IranianPlate, IRANIAN_PLATE_LETTERS, parseIranianPlate } from './IranianPlate';

interface PlateInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const PlateInput: FC<PlateInputProps> = ({
  value,
  onChange,
  className = '',
}) => {
  // Parse current value
  const [twoDigits, setTwoDigits] = useState('۲۵');
  const [letter, setLetter] = useState('ع');
  const [threeDigits, setThreeDigits] = useState('۵۳۳');
  const [provinceCode, setProvinceCode] = useState('۶۶');

  useEffect(() => {
    if (!value) return;
    const parsed = parseIranianPlate(value);
    setTwoDigits(parsed.twoDigits);
    setLetter(parsed.letter);
    setThreeDigits(parsed.threeDigits);
    setProvinceCode(parsed.provinceCode);
  }, [value]);

  const updatePlate = (d2: string, lettr: string, d3: string, prov: string) => {
    // Standard Iranian database format: "۶۶-۵۳۳ع۲۵" (provinceCode - threeDigits + letter + twoDigits)
    const formatted = `${toFaDigits(prov)}-${toFaDigits(d3)}${lettr}${toFaDigits(d2)}`;
    onChange(formatted);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div
        dir="ltr"
        className="flex items-center justify-between gap-1.5 p-2 bg-[#090e1a] border border-[#1e2d47] rounded-xl"
      >
        {/* Blue IRAN stripe */}
        <div className="w-6 h-9 bg-[#003399] rounded flex flex-col items-center justify-between py-1 text-[7px] text-white font-bold shrink-0">
          <div className="w-3.5 h-2 bg-white rounded-[1px] flex flex-col overflow-hidden">
            <div className="h-1/3 bg-green-600" />
            <div className="h-1/3 bg-white" />
            <div className="h-1/3 bg-red-600" />
          </div>
          <span>I.R.</span>
        </div>

        {/* 2 Digits */}
        <div className="flex-1 flex flex-col items-center">
          <span className="text-[10px] text-slate-400 mb-0.5">۲ رقم</span>
          <input
            type="text"
            maxLength={2}
            value={twoDigits}
            onChange={(e) => {
              const val = e.target.value.replace(/[^\d۰-۹]/g, '');
              setTwoDigits(val);
              updatePlate(val, letter, threeDigits, provinceCode);
            }}
            placeholder="۲۵"
            className="w-12 text-center bg-[#131d30] border border-[#2a3c5a] text-white font-bold text-sm py-1 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Letter Selector */}
        <div className="flex-1 flex flex-col items-center">
          <span className="text-[10px] text-slate-400 mb-0.5">حرف</span>
          <select
            value={letter}
            onChange={(e) => {
              const val = e.target.value;
              setLetter(val);
              updatePlate(twoDigits, val, threeDigits, provinceCode);
            }}
            className="w-14 text-center bg-[#131d30] border border-[#2a3c5a] text-amber-300 font-black text-sm py-1 rounded-lg focus:border-blue-500 focus:outline-none"
          >
            {IRANIAN_PLATE_LETTERS.map((l) => (
              <option key={l.char} value={l.char}>
                {l.char} ({l.type})
              </option>
            ))}
          </select>
        </div>

        {/* 3 Digits */}
        <div className="flex-1 flex flex-col items-center">
          <span className="text-[10px] text-slate-400 mb-0.5">۳ رقم</span>
          <input
            type="text"
            maxLength={3}
            value={threeDigits}
            onChange={(e) => {
              const val = e.target.value.replace(/[^\d۰-۹]/g, '');
              setThreeDigits(val);
              updatePlate(twoDigits, letter, val, provinceCode);
            }}
            placeholder="۵۳۳"
            className="w-14 text-center bg-[#131d30] border border-[#2a3c5a] text-white font-bold text-sm py-1 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Province Code */}
        <div className="flex-1 flex flex-col items-center pl-1 border-l border-slate-700">
          <span className="text-[10px] text-slate-400 mb-0.5">ایران</span>
          <input
            type="text"
            maxLength={2}
            value={provinceCode}
            onChange={(e) => {
              const val = e.target.value.replace(/[^\d۰-۹]/g, '');
              setProvinceCode(val);
              updatePlate(twoDigits, letter, threeDigits, val);
            }}
            placeholder="۶۶"
            className="w-12 text-center bg-[#131d30] border border-[#2a3c5a] text-white font-bold text-sm py-1 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Live Preview */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>پیش‌نمایش پلاک:</span>
        <IranianPlate plateNumber={`${provinceCode}-${threeDigits}${letter}${twoDigits}`} size="sm" />
      </div>
    </div>
  );
};
