import React, { useEffect, useState } from 'react';
import { api, getImageURL } from '../api';

const emptyForm = { sku: '', productName: '', brand: '', color: '', size: '', unitPrice: 0, category: '', imageUrl: '', notes: '' };

export function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const q = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
      const res = await api(`/api/products${q}`);
      setProducts(res.data || []);
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

  function openEdit(p) {
    setEditingId(p._id);
    setForm({
      sku: p.sku,
      productName: p.productName,
      brand: p.brand || '',
      color: p.color || '',
      size: p.size || '',
      unitPrice: p.unitPrice,
      category: p.category || '',
      imageUrl: p.imageUrl || '',
      notes: p.notes || ''
    });
    setShowForm(true);
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('上传失败');
      const data = await res.json();
      setForm((f) => ({ ...f, imageUrl: data.imageUrl }));
    } catch (e) {
      setError(e.message);
    }
  }

  async function submitForm() {
    setError('');
    try {
      if (!form.sku || !form.productName) throw new Error('SKU 和产品名称必填');
      const payload = { ...form, unitPrice: Number(form.unitPrice || 0) };
      if (editingId) {
        await api(`/api/products/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await api('/api/products', { method: 'POST', body: JSON.stringify(payload) });
      }
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteProduct(id) {
    if (!window.confirm('确定删除该产品？')) return;
    try {
      await api(`/api/products/${id}`, { method: 'DELETE' });
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
          <input placeholder="SKU 或产品名称" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </label>
        <button onClick={openCreate}>+ 新增产品</button>
      </div>

      {error && <div className="error">错误：{error}</div>}

      <table className="table">
        <thead>
          <tr>
            <th>图片</th>
            <th>SKU</th>
            <th>产品名称</th>
            <th>品牌</th>
            <th>颜色</th>
            <th>尺寸</th>
            <th>单价</th>
            <th>分类</th>
            <th>备注</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p._id}>
              <td>
                {p.imageUrl ? (
                  <img src={getImageURL(p.imageUrl)} alt={p.productName} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                ) : (
                  <div style={{ width: 40, height: 40, background: '#f0f0f0', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#999' }}>无图</div>
                )}
              </td>
              <td>{p.sku}</td>
              <td>{p.productName}</td>
              <td>{p.brand}</td>
              <td>{p.color}</td>
              <td>{p.size}</td>
              <td>{p.unitPrice}</td>
              <td>{p.category}</td>
              <td>{p.notes}</td>
              <td>
                <button onClick={() => openEdit(p)}>编辑</button>
                <button onClick={() => deleteProduct(p._id)} style={{ marginLeft: 4 }}>删除</button>
              </td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr><td colSpan={10} style={{ textAlign: 'center' }}>暂无产品</td></tr>
          )}
        </tbody>
      </table>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 520 }}>
            <h2>{editingId ? '编辑产品' : '新增产品'}</h2>
            <div className="form">
              <div className="form-row">
                <label>SKU：<input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} /></label>
                <label>名称：<input value={form.productName} onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))} /></label>
              </div>
              <div className="form-row">
                <label>品牌：<input value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} /></label>
                <label>分类：<input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} /></label>
              </div>
              <div className="form-row">
                <label>颜色：<input value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} /></label>
                <label>尺寸：<input value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} /></label>
              </div>
              <div className="form-row">
                <label>单价：<input type="number" value={form.unitPrice} onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))} /></label>
              </div>

              <div style={{ marginBottom: 12, marginTop: 12 }}>
                <h4 style={{ margin: '8px 0' }}>产品图片</h4>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {form.imageUrl && (
                    <img
                      src={getImageURL(form.imageUrl)}
                      alt="预览"
                      style={{ width: 120, height: 120, objectFit: 'cover', border: '1px solid #e0e0e0', borderRadius: 6 }}
                    />
                  )}
                  <div>
                    <div style={{ marginBottom: 6 }}>
                      <label style={{ display: 'block', marginBottom: 4 }}>上传图片：</label>
                      <input type="file" accept="image/*" onChange={handleImageUpload} />
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>或</div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 4 }}>图片 URL：</label>
                      <input
                        value={form.imageUrl}
                        onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                        placeholder="https://example.com/image.jpg"
                        style={{ width: 300 }}
                      />
                    </div>
                    {form.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, imageUrl: '' }))}
                        style={{ marginTop: 6, fontSize: 11 }}
                      >
                        清除图片
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-row">
                <label>备注：<input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} style={{ width: 300 }} /></label>
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
