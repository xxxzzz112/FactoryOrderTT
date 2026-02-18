import React, { useEffect, useState } from 'react';
import { api, getImageURL } from '../api';

// cm转inch: 1 inch = 2.54 cm
const cmToInch = (cm) => (cm / 2.54).toFixed(2);
const formatDimension = (cm) => cm > 0 ? `${cm}cm (${cmToInch(cm)}")` : '-';

const emptyForm = { 
  sku: '', productName: '', brand: '', shop: '', category: '',
  asin: '', parentAsin: '', fnsku: '',
  color: '', size: '', 
  imageUrl: '', notes: '',
  innerBoxLength: 0, innerBoxWidth: 0, innerBoxHeight: 0, innerBoxWeight: 0
};

export function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  
  // 工厂规格管理
  const [showSpecs, setShowSpecs] = useState(false);
  const [currentSku, setCurrentSku] = useState('');
  const [specs, setSpecs] = useState([]);
  const [factories, setFactories] = useState([]);
  const [specForm, setSpecForm] = useState({
    factoryName: '',
    unitPrice: 0,
    outerBoxLength: 0,
    outerBoxWidth: 0,
    outerBoxHeight: 0,
    pcsPerCarton: 0,
    notes: ''
  });

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
      shop: p.shop || '',
      category: p.category || '',
      asin: p.asin || '',
      parentAsin: p.parentAsin || '',
      fnsku: p.fnsku || '',
      color: p.color || '',
      size: p.size || '',
      imageUrl: p.imageUrl || '',
      notes: p.notes || '',
      innerBoxLength: p.innerBoxLength || 0,
      innerBoxWidth: p.innerBoxWidth || 0,
      innerBoxHeight: p.innerBoxHeight || 0,
      innerBoxWeight: p.innerBoxWeight || 0
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

  async function handleExcelImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/import/products', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('导入失败');
      const result = await res.json();
      const msg = [
        `导入完成！`,
        `产品新增: ${result.created}`,
        `产品更新: ${result.updated}`,
        `外箱规格新增: ${result.specsCreated || 0}`,
        `外箱规格更新: ${result.specsUpdated || 0}`,
        `错误: ${result.errors?.length || 0}`
      ];
      alert(msg.join('\n'));
      if (result.errors?.length > 0) {
        console.error('导入错误：', result.errors);
      }
      await load();
      e.target.value = '';
    } catch (e) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  }

  async function submitForm() {
    setError('');
    try {
      if (!form.sku || !form.productName) throw new Error('SKU 和产品名称必填');
      const payload = { 
        ...form,
        innerBoxLength: Number(form.innerBoxLength || 0),
        innerBoxWidth: Number(form.innerBoxWidth || 0),
        innerBoxHeight: Number(form.innerBoxHeight || 0),
        innerBoxWeight: Number(form.innerBoxWeight || 0)
      };
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

  // 加载工厂列表
  async function loadFactories() {
    try {
      const res = await api('/api/factories');
      setFactories(res.data || []);
    } catch (e) {
      console.error('加载工厂失败', e);
    }
  }

  // 打开工厂规格管理
  async function openSpecs(product) {
    setCurrentSku(product.sku);
    setShowSpecs(true);
    await loadFactories();
    await loadSpecs(product.sku);
  }

  // 加载某产品的工厂规格
  async function loadSpecs(sku) {
    try {
      const res = await api(`/api/product-factory-specs?sku=${encodeURIComponent(sku)}`);
      setSpecs(res.data || []);
    } catch (e) {
      setError(e.message);
    }
  }

  // 保存工厂规格
  async function saveSpec() {
    if (!specForm.factoryName) {
      alert('请选择工厂');
      return;
    }
    try {
      await api('/api/product-factory-specs', {
        method: 'POST',
        body: JSON.stringify({
          sku: currentSku,
          ...specForm
        })
      });
      await loadSpecs(currentSku);
      setSpecForm({
        factoryName: '',
        unitPrice: 0,
        outerBoxLength: 0,
        outerBoxWidth: 0,
        outerBoxHeight: 0,
        pcsPerCarton: 0,
        notes: ''
      });
    } catch (e) {
      setError(e.message);
    }
  }

  // 删除工厂规格
  async function deleteSpec(id) {
    if (!window.confirm('确定删除该规格？')) return;
    try {
      await api(`/api/product-factory-specs/${id}`, { method: 'DELETE' });
      await loadSpecs(currentSku);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <div className="filter-row" style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
        <label>
          搜索：
          <input placeholder="SKU 或产品名称" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </label>
        <button onClick={openCreate}>+ 新增产品</button>
        <label style={{ cursor: 'pointer', background: '#28a745', color: 'white', padding: '8px 16px', borderRadius: 4 }}>
          {importing ? '导入中...' : '📊 Excel批量导入'}
          <input 
            type="file" 
            accept=".xlsx,.xls" 
            onChange={handleExcelImport} 
            disabled={importing}
            style={{ display: 'none' }} 
          />
        </label>
        <a 
          href="/api/exports/products-template" 
          download="产品导入模板.xlsx"
          style={{ color: '#007bff', textDecoration: 'underline', fontSize: 14 }}
        >
          下载模板
        </a>
      </div>

      {error && <div className="error">错误：{error}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>图片</th>
              <th>SKU</th>
              <th>ASIN</th>
              <th>产品名称</th>
              <th>品牌</th>
              <th>店铺</th>
              <th>类目</th>
              <th>颜色</th>
              <th>尺寸</th>
              <th>内箱尺寸(cm)</th>
              <th>内箱重(kg)</th>
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
                <td style={{ fontSize: 11 }}>{p.asin || '-'}</td>
                <td>{p.productName}</td>
                <td>{p.brand}</td>
                <td>{p.shop}</td>
                <td>{p.category}</td>
                <td>{p.color}</td>
                <td>{p.size}</td>
                <td style={{ fontSize: 11 }}>
                  {(p.innerBoxLength > 0 || p.innerBoxWidth > 0 || p.innerBoxHeight > 0) 
                    ? `${p.innerBoxLength}×${p.innerBoxWidth}×${p.innerBoxHeight}` 
                    : '-'}
                </td>
                <td>{p.innerBoxWeight > 0 ? p.innerBoxWeight : '-'}</td>
                <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.notes}</td>
                <td>
                  <button onClick={() => openEdit(p)}>编辑</button>
                  <button onClick={() => openSpecs(p)} style={{ marginLeft: 4, background: '#17a2b8' }}>外箱规格</button>
                  <button onClick={() => deleteProduct(p._id)} style={{ marginLeft: 4 }}>删除</button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={13} style={{ textAlign: 'center' }}>暂无产品</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 工厂规格管理弹窗 */}
      {showSpecs && (
        <div className="modal-backdrop" onClick={() => setShowSpecs(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 720, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2>外箱规格管理 - SKU: {currentSku}</h2>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>不同工厂的外箱尺寸可能不同，请为每个工厂设置专属规格</p>

            {/* 新增规格表单 */}
            <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8, marginBottom: 20 }}>
              <h4 style={{ marginTop: 0 }}>➕ 添加工厂规格</h4>
              <div className="form">
                <div className="form-row">
                  <label>
                    选择工厂：
                    <select 
                      value={specForm.factoryName} 
                      onChange={(e) => setSpecForm((f) => ({ ...f, factoryName: e.target.value }))}
                      style={{ width: 200 }}
                    >
                      <option value="">-- 请选择 --</option>
                      {factories.map(factory => (
                        <option key={factory._id} value={factory.name}>{factory.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    单价：
                    <input type="number" step="0.01" value={specForm.unitPrice} onChange={(e) => setSpecForm((f) => ({ ...f, unitPrice: e.target.value }))} style={{ width: 120 }} />
                  </label>
                </div>
                <h5 style={{ marginTop: 12, marginBottom: 8 }}>📦 外箱尺寸（cm）</h5>
                <div className="form-row">
                  <label>长：<input type="number" step="0.1" value={specForm.outerBoxLength} onChange={(e) => setSpecForm((f) => ({ ...f, outerBoxLength: e.target.value }))} style={{ width: 100 }} /></label>
                  <label>宽：<input type="number" step="0.1" value={specForm.outerBoxWidth} onChange={(e) => setSpecForm((f) => ({ ...f, outerBoxWidth: e.target.value }))} style={{ width: 100 }} /></label>
                  <label>高：<input type="number" step="0.1" value={specForm.outerBoxHeight} onChange={(e) => setSpecForm((f) => ({ ...f, outerBoxHeight: e.target.value }))} style={{ width: 100 }} /></label>
                </div>
                {(specForm.outerBoxLength > 0 || specForm.outerBoxWidth > 0 || specForm.outerBoxHeight > 0) && (
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4, marginBottom: 8 }}>
                    英寸尺寸: {formatDimension(specForm.outerBoxLength)} × {formatDimension(specForm.outerBoxWidth)} × {formatDimension(specForm.outerBoxHeight)}
                  </div>
                )}
                <div className="form-row">
                  <label>单箱装套数：<input type="number" value={specForm.pcsPerCarton} onChange={(e) => setSpecForm((f) => ({ ...f, pcsPerCarton: e.target.value }))} style={{ width: 150 }} /></label>
                </div>
                <div className="form-row">
                  <label>备注：<input value={specForm.notes} onChange={(e) => setSpecForm((f) => ({ ...f, notes: e.target.value }))} style={{ width: 400 }} /></label>
                </div>
                <button onClick={saveSpec} style={{ background: '#28a745' }}>保存规格</button>
              </div>
            </div>

            {/* 已有规格列表 */}
            <h4>📋 已设置的工厂规格</h4>
            {specs.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>暂无规格，请添加</p>
            ) : (
              <table className="table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>工厂</th>
                    <th>单价</th>
                    <th>外箱长</th>
                    <th>外箱宽</th>
                    <th>外箱高</th>
                    <th>单箱装套数</th>
                    <th>备注</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {specs.map((spec) => (
                    <tr key={spec._id}>
                      <td><strong>{spec.factoryName}</strong></td>
                      <td>{spec.unitPrice > 0 ? `¥${spec.unitPrice}` : '-'}</td>
                      <td>{formatDimension(spec.outerBoxLength)}</td>
                      <td>{formatDimension(spec.outerBoxWidth)}</td>
                      <td>{formatDimension(spec.outerBoxHeight)}</td>
                      <td>{spec.pcsPerCarton} 套</td>
                      <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{spec.notes}</td>
                      <td>
                        <button onClick={() => deleteSpec(spec._id)} style={{ fontSize: 12 }}>删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button onClick={() => setShowSpecs(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 620, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2>{editingId ? '编辑产品' : '新增产品'}</h2>
            <div className="form">
              <div className="form-row">
                <label>SKU：<input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} /></label>
                <label>名称：<input value={form.productName} onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))} /></label>
              </div>
              <div className="form-row">
                <label>品牌：<input value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} /></label>
                <label>店铺：<input value={form.shop} onChange={(e) => setForm((f) => ({ ...f, shop: e.target.value }))} /></label>
              </div>
              <div className="form-row">
                <label>类目：<input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} /></label>
              </div>
              
              <h4 style={{ margin: '16px 0 8px', borderTop: '1px solid #e0e0e0', paddingTop: 12 }}>🏪 亚马逊标识</h4>
              <div className="form-row">
                <label>ASIN：<input value={form.asin} onChange={(e) => setForm((f) => ({ ...f, asin: e.target.value }))} placeholder="B0XXXXXX" /></label>
                <label>父ASIN：<input value={form.parentAsin} onChange={(e) => setForm((f) => ({ ...f, parentAsin: e.target.value }))} placeholder="B0YYYYYY" /></label>
              </div>
              <div className="form-row">
                <label>FNSKU：<input value={form.fnsku} onChange={(e) => setForm((f) => ({ ...f, fnsku: e.target.value }))} placeholder="X00XXXXXX" style={{ width: 200 }} /></label>
              </div>
              <div className="form-row">
                <label>颜色：<input value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} /></label>
                <label>尺寸：<input value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} /></label>
              </div>

              <h4 style={{ margin: '16px 0 8px', borderTop: '1px solid #e0e0e0', paddingTop: 12 }}>📦 内箱规格</h4>
              <div className="form-row">
                <label>长(cm)：<input type="number" step="0.1" value={form.innerBoxLength} onChange={(e) => setForm((f) => ({ ...f, innerBoxLength: e.target.value }))} style={{ width: 100 }} /></label>
                <label>宽(cm)：<input type="number" step="0.1" value={form.innerBoxWidth} onChange={(e) => setForm((f) => ({ ...f, innerBoxWidth: e.target.value }))} style={{ width: 100 }} /></label>
                <label>高(cm)：<input type="number" step="0.1" value={form.innerBoxHeight} onChange={(e) => setForm((f) => ({ ...f, innerBoxHeight: e.target.value }))} style={{ width: 100 }} /></label>
                <label>重(kg)：<input type="number" step="0.01" value={form.innerBoxWeight} onChange={(e) => setForm((f) => ({ ...f, innerBoxWeight: e.target.value }))} style={{ width: 100 }} /></label>
              </div>
              {(form.innerBoxLength > 0 || form.innerBoxWidth > 0 || form.innerBoxHeight > 0) && (
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  英寸尺寸: {formatDimension(form.innerBoxLength)} × {formatDimension(form.innerBoxWidth)} × {formatDimension(form.innerBoxHeight)}
                </div>
              )}

              <div style={{ marginBottom: 12, marginTop: 16 }}>
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
                <label>备注：<input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} style={{ width: 450 }} /></label>
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
