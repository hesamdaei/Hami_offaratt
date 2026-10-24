import React, { FC, useState } from 'react';
import { X, ExternalLink, Radio, Navigation, Copy, Check } from 'lucide-react';
import { OrderItem } from '../utils/ordersData';
import { CargoTrackingCustomerPortal } from './CargoTrackingCustomerPortal';
import { CargoTrackingDriverPortal } from './CargoTrackingDriverPortal';
import { generateCustomerShareUrl, initializeTrackingForOrder } from '../utils/cargoTrackingService';

interface CargoTrackingModalProps {
  order: OrderItem;
  onClose: () => void;
}

export const CargoTrackingModal: FC<CargoTrackingModalProps> = ({ order, onClose }) => {
  const [activeTab, setActiveTab] = useState<'CUSTOMER' | 'DRIVER'>('CUSTOMER');
  const [isCopied, setIsCopied] = useState(false);

  // Ensure tracking data exists for this order
  initializeTrackingForOrder(order);

  const handleCopyLink = () => {
    const url = generateCustomerShareUrl(order.orderNumber);
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleOpenStandalone = () => {
    window.open(`?track=${encodeURIComponent(order.orderNumber)}`, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      dir="rtl"
    >
      <div className="bg-[#0b1329] border border-slate-800 rounded-3xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="bg-[#0f172a] border-b border-slate-800 p-3 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-black text-white">
                    رهگیری سفارش: <span className="font-mono text-cyan-400">{order.orderNumber}</span>
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {order.customerName}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 line-clamp-1">
                  {order.originCity} به {order.destinationCity} • خودرو: {order.requestedVehicleType}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition sm:hidden shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-bold flex-1 sm:flex-initial">
              <button
                onClick={() => setActiveTab('CUSTOMER')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'CUSTOMER'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>نمای مشتری</span>
              </button>
              <button
                onClick={() => setActiveTab('DRIVER')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'DRIVER'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>فرستنده راننده</span>
              </button>
            </div>

            {/* Copy Share Link */}
            <button
              onClick={handleCopyLink}
              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                isCopied
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
              title="کپی لینک اختصاصی مشتری"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Open in full screen tab */}
            <button
              onClick={handleOpenStandalone}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition shrink-0"
              title="باز کردن در تب تمام صفحه جداگانه"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            {/* Desktop Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition hidden sm:inline-flex shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'CUSTOMER' ? (
            <CargoTrackingCustomerPortal
              orderNumber={order.orderNumber}
              isStandalone={false}
              onOpenDriverPortal={() => setActiveTab('DRIVER')}
            />
          ) : (
            <CargoTrackingDriverPortal
              orderNumber={order.orderNumber}
              isStandalone={false}
              onOpenCustomerView={() => setActiveTab('CUSTOMER')}
            />
          )}
        </div>
      </div>
    </div>
  );
};
