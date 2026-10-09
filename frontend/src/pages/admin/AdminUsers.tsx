import { useEffect, useState, type FormEvent } from 'react';
import { adminApi } from '../../api/admin';
import { getErrorMessage } from '../../api/client';
import type { AdminRole, AdminUser } from '../../api/types';
import SelectField from '../../components/form/SelectField';
import TextField from '../../components/form/TextField';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS, ROLES } from '../../utils/constants';
import { formatDateTime } from '../../utils/format';

const roleOptions = ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

export default function AdminUsers() {
  const { admin } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'VIEWER' as AdminRole });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.listUsers().then(setUsers).catch((e) => setError(getErrorMessage(e)));
  }, []);

  const replace = (u: AdminUser) => setUsers((list) => list.map((x) => (x.id === u.id ? u : x)));

  async function create(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const user = await adminApi.createUser(form);
      setUsers((list) => [...list, user]);
      setForm({ name: '', email: '', password: '', role: 'VIEWER' });
    } catch (err) {
      setCreateError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function update(u: AdminUser, patch: Parameters<typeof adminApi.updateUser>[1]) {
    setError(null);
    try {
      replace(await adminApi.updateUser(u.id, patch));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function resetPassword(u: AdminUser) {
    const password = window.prompt(`New password for ${u.email} (min 8 characters):`);
    if (!password) return;
    await update(u, { password });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Admin users</h1>
      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Email</th>
                <th className="table-th">Role</th>
                <th className="table-th">Status</th>
                <th className="table-th">Last login</th>
                <th className="table-th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const self = u.id === admin?.id;
                return (
                  <tr key={u.id}>
                    <td className="table-td font-medium">{u.name}{self && <span className="ml-1 text-xs text-slate-400">(you)</span>}</td>
                    <td className="table-td">{u.email}</td>
                    <td className="table-td">
                      <select className="input !py-1" value={u.role} disabled={self} onChange={(e) => update(u, { role: e.target.value as AdminRole })}>
                        {roleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </td>
                    <td className="table-td">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-td">{formatDateTime(u.lastLoginAt)}</td>
                    <td className="table-td space-x-2 text-right">
                      <button className="btn-secondary btn-sm" onClick={() => resetPassword(u)}>Reset password</button>
                      {!self && (
                        <button className="btn-secondary btn-sm" onClick={() => update(u, { isActive: !u.isActive })}>
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <form onSubmit={create} className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Create admin</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required />
          <TextField label="Email" type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} required />
          <TextField label="Password" type="password" value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} hint="At least 8 characters" required autoComplete="new-password" />
          <SelectField label="Role" value={form.role} onChange={(v) => setForm((f) => ({ ...f, role: (v || 'VIEWER') as AdminRole }))} options={roleOptions} required />
        </div>
        {createError && <p className="text-sm text-red-600">{createError}</p>}
        <button className="btn-primary" type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create admin'}</button>
      </form>
    </div>
  );
}
