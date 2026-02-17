import React, { useEffect, useState } from 'react';
import { api } from '../api';

const emptyForm = { name: '', contactPerson: '', phone: '', address: '', notes: '' };

export function FactoriesPage() {
  const [factories, setFactories] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const q = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
      const res = await api(`/api/factories${q}`);
      setFactories(res.data || []);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => { load(); }, [keyword]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  }

  function openEdit(f) {
    setEditingId(f._id);
    setForm({
      name: f.name,
      contactPerson: f.contactPerson || '',
      phone: f.phone || '',
      address: f.address || '',
      notes: f.notes || ''
    });
    setShowForm(true);
  }

  async function submitForm() {
    setError('');
    try {
      if (!form.name) throw new Error('工厂名称必填');
      const payload = { ...form };
      if (editingId) {
        await api(`/api/factories/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await api('/api/factories', { method: 'POST', body: JSON.stringify(payload) });
      }
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteFactory(id) {
    if (!window.confirm('确定删除该工厂？')) return;
    try {
      await api(`/api/factories/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <div className="filter-row" style={{ marginBottom: 12 }}>
        <label>
          搜索：
          <input placeholder="工厂名称" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </label>
        <button onClick={openCreate}>+ 新增工厂</button>
      </div>

      {error && <div className="error">错误：{error}</div>}

      <table className="table">
        <thead>
          <tr>
            <th>工厂名称</th>
            <th>联系人</th>
            <th>电话</th>
            <th>地址</th>
            <th>备注</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {factories.map((f) => (
            <tr key={f._id}>
              <td><strong>{f.name}</strong></td>
              <td>{f.contactPerson}</td>
              <td>{f.phone}</td>
              <td>{f.address}</td>
              <td>{f.notes}</td>
              <td>
                <button onClick={() => openEdit(f)}>编辑</button>
                <button onClick={() => deleteFactory(f._id)} style={{ marginLeft: 4 }}>删除</button>
              </td>
            </tr>
          ))}
          {factories.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: 'center' }}>暂无工厂</td></tr>
          )}
        </tbody>
      </table>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 520 }}>
            <h2>{editingId ? '编辑工厂' : '新增工厂'}</h2>
            <div className="form">
              <div className="form-row">
                <label>工厂名称（必填）：
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={{ width: 200 }} />
                </label>
              </div>
              <div className="form-row">
                <label>联系人：
                  <input value={form.contactPerson} onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))} />
                </label>
                <label>电话：
                  <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                </label>
              </div>
              <div className="form-row">
                <label>地址：
                  <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} style={{ width: 350 }} />
                </label>
              </div>
              <div className="form-row">
                <label>备注：
                  <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} style={{ width: 350 }} />
                </label>
              </div>
              <div className="modal-actions">
                <button onClick={submitForm}>保存</button>
                <button onClick={() => setShowForm(false)}>取消</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
