import React from 'react';
import { Unit } from '../types';
import { Bed, Bath, Maximize2, Sofa, CookingPot, Users, Utensils, UserCheck, Waves, Sun } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface UnitCardProps {
  unit: Unit;
  isSelected: boolean;
  onClick: () => void;
}

export default function UnitCard({ unit, isSelected, onClick }: UnitCardProps) {
  const statusTranslations = {
    available: 'متاح',
    reserved: 'محجوز',
    sold: 'مباع'
  };

  const detailLabels: Record<string, string> = {
    bed: 'غرف نوم',
    bath: 'دورات مياه',
    sofa: 'غرف معيشة',
    area: 'المساحة'
  };

  return (
    <div 
      onClick={onClick}
      dir="rtl"
      className={cn(
        "group cursor-pointer p-2 rounded-xl border transition-all duration-300 text-right overflow-hidden relative",
        isSelected 
          ? "bg-white border-black shadow-lg scale-[1.02] z-10" 
          : "bg-neutral-50/50 border-neutral-200 hover:border-neutral-400 hover:bg-white"
      )}
    >
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-sm font-black text-neutral-900 leading-tight group-hover:text-black transition-colors">{unit.name}</h3>
        <div className={cn(
          "px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-tighter shadow-sm",
          unit.status === 'available' ? "bg-emerald-500 text-white" :
          unit.status === 'reserved' ? "bg-amber-400 text-white" : "bg-neutral-400 text-white"
        )}>
          {statusTranslations[unit.status]}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-2 text-neutral-400">
          {[
            unit.details?.bedroomsCount && (
              <div key="bed" className="flex items-center gap-1 group/icon relative">
                <Bed size={10} className="group-hover/icon:text-neutral-900 transition-colors" />
                <span className="text-[10px] font-bold group-hover/icon:text-neutral-900 transition-colors">{unit.details.bedroomsCount}</span>
                <div className="absolute bottom-full mb-1 right-0 bg-black text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover/icon:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                  {detailLabels.bed}
                </div>
              </div>
            ),
            unit.details?.bathroomsCount && (
              <div key="bath" className="flex items-center gap-1 group/icon relative">
                <Bath size={10} className="group-hover/icon:text-neutral-900 transition-colors" />
                <span className="text-[10px] font-bold group-hover/icon:text-neutral-900 transition-colors">{unit.details.bathroomsCount}</span>
                <div className="absolute bottom-full mb-1 right-0 bg-black text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover/icon:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                  {detailLabels.bath}
                </div>
              </div>
            ),
            unit.details?.livingRoom && (
              <div key="sofa" className="flex items-center gap-1 group/icon relative">
                <Sofa size={10} className="group-hover/icon:text-neutral-900 transition-colors" />
                <span className="text-[10px] font-bold group-hover/icon:text-neutral-900 transition-colors">{unit.details.livingRoom}</span>
                <div className="absolute bottom-full mb-1 right-0 bg-black text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover/icon:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                  {detailLabels.sofa}
                </div>
              </div>
            ),
            <div key="area" className="flex items-center gap-1 group/icon relative">
              <Maximize2 size={10} className="group-hover/icon:text-neutral-900 transition-colors" />
              <span className="text-[10px] font-bold group-hover/icon:text-neutral-900 transition-colors">{unit.area}</span>
              <div className="absolute bottom-full mb-1 right-0 bg-black text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover/icon:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                {detailLabels.area}
              </div>
            </div>
          ].filter(Boolean).reduce((acc: any[], curr, idx, arr) => {
            acc.push(curr);
            if (idx < arr.length - 1) {
              acc.push(<span key={`sep-${idx}`} className="text-neutral-200 font-normal text-[8px]">+</span>);
            }
            return acc;
          }, [])}
        </div>
        <div className="text-[13px] font-black text-neutral-900 whitespace-nowrap mr-2">
          {unit.price.toLocaleString()} <span className="text-[10px] text-neutral-400 font-bold">ر.س</span>
        </div>
      </div>
    </div>
  );
}
