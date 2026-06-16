'use client';

import { FileText } from 'lucide-react';

interface Props {
  downloadUrls: Record<string, string>;
}

export default function DocumentPreview({ downloadUrls }: Props) {
  if (!downloadUrls.pdf && !downloadUrls.docx) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center justify-center text-center">
        <FileText className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">Genere un documento para ver la vista previa</p>
      </div>
    );
  }

  if (!downloadUrls.pdf) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center justify-center text-center">
        <FileText className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">Vista previa disponible solo para PDF</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <FileText className="w-4 h-4 text-[#185FA5]" />
        <span className="text-sm font-medium text-gray-700">Vista Previa</span>
      </div>
      <iframe
        src={`${downloadUrls.pdf}#toolbar=1`}
        className="w-full h-[600px]"
        title="Vista previa del documento"
      />
    </div>
  );
}
