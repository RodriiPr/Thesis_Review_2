'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { GraduationCap, RefreshCw } from 'lucide-react';
import ThesisForm from './components/ThesisForm';
import GenerationProgress from './components/GenerationProgress';
import DownloadButtons from './components/DownloadButtons';
import JuryEditor from './components/JuryEditor';
import DocumentPreview from './components/DocumentPreview';
import { useThesisGenerator } from './hooks/useThesisGenerator';
import type { GenerateThesisDto } from './types/thesis.types';
import type { JuryData } from './components/JuryEditor';

export default function ThesisGeneratorPage() {
  const { generate, loading, status, downloadUrls, error, reset } = useThesisGenerator();
  const [, setJury] = useState<JuryData | null>(null);

  const handleGenerate = async (dto: GenerateThesisDto) => {
    try {
      await generate(dto);
      toast.success('Documento generado correctamente');
    } catch {
      toast.error(error ?? 'Error al generar el documento');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-[#185FA5]" />
            Generador de Proyecto de Tesis
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Genere automáticamente un proyecto de tesis completo con IA
          </p>
        </div>
        {status && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Nuevo
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <ThesisForm onSubmit={handleGenerate} loading={loading} />
          </div>
          <JuryEditor onChange={(j) => setJury(j)} />
          <GenerationProgress status={status} loading={loading} />
          <DownloadButtons downloadUrls={downloadUrls} />
        </div>

        <div className="lg:col-span-3">
          <DocumentPreview downloadUrls={downloadUrls} />
        </div>
      </div>
    </div>
  );
}
