import React, { FC, useState, useMemo, useRef, useEffect } from 'react';
import { MapPin, Search, ChevronDown, Check, Sparkles, Navigation } from 'lucide-react';
import { NeighborhoodItem, TEHRAN_NEIGHBORHOODS, ZoneType, TehranZoneSector } from '../../utils/reservationRates';

interface NeighborhoodPickerProps {
  label: string;
  selectedNeighborhood: NeighborhoodItem | null;
  customText: string;
  onSelect: (item: NeighborhoodItem | null, text: string) => void;
  placeholder?: string;
  isOrigin?: boolean;
}

const SECTOR_FILTERS: { id: TehranZoneSector | 'ALL'; label: string; color: string }[] = [
  { id: 'ALL', label: 'همه محله‌ها', color: 'bg-slate-800 text-slate-300' },
  { id: 'NORTH', label: 'شمال تهران', color: 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30' },
  { id: 'WEST', label: 'غرب تهران', color: 'bg-cyan-950/60 text-cyan-400 border-cyan-500/30' },
  { id: 'EAST', label: 'شرق تهران', color: 'bg-indigo-950/60 text-indigo-400 border-indigo-500/30' },
  { id: 'CENTER', label: 'مرکز تهران', color: 'bg-blue-950/60 text-blue-400 border-blue-500/30' },
  { id: 'SOUTH', label: 'جنوب تهران', color: 'bg-amber-950/60 text-amber-400 border-amber-500/30' },
  { id: 'SUBURB', label: 'حومه (کرج/اسلامشهر/شهریار...)', color: 'bg-orange-950/60 text-orange-400 border-orange-500/30' },
  { id: 'SPECIAL_SUBURB', label: 'حومه ویژه (هشتگرد/گیلاوند/دماوند...)', color: 'bg-rose-950/60 text-rose-400 border-rose-500/30' },
];

export const NeighborhoodPicker: FC<NeighborhoodPickerProps> = ({
  label,
  selectedNeighborhood,
  customText,
  onSelect,
  placeholder = 'انتخاب محله یا تایپ آدرس...',
  isOrigin = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSectorFilter, setActiveSectorFilter] = useState<TehranZoneSector | 'ALL'>('ALL');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredList = useMemo(() => {
    return TEHRAN_NEIGHBORHOODS.filter((item) => {
      // Sector filter
      if (activeSectorFilter !== 'ALL' && item.sector !== activeSectorFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.sectorLabel.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [searchQuery, activeSectorFilter]);

  const handlePickItem = (item: NeighborhoodItem) => {
    onSelect(item, item.name);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Auto-detect if matches any known neighborhood
    const match = TEHRAN_NEIGHBORHOODS.find((n) => val.includes(n.name) || n.name.includes(val));
    onSelect(match || null, val);
  };

  const getZoneBadge = (zoneType: ZoneType, sector: TehranZoneSector) => {
    if (zoneType === 'SPECIAL_SUBURB') {
      return <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30 font-bold">حومه ویژه (دورتر)</span>;
    }
    if (zoneType === 'SUBURB') {
      return <span className="text-[10px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded border border-orange-500/30 font-bold">حومه تهران</span>;
    }
    return <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold">داخلی ({sector === 'NORTH' ? 'شمال' : sector === 'EAST' ? 'شرق' : sector === 'WEST' ? 'غرب' : sector === 'SOUTH' ? 'جنوب' : 'مرکز'})</span>;
  };

  return (
    <div ref={wrapperRef} className="relative space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <MapPin className={`w-3.5 h-3.5 ${isOrigin ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span>{label}</span>
        </label>
        {selectedNeighborhood && (
          <div className="flex items-center gap-1">
            {getZoneBadge(selectedNeighborhood.zoneType, selectedNeighborhood.sector)}
          </div>
        )}
      </div>

      {/* Input row */}
      <div className="relative">
        <input
          type="text"
          value={customText}
          onChange={handleCustomChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-[#090f1d] border border-slate-700 rounded-lg pr-9 pl-8 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none transition"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Navigation className={`w-4 h-4 ${isOrigin ? 'text-emerald-400' : 'text-amber-400'}`} />
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180 text-amber-400' : ''}`} />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 top-full mt-1.5 right-0 left-0 bg-[#0d1526] border border-slate-700 rounded-xl shadow-2xl p-3 space-y-2.5 max-h-[360px] overflow-y-auto">
          {/* Search inside list */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی سریع در ۵۰+ محله تهران و حومه..."
              className="w-full bg-[#070b14] border border-slate-700 rounded-lg pr-8 pl-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
              autoFocus
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Quick filter sector chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
            {SECTOR_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveSectorFilter(f.id)}
                className={`px-2 py-1 rounded text-[10px] font-bold border transition whitespace-nowrap ${
                  activeSectorFilter === f.id
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Items list */}
          <div className="space-y-1 max-h-52 overflow-y-auto pr-0.5">
            {filteredList.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-500">
                محله‌ای با این نام یافت نشد. می‌توانید آدرس را به صورت دستی تایپ نمایید.
              </div>
            ) : (
              filteredList.map((item) => {
                const isSelected = selectedNeighborhood?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handlePickItem(item)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition text-right ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{item.name}</span>
                      <span className="text-[10px] text-slate-400">({item.sectorLabel})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {getZoneBadge(item.zoneType, item.sector)}
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
