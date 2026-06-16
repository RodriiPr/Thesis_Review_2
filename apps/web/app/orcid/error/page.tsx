'use client';

import { useEffect } from 'react';

export default function OrcidErrorPage() {
  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage(
        { type: 'ORCID_ERROR' },
        window.location.origin,
      );
      window.close();
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-lg font-medium text-gray-900">Error de conexión</h1>
        <p className="text-sm text-gray-500 mt-1">No se pudo vincular tu ORCID. Intenta nuevamente.</p>
        <p className="text-xs text-gray-400 mt-4">Esta ventana se cerrará automáticamente.</p>
      </div>
    </div>
  );
}
