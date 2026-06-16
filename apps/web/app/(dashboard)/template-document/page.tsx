"use client";

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2, Upload } from 'lucide-react';

export default function TemplateDocumentPage() {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    authors: '',
    advisor: '',
    institution: '',
    year: '',
    city: '',
    templateType: 'THESIS',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('Por favor, sube un archivo .docx de plantilla');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append('file', file);
      data.append('title', formData.title);
      data.append('authors', formData.authors);
      data.append('advisor', formData.advisor);
      data.append('institution', formData.institution);
      data.append('year', formData.year);
      data.append('city', formData.city);
      data.append('templateType', formData.templateType);

      const { data: response } = await apiClient.post('/template-document/generate', {
        ...formData,
        authors: formData.authors.split(',').map(a => a.trim()).filter(Boolean),
        file: file, // Note: If using apiClient, we need to handle FormData carefully
      }, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      window.open(response.url, '_blank');
      alert('Documento generado correctamente');
    } catch (error: any) {
      alert('Error al generar el documento: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Generador de Documentos por Plantilla</h1>
          <p className="text-muted-foreground mt-1">Sube tu plantilla .docx y rellena los datos para generar el documento final.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Columna Izquierda: Plantilla */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Upload className="w-5 h-5 text-[#185FA5]" />
            <h2 className="text-lg font-semibold text-gray-800">Plantilla del Documento</h2>
          </div>
          
          <div className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <label className="text-sm font-medium text-gray-700">Archivo .docx</label>
              <input 
                type="file" 
                accept=".docx" 
                onChange={handleFileChange} 
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5]"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Tipo de Plantilla</label>
              <div className="grid grid-cols-1 gap-2">
                {['THESIS_PROJECT', 'THESIS', 'SCIENTIFIC_ARTICLE'].map((type) => (
                  <label key={type} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${formData.templateType === type ? 'border-[#185FA5] bg-blue-50 text-[#185FA5] font-medium' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                    <input 
                      type="radio" 
                      name="templateType" 
                      value={type} 
                      checked={formData.templateType === type}
                      onChange={(e) => setFormData({ ...formData, templateType: e.target.value })}
                      className="w-4 h-4 text-[#185FA5] focus:ring-[#185FA5]"
                    />
                    {type === 'THESIS_PROJECT' ? 'Proyecto de Tesis' : type === 'THESIS' ? 'Tesis' : 'Artículo Científico'}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Datos */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-[#185FA5]" />
            <h2 className="text-lg font-semibold text-gray-800">Información del Documento</h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-gray-700">Título de la Tesis *</label>
              <input 
                value={formData.title} 
                onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5]"
                placeholder="Ej. Estudio de la IA en la educación"
                required 
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-gray-700">Autores (separados por coma) *</label>
              <input 
                value={formData.authors} 
                onChange={(e) => setFormData({ ...formData, authors: e.target.value })} 
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5]"
                placeholder="Juan Pérez, María García"
                required 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-gray-700">Asesor *</label>
                <input 
                  value={formData.advisor} 
                  onChange={(e) => setFormData({ ...formData, advisor: e.target.value })} 
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5]"
                  required 
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-gray-700">Institución *</label>
                <input 
                  value={formData.institution} 
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })} 
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5]"
                  required 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-gray-700">Año *</label>
                <input 
                  value={formData.year} 
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })} 
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5]"
                  required 
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-gray-700">Ciudad *</label>
                <input 
                  value={formData.city} 
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })} 
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30 focus:border-[#185FA5]"
                  required 
                />
              </div>
            </div>
          </div>
          <div className="pt-4">
            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-[#185FA5] hover:bg-[#144d8a] text-white py-6 h-auto text-base font-medium"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generando...</>
              ) : (
                <><Download className="mr-2 h-5 w-5" /> Generar y Descargar Documento</>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
