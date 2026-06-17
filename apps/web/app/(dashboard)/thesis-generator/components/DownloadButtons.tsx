'use client';

import { FileText, FileDown, Download } from 'lucide-react';

interface Props {
  downloadUrls: Record<string, string>;
}

export default function DownloadButtons({ downloadUrls }: Props) {
  if (Object.keys(downloadUrls).length === 0) return null;

  const handleDownload = (url: string) => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;
    const downloadUrl = token ? `${url}?token=${token}` : url;
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <Download className="w-4 h-4 text-[#185FA5]" />
        Descargar Documento
      </h3>
      <div className="flex flex-wrap gap-3">
        {downloadUrls.pdf && (
          <button
            onClick={() => handleDownload(downloadUrls.pdf)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#185FA5] text-white text-sm font-medium hover:bg-[#144d8a] transition-colors"
          >
            <FileText className="w-4 h-4" />
            Descargar PDF
          </button>
        )}
        {downloadUrls.docx && (
          <button
            onClick={() => handleDownload(downloadUrls.docx)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#185FA5] text-[#185FA5] text-sm font-medium hover:bg-[#185FA5]/5 transition-colors"
          >
            <FileDown className="w-4 h-4" />
            Descargar Word
          </button>
        )}
      </div>
    </div>
  );
}
