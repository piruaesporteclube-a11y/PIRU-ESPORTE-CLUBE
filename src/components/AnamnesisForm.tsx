import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Athlete, Anamnesis } from '../types';
import { Save, ClipboardList, AlertCircle, X } from 'lucide-react';
import { cn } from '../utils';
import { toast } from 'sonner';

interface AnamnesisFormProps {
  athlete: Athlete;
  onSave: () => void;
}

export default function AnamnesisForm({ athlete, onSave }: AnamnesisFormProps) {
  const [formData, setFormData] = useState<Partial<Anamnesis>>({
    athlete_id: athlete.id,
    sleep_time: '',
    wake_up_difficulty: '',
    fractures: '',
    medical_treatment: '',
    controlled_medication: '',
    other_exercises: '',
    respiratory_problems: '',
    cardiac_problems: '',
    allergies: '',
    hypertension: '',
    hypotension: '',
    epilepsy: '',
    diabetes: '',
    food_restriction: '',
    medication_restriction: '',
    pathologies: '[]'
  });

  useEffect(() => {
    api.getAnamnesis(athlete.id).then(data => {
      if (data.athlete_id) setFormData(data);
    }).catch(() => {
      // If not found, keep default empty form
    });
  }, [athlete.id]);

  const pathologiesList = [
    { id: 'TDAH', label: 'TDAH (Transtorno do Déficit de Atenção e Hiperatividade)' },
    { id: 'TEA', label: 'TEA (Autismo)' },
    { id: 'TOD', label: 'TOD (Transtorno Opositor e Desafiador)' },
    { id: 'DI', label: 'DI (Déficit Intelectual)' },
    { id: 'ANSIEDADE', label: 'Ansiedade' },
  ];

  const handlePathologyToggle = (pathId: string) => {
    const current = JSON.parse(formData.pathologies || '[]');
    const next = current.includes(pathId) 
      ? current.filter((id: string) => id !== pathId)
      : [...current, pathId];
    setFormData({ ...formData, pathologies: JSON.stringify(next) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveAnamnesis(formData);
      toast.success("Anamnese salva com sucesso!");
      onSave();
    } catch (err: any) {
      toast.error(`Erro ao salvar anamnese: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onSave}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all group no-print"
          >
            <X size={20} className="group-hover:rotate-90 transition-transform" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">Ficha de Anamnese</h2>
            <p className="text-zinc-400 text-sm">Histórico de saúde do atleta: <span className="text-theme-primary font-bold uppercase">{athlete.name}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button 
            onClick={() => window.print()}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
          >
            Imprimir Ficha
          </button>
          <button 
            onClick={onSave}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all group"
          >
            <X size={18} className="group-hover:rotate-90 transition-transform" />
            <span className="font-bold uppercase text-xs tracking-widest">Voltar</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-black border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Habits */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-theme-primary uppercase tracking-widest flex items-center gap-2">
              <ClipboardList size={18} />
              Hábitos e Rotina
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Qual horário o atleta dorme?</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                  value={formData.sleep_time}
                  onChange={e => setFormData({...formData, sleep_time: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Tem dificuldade de acordar cedo?</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                  value={formData.wake_up_difficulty}
                  onChange={e => setFormData({...formData, wake_up_difficulty: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Pratica outro exercício físico?</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                  value={formData.other_exercises}
                  onChange={e => setFormData({...formData, other_exercises: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Medical History */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-theme-primary uppercase tracking-widest flex items-center gap-2">
              <AlertCircle size={18} />
              Histórico Médico
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Já fraturou algum membro?</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                  value={formData.fractures}
                  onChange={e => setFormData({...formData, fractures: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Faz algum tratamento médico?</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                  value={formData.medical_treatment}
                  onChange={e => setFormData({...formData, medical_treatment: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Faz uso de medicação controlada?</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                  value={formData.controlled_medication}
                  onChange={e => setFormData({...formData, controlled_medication: e.target.value})}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Health Conditions Grid */}
        <div className="space-y-4 pt-8 border-t border-zinc-800">
          <h3 className="text-sm font-bold text-theme-primary uppercase tracking-widest">Condições de Saúde</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { label: 'Problemas Respiratórios', key: 'respiratory_problems' },
              { label: 'Problemas Cardíacos', key: 'cardiac_problems' },
              { label: 'Alergias', key: 'allergies' },
              { label: 'Hipertensão', key: 'hypertension' },
              { label: 'Hipotensão', key: 'hypotension' },
              { label: 'Epilepsia', key: 'epilepsy' },
              { label: 'Diabetes', key: 'diabetes' },
              { label: 'Restrição Alimentar', key: 'food_restriction' },
              { label: 'Restrição Medicamentos', key: 'medication_restriction' },
            ].map((item) => (
              <div key={item.key}>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">{item.label}</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                  value={(formData as any)[item.key]}
                  onChange={e => setFormData({...formData, [item.key]: e.target.value})}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Pathologies */}
        <div className="space-y-4 pt-8 border-t border-zinc-800">
          <h3 className="text-sm font-bold text-theme-primary uppercase tracking-widest">Patologias (Doenças)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pathologiesList.map((path) => {
              const isActive = JSON.parse(formData.pathologies || '[]').includes(path.id);
              return (
                <button
                  key={path.id}
                  type="button"
                  onClick={() => handlePathologyToggle(path.id)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-2xl border transition-all text-left",
                    isActive 
                      ? "bg-theme-primary/10 border-theme-primary text-theme-primary" 
                      : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded flex items-center justify-center border",
                    isActive ? "bg-theme-primary border-theme-primary" : "border-zinc-600"
                  )}>
                    {isActive && <Save size={12} className="text-black" />}
                  </div>
                  <span className="text-xs font-bold uppercase">{path.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-8 border-t border-zinc-800 no-print">
          <button 
            type="submit"
            className="px-8 py-4 bg-theme-primary hover:opacity-90 text-black rounded-2xl font-black transition-all shadow-lg shadow-theme-primary/20 flex items-center gap-2"
          >
            <Save size={20} />
            Salvar Ficha de Anamnese
          </button>
        </div>
      </form>

      {/* Print Version */}
      <div className="hidden print-only bg-white text-black p-8">
        <h1 className="text-2xl font-black uppercase mb-2">Piruá Esporte Clube</h1>
        <h2 className="text-xl font-bold mb-6 border-b-2 border-black pb-2">Ficha de Anamnese - Atleta: {athlete.name}</h2>
        
        <div className="space-y-4 text-sm">
          <p><strong>Horário que dorme:</strong> {formData.sleep_time}</p>
          <p><strong>Dificuldade de acordar:</strong> {formData.wake_up_difficulty}</p>
          <p><strong>Fraturas:</strong> {formData.fractures}</p>
          <p><strong>Tratamento Médico:</strong> {formData.medical_treatment}</p>
          <p><strong>Medicação Controlada:</strong> {formData.controlled_medication}</p>
          <p><strong>Outros Exercícios:</strong> {formData.other_exercises}</p>
          <p><strong>Problemas Respiratórios:</strong> {formData.respiratory_problems}</p>
          <p><strong>Problemas Cardíacos:</strong> {formData.cardiac_problems}</p>
          <p><strong>Alergias:</strong> {formData.allergies}</p>
          <p><strong>Hipertensão:</strong> {formData.hypertension}</p>
          <p><strong>Hipotensão:</strong> {formData.hypotension}</p>
          <p><strong>Epilepsia:</strong> {formData.epilepsy}</p>
          <p><strong>Diabetes:</strong> {formData.diabetes}</p>
          <p><strong>Restrição Alimentar:</strong> {formData.food_restriction}</p>
          <p><strong>Restrição Medicamentos:</strong> {formData.medication_restriction}</p>
          <p><strong>Patologias:</strong> {JSON.parse(formData.pathologies || '[]').join(', ')}</p>
        </div>

        <div className="mt-20 flex justify-between">
          <div className="w-64 border-t border-black text-center pt-2 text-xs">Assinatura do Responsável</div>
          <div className="w-64 border-t border-black text-center pt-2 text-xs">Data: ____/____/_______</div>
        </div>
      </div>
    </div>
  );
}
