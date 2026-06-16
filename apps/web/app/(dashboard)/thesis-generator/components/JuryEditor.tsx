'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';

export interface JuryData {
  presidente: string;
  secretario: string;
  vocal: string;
  suplente: string;
}

interface Props {
  onChange: (jury: JuryData) => void;
}

export default function JuryEditor({ onChange }: Props) {
  const [jury, setJury] = useState<JuryData>({
    presidente: '',
    secretario: '',
    vocal: '',
    suplente: '',
  });

  const update = (field: keyof JuryData, value: string) => {
    const next = { ...jury, [field]: value };
    setJury(next);
    onChange(next);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <Users className="w-4 h-4 text-[#185FA5]" />
        Jurado Dictaminador
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {(['presidente', 'secretario', 'vocal', 'suplente'] as const).map((role) => (
          <div key={role}>
            <label className="block text-xs font-medium text-gray-500 mb-1 capitalize">{role}</label>
            <input
              value={jury[role]}
              onChange={(e) => update(role, e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5]"
              placeholder={`Nombre del ${role}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
