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
        {/* The Card Layout - Modern Credit Card Size (85.6mm x 54mm) */}
        <div 
          className="w-[340px] h-[215px] bg-zinc-950 text-white rounded-[16px] overflow-hidden shadow-2xl flex flex-col relative card border border-zinc-800"
          style={{ 
            fontFamily: "'Inter', sans-serif",
            backgroundImage: `radial-gradient(circle at 0% 0%, ${settings.primaryColor}15 0%, transparent 50%), radial-gradient(circle at 100% 100%, ${settings.secondaryColor}15 0%, transparent 50%)`
          }}
        >
          {/* Header / Top Bar */}
          <div className="h-12 px-4 flex items-center justify-between border-b border-white/5 bg-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              {settings?.schoolCrest ? (
                <img src={settings.schoolCrest} className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-6 h-6 bg-theme-primary rounded-full flex items-center justify-center text-black font-black text-[10px]">P</div>
              )}
              <div className="leading-none">
                <h3 className="text-[10px] font-black uppercase tracking-tighter">Piruá E.C.</h3>
                <p className="text-[6px] text-zinc-500 uppercase font-bold">Futebol de Base</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[6px] text-zinc-500 uppercase font-bold">Matrícula</p>
              <p className="text-[10px] font-mono font-bold text-theme-primary">#{athlete.id.slice(-6).toUpperCase()}</p>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-4 flex gap-4">
            {/* Photo Section */}
            <div className="relative group">
              <div className="w-[85px] h-[105px] bg-zinc-900 rounded-xl border-2 border-theme-primary/30 overflow-hidden shadow-lg relative z-10">
                {athlete.photo ? (
                  <img src={athlete.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700 bg-zinc-900">
                    <UserCircle size={40} strokeWidth={1} />
                  </div>
                )}
              </div>
              {/* Decorative elements behind photo */}
              <div className="absolute -inset-1 bg-theme-primary/20 blur-md rounded-xl -z-0"></div>
            </div>

            {/* Info Section */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div className="space-y-0.5">
                <h4 className="text-[13px] font-black uppercase leading-tight truncate text-white tracking-tight">
                  {athlete.name.split(' ')[0]} <span className="text-theme-primary">{athlete.name.split(' ').slice(1).join(' ')}</span>
                </h4>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                  <div>
                    <p className="text-[5px] text-zinc-500 uppercase font-black">Nascimento</p>
                    <p className="text-[8px] font-bold">{athlete.birth_date ? new Date(athlete.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') : '--'}</p>
                  </div>
                  <div>
                    <p className="text-[5px] text-zinc-500 uppercase font-black">RG/CPF</p>
                    <p className="text-[8px] font-bold truncate">{athlete.doc || '--'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[5px] text-zinc-500 uppercase font-black">Endereço</p>
                    <p className="text-[7px] font-medium text-zinc-300 truncate leading-tight">
                      {athlete.street}, {athlete.number} - {athlete.neighborhood}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-0.5 bg-white/5 p-1.5 rounded-lg border border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[5px] text-zinc-500 uppercase font-black">Responsável</p>
                    <p className="text-[8px] font-bold text-zinc-200 uppercase truncate max-w-[100px]">{athlete.guardian_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[5px] text-zinc-500 uppercase font-black">Telefone</p>
                    <p className="text-[8px] font-bold text-theme-primary">{athlete.guardian_phone}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer / Bottom Bar */}
          <div className="h-10 px-4 flex items-center justify-between bg-zinc-900/50 border-t border-white/5">
            <div className="flex items-center gap-2">
              <div className="bg-white p-0.5 rounded-[4px]">
                <QRCodeSVG value={`PIRUA-ATHLETE-${athlete.id}`} size={24} />
              </div>
              <p className="text-[6px] text-zinc-500 font-mono leading-none">VALIDA EM TODO<br/>TERRITÓRIO NACIONAL</p>
            </div>
            <div className="text-right">
              <div className="inline-block px-2 py-0.5 bg-theme-primary/10 border border-theme-primary/20 rounded-full">
                <p className="text-[7px] font-black text-theme-primary uppercase tracking-widest">Atleta Oficial</p>
              </div>
            </div>
          </div>

          {/* Security Hologram Effect (Decorative) */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden rounded-[16px]">
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-transparent via-white/5 to-transparent rotate-45 transform translate-x-[-20%] translate-y-[-20%]"></div>
          </div>
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
