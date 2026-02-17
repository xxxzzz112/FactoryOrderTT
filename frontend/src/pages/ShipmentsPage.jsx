import React, { useState, useCallback, useEffect } from 'react';
import { api, formatDate, todayStr, getImageURL } from '../api';

export function ShipmentsPage() {
  const [shipments, setShipments] = useState([]);
  const [filters, setFilters] = useState({ factoryName: '', sku: '', from: '', to: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 新建发货单
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    factoryName: '',
    shippedAt: todayStr(),
    lines: [],
    forwarder: '',
    logistics: { carrier: '', trackingNo: '', note: '' },
    recipient: '',
    notes: ''
  });

  // 工厂列表和产品库
  const [allFactories, setAllFactories] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [productSearchKeyword, setProductSearchKeyword] = useState('');

  useEffect(() => {
    loadShipments();
    loadFactories();
  }, []);

  async function loadShipments() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.factoryName) params.set('factoryName', filters.factoryName);
      if (filters.sku) params.set('sku', filters.sku);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      const res = await api(`/api/shipments-general?${params}`);
      setShipments(res.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadFactories() {
    try {
      const res = await api('/api/factories?limit=1000');
      setAllFactories(res.data || []);
    } catch (e) {
      console.error('加载工厂失败', e);
    }
  }

  async function loadProducts() {
    try {
      const res = await api('/api/products?limit=5000');
      setAllProducts(res.data || []);
    } catch (e) {
      console.error('加载产品失败', e);
    }
  }

  function openCreate() {
    loadProducts();
    setForm({
      factoryName: '',
      shippedAt: todayStr(),
      lines: [],
      forwarder: '',
      logistics: { carrier: '', trackingNo: '', note: '' },
      recipient: '',
      notes: ''
    });
    setProductSearchKeyword('');
    setCreating(true);
    setError('');
    setSuccess('');
  }

  function addProductToShipment(product) {
    setForm((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          sku: product.sku,
          productName: product.productName,
          brand: product.brand || '',
          color: product.color || '',
          size: product.size || '',
          quantity: 0
        }
      ]
    }));
  }

  function updateLine(idx, field, value) {
    setForm((prev) => {
      const lines = prev.lines.slice();
      lines[idx] = { ...lines[idx], [field]: value };
      return { ...prev, lines };
    });
  }

  function removeLine(idx) {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== idx)
    }));
  }

  async function submitShipment() {
    setError('');
    setSuccess('');
    try {
      if (!form.factoryName) throw new Error('工厂名称必填');
      if (form.lines.length === 0) throw new Error('请至少添加一个产品');
      
      const payload = {
        ...form,
        lines: form.lines.map((l) => ({
          sku: l.sku,
          productName: l.productName,
          quantity: Number(l.quantity || 0)
        }))
      };
      
      await api('/api/shipments-general', { method: 'POST', body: JSON.stringify(payload) });
      setSuccess('发货成功！');
      setCreating(false);
      await loadShipments();
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteShipment(id) {
    if (!window.confirm('确定要删除这条发货记录吗？\n删除后库存会恢复。')) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      await api(`/api/shipments-general/${id}`, { method: 'DELETE' });
      setSuccess('删除成功！');
      await loadShipments();
    } catch (e) {
      setError(e.message);
      alert(`删除失败：${e.message}`);
    }
  }

  return (
    <div>
      <h2>发货管理</h2>

      <div className="filter-row" style={{ marginBottom: 12 }}>
        <button onClick={openCreate}>新建发货单</button>
        <button onClick={loadShipments}>刷新</button>
      </div>

      {error && <div className="error">错误：{error}</div>}
      {success && <div style={{ padding: '8px 12px', background: '#d4edda', color: '#155724', borderRadius: 4, marginBottom: 12 }}>{success}</div>}

      <section className="filters">
        <div className="filter-row">
          <label>工厂：<input value={filters.factoryName} onChange={(e) => setFilters((f) => ({ ...f, factoryName: e.target.value }))} placeholder="输入工厂名" /></label>
          <label>SKU：<input value={filters.sku} onChange={(e) => setFilters((f) => ({ ...f, sku: e.target.value }))} placeholder="输入SKU" /></label>
        </div>
        <div className="filter-row">
          <label>发货起：<input type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} /></label>
          <label>发货止：<input type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} /></label>
          <button onClick={loadShipments}>筛选</button>
        </div>
      </section>

      {loading ? <div>加载中...</div> : (
        <div style={{ background: '#fff', padding: 10, borderRadius: 6, border: '1px solid #e0e0e0', marginTop: 12 }}>
          <h3>发货记录（共 {shipments.length} 条）</h3>
          <table className="table">
            <thead>
              <tr>
                <th>工厂</th>
                <th>发货日期</th>
                <th>SKU明细</th>
                <th>货代</th>
                <th>收货人</th>
                <th>承运商</th>
                <th>运单号</th>
                <th>备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s._id}>
                  <td>{s.factoryName}</td>
                  <td>{formatDate(s.shippedAt)}</td>
                  <td style={{ fontSize: 11 }}>
                    {s.lines.map((l, idx) => (
                      <div key={idx}>{l.sku} x{l.quantity} {l.productName && `(${l.productName})`}</div>
                    ))}
                  </td>
                  <td>{s.forwarder || '-'}</td>
                  <td>{s.recipient || '-'}</td>
                  <td>{s.logistics?.carrier || '-'}</td>
                  <td>{s.logistics?.trackingNo || '-'}</td>
                  <td style={{ fontSize: 10 }}>{s.notes || '-'}</td>
                  <td>
                    <button onClick={() => deleteShipment(s._id)} style={{ background: '#dc3545', color: '#fff', fontSize: 12 }}>删除</button>
                  </td>
                </tr>
              ))}
              {shipments.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center' }}>暂无数据</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* 新建发货单弹窗 */}
      {creating && (
        <div className="modal-backdrop" onClick={() => setCreating(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900 }}>
            <h2>新建发货单</h2>
            <div className="form">
              <div className="form-row">
                <label>选择工厂：
                  <select value={form.factoryName} onChange={(e) => setForm((f) => ({ ...f, factoryName: e.target.value }))}>
                    <option value="">-- 请选择工厂 --</option>
                    {allFactories.map((fac) => <option key={fac._id} value={fac.name}>{fac.name}</option>)}
                  </select>
                </label>
                <label>发货日期：
                  <input type="date" value={form.shippedAt} onChange={(e) => setForm((f) => ({ ...f, shippedAt: e.target.value }))} />
                </label>
                <label>货代：
                  <input value={form.forwarder} onChange={(e) => setForm((f) => ({ ...f, forwarder: e.target.value }))} placeholder="货运代理" />
                </label>
                <label>收货人：
                  <input value={form.recipient} onChange={(e) => setForm((f) => ({ ...f, recipient: e.target.value }))} placeholder="客户名称" />
                </label>
              </div>

              <h4>选择产品</h4>
              <div style={{ marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder="搜索 SKU / 产品名称 / 品牌"
                  value={productSearchKeyword}
                  onChange={(e) => setProductSearchKeyword(e.target.value)}
                  style={{ width: '100%', padding: 8 }}
                />
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 4, marginBottom: 12 }}>
                <table className="table small">
                  <thead>
                    <tr><th>图片</th><th>SKU</th><th>品牌</th><th>名称</th><th>颜色</th><th>尺寸</th><th>操作</th></tr>
                  </thead>
                  <tbody>
                    {allProducts
                      .filter((p) => {
                        if (!productSearchKeyword) return true;
                        const kw = productSearchKeyword.toLowerCase();
                        return (
                          p.sku.toLowerCase().includes(kw) ||
                          p.productName.toLowerCase().includes(kw) ||
                          (p.brand && p.brand.toLowerCase().includes(kw))
                        );
                      })
                      .slice(0, 50)
                      .map((p) => (
                        <tr key={p._id}>
                          <td>
                            {p.imageUrl ? (
                              <img src={getImageURL(p.imageUrl)} alt="" style={{ width: 40, height: 40, objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: 40, height: 40, background: '#eee' }}></div>
                            )}
                          </td>
                          <td style={{ fontSize: 11 }}>{p.sku}</td>
                          <td style={{ fontSize: 11 }}>{p.brand}</td>
                          <td style={{ fontSize: 11 }}>{p.productName}</td>
                          <td style={{ fontSize: 10 }}>{p.color}</td>
                          <td style={{ fontSize: 10 }}>{p.size}</td>
                          <td>
                            <button type="button" onClick={() => addProductToShipment(p)} style={{ fontSize: 12 }}>
                              添加
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <h4>已选产品</h4>
              {form.lines.length === 0 ? (
                <div style={{ color: '#888', padding: 12, background: '#f9f9f9', borderRadius: 4, marginBottom: 12 }}>
                  请从上方产品库中选择产品
                </div>
              ) : (
                <table className="table small">
                  <thead>
                    <tr><th>SKU</th><th>产品名称</th><th>品牌</th><th>颜色</th><th>尺寸</th><th>数量</th><th>操作</th></tr>
                  </thead>
                  <tbody>
                    {form.lines.map((line, idx) => (
                      <tr key={idx}>
                        <td style={{ fontSize: 11 }}>{line.sku}</td>
                        <td style={{ fontSize: 11 }}>{line.productName}</td>
                        <td style={{ fontSize: 11 }}>{line.brand}</td>
                        <td style={{ fontSize: 10 }}>{line.color}</td>
                        <td style={{ fontSize: 10 }}>{line.size}</td>
                        <td>
                          <input
                            type="number"
                            value={line.quantity}
                            onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                            style={{ width: 80 }}
                          />
                        </td>
                        <td><button type="button" onClick={() => removeLine(idx)}>删除</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <h4>物流信息</h4>
              <div className="form-row">
                <label>承运商：<input value={form.logistics.carrier} onChange={(e) => setForm((f) => ({ ...f, logistics: { ...f.logistics, carrier: e.target.value } }))} /></label>
                <label>运单号：<input value={form.logistics.trackingNo} onChange={(e) => setForm((f) => ({ ...f, logistics: { ...f.logistics, trackingNo: e.target.value } }))} /></label>
              </div>
              <div className="form-row">
                <label>物流备注：<input value={form.logistics.note} onChange={(e) => setForm((f) => ({ ...f, logistics: { ...f.logistics, note: e.target.value } }))} /></label>
                <label>其他备注：<input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></label>
              </div>

              <div style={{ marginTop: 12 }}>
                <button onClick={submitShipment} style={{ marginRight: 8, fontWeight: 600 }}>提交发货</button>
                <button onClick={() => setCreating(false)}>取消</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
