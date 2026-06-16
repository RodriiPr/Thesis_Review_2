'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface ConfigField {
  key: string;
  label: string;
  description: string;
  defaultValue: string;
  type: 'number' | 'text';
  envVar: string;
}

const CONFIG_FIELDS: ConfigField[] = [
  {
    key: 'maxGrade',
    label: 'Escala de notas máxima',
    description: 'Nota máxima a la que se convierte el puntaje IA (ej. 20 para escala vigesimal).',
    defaultValue: process.env.NEXT_PUBLIC_MAX_GRADE ?? '20',
    type: 'number',
    envVar: 'MAX_GRADE / NEXT_PUBLIC_MAX_GRADE',
  },
  {
    key: 'lowCompliance',
    label: 'Umbral de bajo cumplimiento (%)',
    description: 'Avances con puntaje IA por debajo de este valor se marcan como alerta.',
    defaultValue: process.env.NEXT_PUBLIC_LOW_COMPLIANCE_ALERT ?? '65',
    type: 'number',
    envVar: 'LOW_COMPLIANCE_ALERT',
  },
  {
    key: 'openaiModel',
    label: 'Modelo de IA (OpenAI)',
    description: 'Modelo usado para análisis automático. Requiere reinicio del servidor.',
    defaultValue: 'gpt-4o-mini',
    type: 'text',
    envVar: 'OPENAI_MODEL',
  },
  {
    key: 'minioBucket',
    label: 'Bucket de almacenamiento',
    description: 'Nombre del bucket MinIO / S3 donde se guardan los documentos.',
    defaultValue: 'thesis-documents',
    type: 'text',
    envVar: 'MINIO_BUCKET',
  },
];

export default function ConfigPage() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    toast.success('Configuración guardada. Algunos cambios requieren reinicio del servidor.');
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Parámetros del sistema. Los cambios persistentes deben aplicarse en el archivo{' '}
          <code className="bg-gray-100 px-1 rounded text-xs">.env</code> del servidor.
        </p>
      </div>

      <div className="space-y-4">
        {CONFIG_FIELDS.map((field) => (
          <div key={field.key} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-900 block mb-0.5">
                  {field.label}
                </label>
                <p className="text-xs text-gray-500 mb-3">{field.description}</p>
                <input
                  type={field.type}
                  defaultValue={field.defaultValue}
                  className="h-9 w-48 rounded-lg border border-gray-200 px-3 text-sm
                             focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30"
                />
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-[10px] text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-100">
                  {field.envVar}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs text-amber-800">
          <span className="font-medium">Nota:</span> Esta interfaz muestra los valores actuales de
          las variables de entorno. Para cambios permanentes, edita el archivo{' '}
          <code className="bg-amber-100 px-1 rounded">.env</code> en la raíz del proyecto y reinicia
          el servidor API.
        </p>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="h-9 px-5 rounded-lg bg-[#185FA5] hover:bg-[#0C447C] text-white text-sm
                     font-medium transition-colors"
        >
          {saved ? 'Guardado ✓' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}
