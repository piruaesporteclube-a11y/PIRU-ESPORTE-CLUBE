import React, { useState, useEffect } from 'react';
import { Athlete, Settings } from '../types';
import { api } from '../api';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download, UserCircle, MapPin, Phone, Hash } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface MembershipCardProps {
  athlete: Athlete;
}

export default function MembershipCard({ athlete }: MembershipCardProps) {
  const { settings } = useTheme();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <h2 className="text-2xl font-bold text-white">Carteirinha do Atleta</h2>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-theme-primary hover:opacity-90 text-black font-bold rounded-xl transition-colors"
        >
          <Printer size={18} />
          Imprimir Carteirinha
        </button>
      </div>

      <div className="flex justify-center p-4">
        {/* The Card Layout */}
        <div className="w-[400px] h-[250px] bg-white text-black rounded-2xl overflow-hidden shadow-2xl flex border-2 border-black relative card">
          {/* Left Side - School Identity */}
          <div className="w-1/3 flex flex-col items-center justify-center p-4 text-white text-center" style={{ backgroundColor: settings.secondaryColor }}>
            {settings?.schoolCrest ? (
              <div className="w-[60px] h-[80px] mb-2 flex items-center justify-center bg-white/10 rounded-lg overflow-hidden">
                <img src={settings.schoolCrest} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="w-[60px] h-[80px] rounded-lg flex items-center justify-center text-black font-black text-2xl mb-2" style={{ backgroundColor: settings.primaryColor }}>P</div>
            )}
            <h3 className="text-xs font-black uppercase leading-tight">Piruá Esporte Clube</h3>
            <p className="text-[8px] mt-2 opacity-70">Departamento de Futebol de Base</p>
          </div>

          {/* Right Side - Athlete Info */}
          <div className="flex-1 p-4 flex flex-col overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-[8px] font-bold text-zinc-500 uppercase">Nome do Atleta</h4>
                <p className="text-[11px] font-black uppercase leading-tight truncate">{athlete.name}</p>
              </div>
              <div className="w-[60px] h-[80px] bg-zinc-100 rounded-lg border border-zinc-200 overflow-hidden ml-2 flex-shrink-0">
                {athlete.photo ? (
                  <img src={athlete.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-300">
                    <UserCircle size={32} />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-2">
              <div>
                <h4 className="text-[7px] font-bold text-zinc-500 uppercase">CPF/RG Atleta</h4>
                <p className="text-[9px] font-bold">{athlete.doc || '--'}</p>
              </div>
              <div>
                <h4 className="text-[7px] font-bold text-zinc-500 uppercase">Data de Nasc.</h4>
                <p className="text-[9px] font-bold">{athlete.birth_date ? new Date(athlete.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') : '--'}</p>
              </div>
              <div>
                <h4 className="text-[7px] font-bold text-zinc-500 uppercase">Matrícula</h4>
                <p className="text-[9px] font-bold">#{athlete.id.slice(-6).toUpperCase()}</p>
              </div>
              <div>
                <h4 className="text-[7px] font-bold text-zinc-500 uppercase">Camisa</h4>
                <p className="text-[9px] font-bold">#{athlete.jersey_number || '--'}</p>
              </div>
            </div>

            <div className="mb-2">
              <h4 className="text-[7px] font-bold text-zinc-500 uppercase">Responsável Legal</h4>
              <p className="text-[9px] font-bold uppercase truncate">{athlete.guardian_name}</p>
              <p className="text-[8px] text-zinc-600">{athlete.guardian_phone}</p>
            </div>

            <div className="mt-auto flex justify-between items-end">
              <div className="text-[7px] text-zinc-500 leading-tight max-w-[140px]">
                <h4 className="text-[6px] font-bold text-zinc-400 uppercase mb-0.5">Endereço</h4>
                <p className="truncate">{athlete.street}, {athlete.number}</p>
                <p className="truncate">{athlete.neighborhood}</p>
                <p className="truncate">{athlete.city}/{athlete.uf}</p>
              </div>
              <div className="bg-white p-1 rounded border border-zinc-200 ml-2">
                <QRCodeSVG value={`PIRUA-ATHLETE-${athlete.id}`} size={36} />
              </div>
            </div>
          </div>

          {/* Decorative stripe */}
          <div className="absolute top-0 right-0 w-1 h-full" style={{ backgroundColor: settings.primaryColor }}></div>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 text-zinc-400 text-sm no-print">
        <h3 className="text-white font-bold mb-2 flex items-center gap-2">
          <AlertCircle size={18} className="text-theme-primary" />
          Dica de Impressão
        </h3>
        <p>Para melhores resultados, utilize papel fotográfico ou PVC. O QR Code gerado é único para cada atleta e será utilizado para o registro de presença automático via aplicativo.</p>
      </div>
    </div>
  );
}

function AlertCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
