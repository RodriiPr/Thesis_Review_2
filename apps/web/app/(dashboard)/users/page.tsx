'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { AxiosError, isAxiosError } from 'axios';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2, Plus, Pencil, Trash2, Check, ExternalLink, BookOpen } from 'lucide-react';

const ROLES = ['STUDENT', 'ADVISOR', 'COORDINATOR', 'ADMIN'];
const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Estudiante',
  ADVISOR: 'Docente asesor',
  COORDINATOR: 'Coordinador',
  ADMIN: 'Administrador',
};
const ROLE_COLORS: Record<string, string> = {
  STUDENT: 'bg-gray-100 text-gray-700',
  ADVISOR: 'bg-blue-50 text-blue-700',
  COORDINATOR: 'bg-purple-50 text-purple-700',
  ADMIN: 'bg-red-50 text-red-700',
};

function normalizeOrcidInput(value: string): string {
  const cleaned = value
    .trim()
    .replace(/^https?:\/\/orcid\.org\//i, '')
    .replace(/\s+/g, '')
    .toUpperCase();

  if (/^\d{15}[\dX]$/.test(cleaned)) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}`;
  }

  return cleaned;
}

function isValidOrcid(orcid: string): boolean {
  const compact = orcid.replace(/-/g, '').toUpperCase();
  if (!/^\d{15}[\dX]$/.test(compact)) return false;

  let total = 0;
  for (let i = 0; i < 15; i++) {
    total = (total + Number(compact[i])) * 2;
  }
  const remainder = total % 11;
  const result = (12 - remainder) % 11;
  const checkDigit = result === 10 ? 'X' : String(result);
  return compact[15] === checkDigit;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  orcid?: string | null;
  program?: { name: string } | null;
  createdAt: string;
  _count: { advances: number; reviews: number };
}

interface Program {
  id: string;
  name: string;
}

function UserForm({
  onSave,
  onCancel,
  programs,
}: {
  onSave: (data: { name: string; email: string; password: string; role: string; programId?: string }) => void;
  onCancel: () => void;
  programs: Program[];
}) {
  const [form, setForm] = useState({ name: '', email: '', password: 'ThesisReview2025!', role: 'ADVISOR', programId: '' });

  return (
    <div className="rounded-xl border border-[#185FA5]/20 bg-blue-50/30 p-5 mb-4">
      <h3 className="text-sm font-medium text-gray-900 mb-4">Nuevo usuario</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-600 block mb-1">Nombre completo</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm"
            placeholder="Apellidos, Nombre"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 block mb-1">Correo institucional</label>
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm"
            placeholder="usuario@unitru.edu.pe"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 block mb-1">Contraseña inicial</label>
          <input
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600 block mb-1">Rol</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-600 block mb-1">Programa académico (opcional)</label>
          <select
            value={form.programId}
            onChange={(e) => setForm({ ...form, programId: e.target.value })}
            className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm"
          >
            <option value="">Sin programa</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={() => onSave({ ...form, programId: form.programId || undefined })}
          disabled={!form.name || !form.email || !form.password}
          className="h-8 px-4 rounded-lg bg-[#185FA5] hover:bg-[#0C447C] text-white text-xs
                     font-medium disabled:opacity-50 flex items-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" />
          Crear usuario
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-8 px-3 rounded-lg border border-gray-200 text-gray-600 text-xs hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filterRole, setFilterRole] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editOrcid, setEditOrcid] = useState('');
  const [orcidConnected, setOrcidConnected] = useState(false);
  const [orcidPublications, setOrcidPublications] = useState<number>(0);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users', filterRole],
    queryFn: () =>
      apiClient.get('/users', { params: filterRole ? { role: filterRole } : {} }).then((r) => r.data),
  });

  const { data: programs = [] } = useQuery<Program[]>({
    queryKey: ['programs'],
    queryFn: () => apiClient.get('/programs').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof apiClient.post>[1]) => apiClient.post('/users', data),
    onSuccess: () => {
      toast.success('Usuario creado');
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: Error | AxiosError) => {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message
        : err.message;
      toast.error(message ?? 'Error al crear usuario');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, role, orcidManual }: { id: string; role: string; orcidManual: string | null }) =>
      apiClient.patch(`/users/${id}`, { role, orcidManual }),
    onSuccess: () => {
      toast.success('Usuario actualizado');
      setEditingUser(null);
      setEditOrcid('');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: Error | AxiosError) => {
      const message = isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message
        : err.message;
      toast.error(message ?? 'No se pudo actualizar el usuario');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/users/${id}`),
    onSuccess: () => {
      toast.success('Usuario eliminado');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('No se puede eliminar este usuario'),
  });

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'ORCID_CONNECTED') {
        toast.success('ORCID vinculado exitosamente');
        qc.invalidateQueries({ queryKey: ['users'] });
        checkOrcidStatus();
      }
      if (e.data?.type === 'ORCID_ERROR') {
        toast.error('No se pudo vincular ORCID');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkOrcidStatus = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/orcid/profile');
      if (data.connected) {
        setOrcidConnected(true);
        setOrcidPublications(data.profile.publications?.length ?? 0);
      } else {
        setOrcidConnected(false);
        setOrcidPublications(0);
      }
    } catch {
      setOrcidConnected(false);
      setOrcidPublications(0);
    }
  }, []);

  const handleOrcidConnect = async () => {
    try {
      const { data } = await apiClient.get('/orcid/connect');
      const w = window.open(data.url, 'orcid-connect', 'width=800,height=700');
      if (!w) toast.error('Permite ventanas emergentes para conectar ORCID');
    } catch {
      toast.error('Error al iniciar conexion ORCID');
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditOrcid(user.orcid ?? '');
    checkOrcidStatus();
  };

  const saveUserEdition = () => {
    if (!editingUser) return;

    const normalizedOrcid = normalizeOrcidInput(editOrcid);
    if (normalizedOrcid && !isValidOrcid(normalizedOrcid)) {
      toast.error('El codigo ORCID no es valido');
      return;
    }

    updateMutation.mutate({
      id: editingUser.id,
      role: editRole,
      orcidManual: normalizedOrcid || null,
    });
  };

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestión de cuentas del sistema
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="h-9 px-4 rounded-lg bg-[#185FA5] hover:bg-[#0C447C] text-white text-sm
                     font-medium flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Nuevo usuario
        </button>
      </div>

      {showForm && (
        <UserForm
          programs={programs}
          onSave={(data) => createMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingUser && (
        <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <h3 className="text-sm font-medium text-gray-900">Editar usuario</h3>
            <p className="text-xs text-gray-500 mt-1">Puedes cambiar el rol y validar ORCID manualmente.</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Rol</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-600 block mb-1">ORCID</label>
                <div className="flex gap-2">
                  <input
                    value={editOrcid}
                    onChange={(e) => setEditOrcid(e.target.value)}
                    className="flex-1 h-9 rounded-lg border border-gray-200 px-3 text-sm"
                    placeholder="0000-0000-0000-0000"
                  />
                  <button
                    type="button"
                    onClick={handleOrcidConnect}
                    className="h-9 px-3 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Conectar
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Ingresa manualmente o usa &quot;Conectar&quot; para OAuth.
                </p>
                {orcidConnected && (
                  <p className="text-[11px] text-green-600 mt-1 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    ORCID vinculado · {orcidPublications} publicaciones
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingUser(null);
                  setEditOrcid('');
                }}
                className="h-8 px-3 rounded-lg border border-gray-200 text-gray-600 text-xs hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveUserEdition}
                disabled={updateMutation.isPending}
                className="h-8 px-4 rounded-lg bg-[#185FA5] hover:bg-[#0C447C] text-white text-xs font-medium disabled:opacity-60"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setFilterRole('')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            filterRole === '' ? 'bg-[#185FA5] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
          )}
        >
          Todos ({users.length})
        </button>
        {ROLES.map((r) => {
          const count = users.filter((u) => u.role === r).length;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setFilterRole(r === filterRole ? '' : r)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filterRole === r ? 'bg-[#185FA5] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
              )}
            >
              {ROLE_LABELS[r]} ({count})
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Nombre</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Correo</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Rol</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">ORCID</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Programa</th>
                <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-[11px] text-gray-400">
                      {user._count.advances} avances · {user._count.reviews} revisiones
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', ROLE_COLORS[user.role])}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {user.orcid ? (
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`https://orcid.org/${user.orcid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#185FA5] hover:underline"
                        >
                          {user.orcid}
                        </a>
                        <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                          OAuth
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">No Registrado</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {user.program?.name ?? '—'}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditDialog(user)}
                        className="text-gray-400 hover:text-[#185FA5] transition-colors"
                        title="Cambiar rol y validar ORCID"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`¿Eliminar a ${user.name}?`)) deleteMutation.mutate(user.id);
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
