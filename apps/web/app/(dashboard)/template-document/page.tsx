"use client";

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2, Upload, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function TemplateDocumentPage() {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    authors: '',
    advisor: '',
    institution: '',
    lineOfResearch: '',
    year: '',
    city: '',
    templateType: 'THESIS',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setDownloadUrl(null);
    setFormData({
      title: '',
      authors: '',
      advisor: '',
      institution: '',
      lineOfResearch: '',
      year: '',
      city: '',
      templateType: 'THESIS',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Por favor, sube un archivo .docx de plantilla');
      return;
    }

    setLoading(true);
    setPreviewUrl(null);
    setDownloadUrl(null);
    
    try {
      const data = new FormData();
      data.append('file', file);
      data.append('title', formData.title);
      const authorsArray = formData.authors.split(',').map((a: string) => a.trim()).filter(Boolean);
      data.append('authors', JSON.stringify(authorsArray));
      data.append('advisor', formData.advisor);
      data.append('institution', formData.institution);
      data.append('lineOfResearch', formData.lineOfResearch);
      data.append('year', formData.year);
      data.append('city', formData.city);
      data.append('templateType', formData.templateType);

      // Timeout set to 5 minutes (300,000 ms) because AI generation takes longer
      const { data: response } = await apiClient.post('/template-document/generate', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300_000,
      });

      const token = sessionStorage.getItem('accessToken');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const encodedId = encodeURIComponent(response.id);
      const preview = `${baseUrl}/api/v1/template-document/${encodedId}/preview${token ? `?token=${token}` : ''}`;
      
      setPreviewUrl(preview);
      setDownloadUrl(response.url);
      
      toast.success('Documento generado con éxito');
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.response?.data?.message || error.message;
      toast.error('Error al generar el documento: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-gray-900 flex items-center gap-2 text-2xl">
            <FileText className="w-6 h-6 text-[#185FA5]" />
            Generador de Documentos por Plantilla
          </h1>
          <p className="text-sm text-gray-500 mt-1">Sube tu plantilla .docx y rellena los datos para que la IA redacte y complete el documento.</p>
        </div>
        {(previewUrl || downloadUrl) && (
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
        {/* Formulario (2 columnas) */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-4">
          {/* Plantilla */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <Upload className="w-4 h-4 text-[#185FA5]" />
              <h2 className="text-sm font-semibold text-gray-800">Plantilla y Tipo</h2>
            </div>
            
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Archivo .docx de Plantilla</label>
                <input 
                  type="file" 
                  accept=".docx" 
                  onChange={handleFileChange} 
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5]"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600">Tipo de Documento</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {['THESIS_PROJECT', 'THESIS', 'SCIENTIFIC_ARTICLE'].map((type) => (
                    <label key={type} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs transition-all ${formData.templateType === type ? 'border-[#185FA5] bg-blue-50/50 text-[#185FA5] font-semibold' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                      <input 
                        type="radio" 
                        name="templateType" 
                        value={type} 
                        checked={formData.templateType === type}
                        onChange={(e) => setFormData({ ...formData, templateType: e.target.value })}
                        className="w-3.5 h-3.5 text-[#185FA5] focus:ring-[#185FA5]"
                      />
                      {type === 'THESIS_PROJECT' ? 'Proyecto de Tesis' : type === 'THESIS' ? 'Tesis' : 'Artículo Científico'}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Información */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <FileText className="w-4 h-4 text-[#185FA5]" />
              <h2 className="text-sm font-semibold text-gray-800">Información del Documento</h2>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              <div className="grid gap-1">
                <label className="text-xs font-semibold text-gray-600">Título del Proyecto *</label>
                <textarea 
                  value={formData.title} 
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5] min-h-[60px]"
                  placeholder="Ej. Arquitectura de datos para la evaluación de riesgo crediticio..."
                  required 
                />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-semibold text-gray-600">Autores (separados por coma) *</label>
                <input 
                  value={formData.authors} 
                  onChange={(e) => setFormData({ ...formData, authors: e.target.value })} 
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5]"
                  placeholder="Montenegro Zee Ricardo, Rodriguez Andre Jhonel"
                  required 
                />
              </div>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div className="grid gap-1">
                  <label className="text-xs font-semibold text-gray-600">Asesor *</label>
                  <input 
                    value={formData.advisor} 
                    onChange={(e) => setFormData({ ...formData, advisor: e.target.value })} 
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5]"
                    placeholder="Dr. Santos Juan"
                    required 
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-xs font-semibold text-gray-600">Universidad / Institución *</label>
                  <input 
                    value={formData.institution} 
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })} 
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5]"
                    placeholder="Universidad Nacional de Trujillo"
                    required 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3.5">
                <div className="grid gap-1">
                  <label className="text-xs font-semibold text-gray-600">Línea de investigación *</label>
                  <input 
                    value={formData.lineOfResearch} 
                    onChange={(e) => setFormData({ ...formData, lineOfResearch: e.target.value })} 
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5]"
                    placeholder="Ej. Desarrollo de software o Sistemas e Informática"
                    required 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div className="grid gap-1">
                  <label className="text-xs font-semibold text-gray-600">Año *</label>
                  <input 
                    value={formData.year} 
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })} 
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5]"
                    placeholder="2026"
                    required 
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-xs font-semibold text-gray-600">Ciudad *</label>
                  <input 
                    value={formData.city} 
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })} 
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5]"
                    placeholder="Trujillo"
                    required 
                  />
                </div>
              </div>
            </div>
            
            <div className="pt-2">
              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-[#185FA5] hover:bg-[#144d8a] text-white py-4 h-auto text-sm font-semibold rounded-lg transition-all"
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando Contenido con IA...</>
                ) : (
                  <><Download className="mr-2 h-4 w-4" /> Generar Documento</>
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* Vista Previa (3 columnas) */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm h-full flex flex-col">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#185FA5]" />
                <span className="text-xs font-semibold text-gray-700">Vista Previa del Documento Completo</span>
              </div>
              {downloadUrl && (
                <a 
                  href={downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#185FA5] text-white text-xs font-medium hover:bg-[#144d8a] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar Word (.docx)
                </a>
              )}
            </div>
            
            <div className="flex-1 min-h-[600px] bg-gray-50/50 flex items-center justify-center">
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[650px] border-none bg-white"
                  title="Vista previa del documento"
                />
              ) : (
                <div className="text-center p-8 flex flex-col items-center max-w-sm">
                  <FileText className="w-12 h-12 text-gray-300 mb-3" />
                  <h3 className="text-sm font-semibold text-gray-700">Sin documento generado</h3>
                  <p className="text-xs text-gray-500 mt-2">
                    Sube una plantilla, llena los campos y haz clic en "Generar Documento". La IA redactará las secciones y te mostrará una vista previa interactiva aquí.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

