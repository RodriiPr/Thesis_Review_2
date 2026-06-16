'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  FileUp, 
  Trash2, 
  Layout, 
  Loader2, 
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

export default function SchemesPage() {
  const [schemes, setSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [newSchema, setNewSchema] = useState({
    name: '',
    type: 'THESIS_PROJECT',
    structure: null as any
  });

  useEffect(() => {
    fetchSchemes();
  }, []);

  const fetchSchemes = async () => {
    try {
      const { data } = await apiClient.get('/schemes');
      setSchemes(data);
    } catch (error) {
      console.error('Error fetching schemes:', error);
      toast.error('Error al cargar esquemas');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await apiClient.post('/schemes/extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNewSchema(prev => ({ ...prev, structure: data }));
      toast.success('Estructura extraída con éxito');
    } catch (error) {
      toast.error('Error al extraer estructura');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveSchema = async () => {
    if (!newSchema.name || !newSchema.structure) {
      toast.error('Nombre y estructura son requeridos');
      return;
    }

    try {
      await apiClient.post('/schemes', newSchema);
      toast.success('Esquema guardado');
      setNewSchema({ name: '', type: 'THESIS_PROJECT', structure: null });
      fetchSchemes();
    } catch (error) {
      toast.error('Error al guardar esquema');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este esquema?')) return;
    try {
      await apiClient.delete(`/schemes/${id}`);
      toast.success('Esquema eliminado');
      fetchSchemes();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto text-slate-900">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Esquemas de Documentos</h1>
          <p className="text-slate-500">Gestiona las estructuras para la generación de tesis y artículos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-semibold">Nuevo Esquema</h2>
            <p className="text-sm text-slate-500">Sube un documento para extraer su estructura usando IA.</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre del Esquema</label>
              <input 
                className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Ej: Proyecto Tesis - Ingeniería" 
                value={newSchema.name}
                onChange={e => setNewSchema(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Documento</label>
              <select 
                className="w-full p-2 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
                value={newSchema.type}
                onChange={e => setNewSchema(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="THESIS_PROJECT">Proyecto de Tesis</option>
                <option value="SCIENTIFIC_ARTICLE">Artículo Científico</option>
                <option value="THESIS">Tesis</option>
                <option value="THESIS_REPORT">Informe de Tesis</option>
              </select>
            </div>

            <div className="pt-4">
              <label className="block mb-2 text-sm font-medium">Subir Ejemplo (PDF/DOCX)</label>
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  className="w-full relative overflow-hidden"
                  disabled={isExtracting}
                  type="button"
                >
                  {isExtracting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileUp className="mr-2 h-4 w-4" />
                  )}
                  {isExtracting ? 'Analizando Estructura...' : 'Seleccionar Archivo'}
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    accept=".pdf,.docx"
                    onChange={handleFileUpload}
                  />
                </Button>
              </div>
            </div>

            {newSchema.structure && (
              <div className="mt-6 p-4 border rounded-lg bg-slate-50">
                <div className="flex items-center gap-2 mb-4 text-green-600 font-medium">
                  <CheckCircle2 className="h-5 w-5" />
                  Estructura Detectada
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {newSchema.structure.chapters?.map((ch: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <ChevronRight className="h-3 w-3 text-slate-400" />
                      <span className="font-semibold">{ch.name}</span>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-4" onClick={handleSaveSchema}>
                  Guardar Esquema
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Mis Esquemas</h3>
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : schemes.length === 0 ? (
            <div className="text-slate-500 text-center p-12 border rounded-xl border-dashed border-slate-300">
              No tienes esquemas guardados o la API no respondió correctamente.
            </div>
          ) : (
            schemes.map((schema) => (
              <div key={schema.id} className="relative group bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <Layout className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <h4 className="font-bold">{schema.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-full">
                          {schema.type}
                        </span>
                        <span>•</span>
                        <span>{schema.structure?.chapters?.length || 0} capítulos</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(schema.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

