import React, { useState } from 'react';
import { api, getImageURL } from '../api';

export function InventoryPage() {
  const [factoryName, setFactoryName] = useState('');
  const [inventory, setInventory] = useState([]);
  const [orderStats, setOrderStats] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // 批量录入模式
  const [batchMode, setBatchMode] = useState(false);
  const [batchFactoryName, setBatchFactoryName] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [batchData, setBatchData] = useState({});
  const [searchKeyword, setSearchKeyword] = useState('');
  const [allFactories, setAllFactories] = useState([]);

  // 加载某工厂的库存
  async function loadInventory() {
    if (!factoryName.trim()) {
      setError('请输入工厂名称');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api(`/api/inventory/factory?factoryName=${encodeURIComponent(factoryName.trim())}`);
      setInventory(res.data || []);
      setEditing(false);
      await loadOrderStats();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // 加载该工厂的订单统计
  async function loadOrderStats() {
    if (!factoryName.trim()) return;
    try {
      const res = await api(`/api/orders?factoryName=${encodeURIComponent(factoryName.trim())}&limit=1000`);
      const orders = res.data || [];
      const skuSet = new Set();
      orders.forEach(order => {
        (order.items || []).forEach(item => skuSet.add(item.sku));
      });
      setOrderStats({
        orderCount: orders.length,
        skuCount: skuSet.size
      });
    } catch (e) {
      setOrderStats(null);
    }
  }

  // 开始编辑
  function startEdit() {
    setEditing(true);
  }

  // 更新某行的字段
  function updateRow(idx, field, value) {
    setInventory((prev) => {
      const next = prev.slice();
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  // 新增一行
  function addRow() {
    setInventory((prev) => [
      ...prev,
      { _id: null, sku: '', quantity: 0, location: '', notes: '' }
    ]);
  }

  // 删除某行
  function removeRow(idx) {
    setInventory((prev) => prev.filter((_, i) => i !== idx));
  }

  // 保存批量更新
  async function saveAll() {
    setError('');
    setSuccess('');
    try {
      const items = inventory.map((it) => ({
        sku: it.sku,
        quantity: Number(it.quantity || 0),
        location: it.location || '',
        notes: it.notes || ''
      }));
      await api('/api/inventory/batch', {
        method: 'POST',
        body: JSON.stringify({ factoryName: factoryName.trim(), items })
      });
      await loadInventory();
      setSuccess('保存成功！');
    } catch (e) {
      setError(e.message);
    }
  }

  // 从订单初始化库存
  async function initializeFromOrders() {
    if (!factoryName.trim()) {
      setError('请输入工厂名称');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await api('/api/inventory/initialize-from-orders', {
        method: 'POST',
        body: JSON.stringify({ factoryName: factoryName.trim() })
      });
      setSuccess(`${res.message}。新建 ${res.initialized} 个SKU，已存在 ${res.skipped} 个SKU。`);
      await loadInventory();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // 批量录入相关函数
  async function openBatchMode() {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const [productsRes, factoriesRes] = await Promise.all([
        api('/api/products?limit=5000'),
        api('/api/factories?limit=1000')
      ]);
      setAllProducts(productsRes.data || []);
      setAllFactories(factoriesRes.data || []);
      setBatchMode(true);
      setBatchFactoryName('');
      setBatchData({});
      setSearchKeyword('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function updateBatchQuantity(sku, value) {
    setBatchData((prev) => ({
      ...prev,
      [sku]: value
    }));
  }

  async function saveBatchInventory() {
    if (!batchFactoryName.trim()) {
      setError('请选择工厂');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const items = Object.entries(batchData)
        .filter(([sku, qty]) => qty !== '' && qty !== undefined)
        .map(([sku, qty]) => {
          const product = allProducts.find((p) => p.sku === sku);
          return {
            sku,
            quantity: Number(qty || 0),
            location: '',
            notes: product ? `${product.productName} ${product.brand || ''} ${product.color || ''} ${product.size || ''}`.trim() : ''
          };
        });
      
      if (items.length === 0) {
        setError('请至少填写一个产品的库存数量');
        setLoading(false);
        return;
      }

      await api('/api/inventory/batch', {
        method: 'POST',
        body: JSON.stringify({ factoryName: batchFactoryName.trim(), items })
      });
      setSuccess(`成功录入 ${items.length} 个产品的库存！`);
      setBatchMode(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>库存管理</h2>
      <div className="filter-row" style={{ marginBottom: 12 }}>
        <label>
          工厂名称：
          <input
            placeholder="输入工厂名称"
            value={factoryName}
            onChange={(e) => setFactoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') loadInventory();
            }}
          />
        </label>
        <button onClick={loadInventory}>查询库存</button>
        <button onClick={initializeFromOrders} style={{ background: '#28a745', color: '#fff' }}>
          从订单初始化
        </button>
        <button onClick={openBatchMode} style={{ background: '#007bff', color: '#fff', fontWeight: 600 }}>
          批量录入库存
        </button>
        {inventory.length > 0 && !editing && (
          <button onClick={startEdit}>编辑库存</button>
        )}
      </div>

      {error && <div className="error">错误：{error}</div>}
      {success && <div style={{ padding: '8px 12px', background: '#d4edda', color: '#155724', borderRadius: 4, marginBottom: 12 }}>{success}</div>}
      {loading && <div>加载中...</div>}

      {inventory.length > 0 && (
        <div style={{ background: '#fff', padding: 10, borderRadius: 6, border: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>工厂：{factoryName}</h3>
            {orderStats && (
              <div style={{ fontSize: 13, color: '#666' }}>
                订单数：{orderStats.orderCount} | 订单涉及SKU：{orderStats.skuCount} | 库存SKU：{inventory.length}
              </div>
            )}
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>库存数量</th>
                <th>存放位置</th>
                <th>备注</th>
                {editing && <th>操作</th>}
              </tr>
            </thead>
            <tbody>
              {inventory.map((it, idx) => (
                <tr key={idx}>
                  <td>
                    {editing ? (
                      <input
                        value={it.sku}
                        onChange={(e) => updateRow(idx, 'sku', e.target.value)}
                        style={{ width: 120 }}
                      />
                    ) : (
                      it.sku
                    )}
                  </td>
                  <td>
                    {editing ? (
                      <input
                        type="number"
                        value={it.quantity}
                        onChange={(e) => updateRow(idx, 'quantity', Number(e.target.value))}
                        style={{ width: 80 }}
                      />
                    ) : (
                      it.quantity
                    )}
                  </td>
                  <td>
                    {editing ? (
                      <input
                        value={it.location}
                        onChange={(e) => updateRow(idx, 'location', e.target.value)}
                        style={{ width: 100 }}
                      />
                    ) : (
                      it.location
                    )}
                  </td>
                  <td>
                    {editing ? (
                      <input
                        value={it.notes}
                        onChange={(e) => updateRow(idx, 'notes', e.target.value)}
                        style={{ width: 150 }}
                      />
                    ) : (
                      it.notes
                    )}
                  </td>
                  {editing && (
                    <td>
                      <button onClick={() => removeRow(idx)}>删除</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {editing && (
            <div style={{ marginTop: 10 }}>
              <button onClick={addRow}>+ 新增一行</button>
              <button onClick={saveAll} style={{ marginLeft: 8, fontWeight: 600 }}>
                保存库存
              </button>
              <button onClick={() => setEditing(false)} style={{ marginLeft: 8 }}>
                取消
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && inventory.length === 0 && factoryName && (
        <div style={{ color: '#888', marginTop: 12 }}>
          该工厂暂无库存记录。您可以：
          <button onClick={initializeFromOrders} style={{ marginLeft: 8, background: '#28a745', color: '#fff' }}>
            从订单初始化
          </button>
          <span style={{ margin: '0 8px' }}>或</span>
          <button onClick={startEdit}>
            手动编辑库存
          </button>
        </div>
      )}

      {/* 批量录入库存弹窗 */}
      {batchMode && (
        <div className="modal-backdrop" onClick={() => setBatchMode(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 1000 }}>
            <h2>批量录入库存</h2>
            <p style={{ color: '#666', fontSize: 14 }}>一次性为所有产品录入当前库存数量</p>

            <div className="form" style={{ marginBottom: 12 }}>
              <div className="form-row">
                <label>选择工厂：
                  <select 
                    value={batchFactoryName} 
                    onChange={(e) => setBatchFactoryName(e.target.value)}
                    style={{ minWidth: 200 }}
                  >
                    <option value="">-- 请选择工厂 --</option>
                    {allFactories.map((fac) => (
                      <option key={fac._id} value={fac.name}>{fac.name}</option>
                    ))}
                  </select>
                </label>
                <label>搜索产品：
                  <input
                    type="text"
                    placeholder="SKU / 名称 / 品牌"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    style={{ minWidth: 300 }}
                  />
                </label>
              </div>
            </div>

            <div style={{ maxHeight: 500, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 4 }}>
              <table className="table small">
                <thead style={{ position: 'sticky', top: 0, background: '#f5f5f5', zIndex: 1 }}>
                  <tr>
                    <th style={{ width: 60 }}>图片</th>
                    <th>SKU</th>
                    <th>品牌</th>
                    <th>产品名称</th>
                    <th>颜色</th>
                    <th>尺寸</th>
                    <th style={{ width: 120 }}>库存数量</th>
                  </tr>
                </thead>
                <tbody>
                  {allProducts
                    .filter((p) => {
                      if (!searchKeyword) return true;
                      const kw = searchKeyword.toLowerCase();
                      return (
                        p.sku.toLowerCase().includes(kw) ||
                        p.productName.toLowerCase().includes(kw) ||
                        (p.brand && p.brand.toLowerCase().includes(kw))
                      );
                    })
                    .map((p) => (
                      <tr key={p._id}>
                        <td>
                          {p.imageUrl ? (
                            <img src={getImageURL(p.imageUrl)} alt="" style={{ width: 40, height: 40, objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: 40, height: 40, background: '#eee' }}></div>
                          )}
                        </td>
                        <td style={{ fontSize: 11, fontWeight: 600 }}>{p.sku}</td>
                        <td style={{ fontSize: 11 }}>{p.brand}</td>
                        <td style={{ fontSize: 11 }}>{p.productName}</td>
                        <td style={{ fontSize: 10 }}>{p.color}</td>
                        <td style={{ fontSize: 10 }}>{p.size}</td>
                        <td>
                          <input
                            type="number"
                            value={batchData[p.sku] || ''}
                            onChange={(e) => updateBatchQuantity(p.sku, e.target.value)}
                            placeholder="0"
                            style={{ width: '100%', padding: 4 }}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, color: '#666' }}>
                已填写：{Object.keys(batchData).filter(k => batchData[k] !== '' && batchData[k] !== undefined).length} 个产品
              </div>
              <div>
                <button onClick={saveBatchInventory} style={{ marginRight: 8, fontWeight: 600, background: '#007bff', color: '#fff' }}>
                  保存库存
                </button>
                <button onClick={() => setBatchMode(false)}>取消</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
