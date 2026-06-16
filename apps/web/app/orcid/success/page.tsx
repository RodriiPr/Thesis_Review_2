'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function OrcidSuccessContent() {
  const searchParams = useSearchParams();
  const orcid = searchParams.get('orcid');
  const name = searchParams.get('name');

  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage(
        { type: 'ORCID_CONNECTED', orcid, name },
        window.location.origin,
      );
      window.close();
    }
  }, [orcid, name]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-lg font-medium text-gray-900">ORCID conectado</h1>
        <p className="text-sm text-gray-500 mt-1">{name ?? 'Perfil'} vinculado exitosamente.</p>
        <p className="text-xs text-gray-400 mt-4">Esta ventana se cerrará automáticamente.</p>
      </div>
    </div>
  );
}

export default function OrcidSuccessPage() {
  return (
    <Suspense>
      <OrcidSuccessContent />
    </Suspense>
  );
}
