import React, { useState } from 'react';
import { Phone, PhoneCall, Copy, Check } from 'lucide-react';
import { toFaDigits } from '../utils/jalaali';

export interface VoipPhoneButtonProps {
  phone: string;
  name?: string;
  role?: string;
  variant?: 'chip' | 'icon' | 'table-cell' | 'inline' | 'button';
  className?: string;
  showCopy?: boolean;
  onCall?: (phone: string, name?: string, role?: string) => void;
}

export const triggerVoipCallEvent = (phone: string, name?: string, role?: string) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('hamibar:voip-call', {
        detail: { phone, name: name || 'مخاطب', role: role || '' },
      })
    );
  }
};

export const VoipPhoneButton: React.FC<VoipPhoneButtonProps> = ({
  phone,
  name = '',
  role = '',
  variant = 'chip',
  className = '',
  showCopy = false,
  onCall,
}) => {
  const [copied, setCopied] = useState(false);

  const cleanPhone = (phone || '').trim();
  const isEmpty = !cleanPhone || cleanPhone === '---' || cleanPhone === '-';

  if (isEmpty) {
    return <span className="text-slate-500 font-mono text-xs">---</span>;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCall) {
      onCall(cleanPhone, name, role);
    } else {
      triggerVoipCallEvent(cleanPhone, name, role);
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cleanPhone) return;
    try {
      navigator.clipboard.writeText(cleanPhone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  // 1. Table Cell Variant
  if (variant === 'table-cell') {
    return (
      <div className={`inline-flex items-center gap-1.5 group/vbtn ${className}`}>
        <button
          type="button"
          onClick={handleClick}
          title={`تماس ویپ (VoIP) با ${name || cleanPhone}`}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 transition font-mono font-bold text-xs cursor-pointer shadow-xs"
        >
          <PhoneCall className="w-3 h-3 text-emerald-400 group-hover/vbtn:scale-110 transition-transform animate-pulse" />
          <span className="dir-ltr text-[11px]">{toFaDigits(cleanPhone)}</span>
        </button>
        {showCopy && (
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="کپی شماره"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
        )}
      </div>
    );
  }

  // 2. Icon Only
  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={`تماس تلفنی VoIP با ${name || cleanPhone}`}
        className={`w-7 h-7 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 flex items-center justify-center transition cursor-pointer ${className}`}
      >
        <Phone className="w-3.5 h-3.5" />
      </button>
    );
  }

  // 3. Full Button
  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition cursor-pointer ${className}`}
        title={`برقراری تماس ویپ با ${name || cleanPhone}`}
      >
        <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
        <span>تماس ویپ ({toFaDigits(cleanPhone)})</span>
      </button>
    );
  }

  // 4. Chip (Default)
  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        title={`کلیک برای تماس تلفنی ویپ (VoIP) با ${name || cleanPhone}`}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-300 hover:text-emerald-200 transition-all cursor-pointer font-mono font-bold text-xs group"
      >
        <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
          <Phone className="w-2.5 h-2.5" />
        </span>
        <span className="dir-ltr">{toFaDigits(cleanPhone)}</span>
      </button>
      {showCopy && (
        <button
          type="button"
          onClick={handleCopy}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title="کپی شماره تماس"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
};
