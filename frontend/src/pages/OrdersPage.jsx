import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api, formatDate, todayStr, getImageURL } from '../api';

const ORDER_STATUS = ['未生产', '生产中', '部分发货', '已完成'];

export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({ factoryName: '', sku: '', brand: '', status: '', orderFrom: '', orderTo: '', deliveryFrom: '', deliveryTo: '' });
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 新建订单
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [orderForm, setOrderForm] = useState({ factoryName: '', orderDate: todayStr(), deliveryDate: '', estimatedProductionDays: 0, status: '未生产', items: [], notes: '' });

  // 产品库（下单时用来选择）
  const [allProducts, setAllProducts] = useState([]);
  const [productSearchKeyword, setProductSearchKeyword] = useState('');
  // 工厂库（下单时用来选择）
  const [allFactories, setAllFactories] = useState([]);

  // 订单详情
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [shipmentForm, setShipmentForm] = useState({
    shippedAt: todayStr(),
    lines: [{ sku: '', quantity: 0 }],
    logistics: { carrier: '', trackingNo: '', note: '' }
  });

  const filterQuery = useMemo(() => {
    const q = new URLSearchParams();
    if (filters.factoryName) q.set('factoryName', filters.factoryName);
    if (filters.sku) q.set('sku', filters.sku);
    if (filters.brand) q.set('brand', filters.brand);
    if (filters.status) q.set('status', filters.status);
    if (filters.orderFrom) q.set('orderFrom', filters.orderFrom);
    if (filters.orderTo) q.set('orderTo', filters.orderTo);
    if (filters.deliveryFrom) q.set('deliveryFrom', filters.deliveryFrom);
    if (filters.deliveryTo) q.set('deliveryTo', filters.deliveryTo);
    return q.toString();
  }, [filters]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api(`/api/orders?${filterQuery}`);
      setOrders(res.data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [filterQuery]);

  const loadOverview = useCallback(async () => {
    try {
      const res = await api(`/api/reports/overview?${filterQuery}`);
      setOverview(res);
    } catch { /* ignore */ }
  }, [filterQuery]);

  useEffect(() => { loadOrders(); loadOverview(); }, [loadOrders, loadOverview]);

  async function loadProducts() {
    try {
      const res = await api('/api/products');
      setAllProducts(res.data || []);
    } catch { /* ignore */ }
  }

  async function loadFactories() {
    try {
      const res = await api('/api/factories');
      setAllFactories(res.data || []);
    } catch { /* ignore */ }
  }

  // ---- 新建订单 ----
  function openCreateOrder() {
    loadProducts();
    loadFactories();
    setOrderForm({ factoryName: '', orderDate: todayStr(), deliveryDate: '', estimatedProductionDays: 0, status: '未生产', items: [], notes: '' });
    setCreatingOrder(true);
  }

  function addProductToOrder(product) {
    setOrderForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          sku: product.sku,
          productName: product.productName,
          brand: product.brand || '',
          color: product.color || '',
          size: product.size || '',
          unitPrice: product.unitPrice,
          quantity: 1
        }
      ]
    }));
  }

  function updateOrderItem(idx, field, value) {
    setOrderForm((prev) => {
      const items = prev.items.slice();
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, items };
    });
  }

  function removeOrderItem(idx) {
    setOrderForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  }

  async function submitOrder() {
    setError('');
    try {
      if (!orderForm.factoryName) throw new Error('工厂名称必填');
      if (orderForm.items.length === 0) throw new Error('请至少添加一个产品');
      const payload = {
        ...orderForm,
        estimatedProductionDays: Number(orderForm.estimatedProductionDays || 0),
        items: orderForm.items.map((it) => ({
          ...it,
          quantity: Number(it.quantity || 0),
          unitPrice: Number(it.unitPrice || 0)
        }))
      };
      await api('/api/orders', { method: 'POST', body: JSON.stringify(payload) });
      setCreatingOrder(false);
      await loadOrders();
      await loadOverview();
    } catch (e) { setError(e.message); }
  }

  // ---- 删除订单 ----
  async function deleteOrder(orderId, factoryName) {
    if (!window.confirm(`确定要删除工厂"${factoryName}"的这个订单吗？\n\n注意：如果订单已有发货记录，将无法删除。`)) {
      return;
    }
    setError('');
    try {
      await api(`/api/orders/${orderId}`, { method: 'DELETE' });
      // 如果删除的是当前选中的订单，清空详情面板
      if (selectedOrder?._id === orderId) {
        setSelectedOrder(null);
        setShipments([]);
      }
      await loadOrders();
      await loadOverview();
    } catch (e) {
      setError(e.message);
      alert(`删除失败：${e.message}`);
    }
  }

  // ---- 订单详情 ----
  async function openOrderDetail(orderId) {
    setSelectedOrder(null);
    setShipments([]);
    setError('');
    try {
      const res = await api(`/api/orders/${orderId}`);
      setSelectedOrder(res.order);
      setShipments(res.shipments || []);
      setShipmentForm({
        shippedAt: todayStr(),
        lines: [{ sku: res.order.items[0]?.sku || '', quantity: 0 }],
        logistics: { carrier: '', trackingNo: '', note: '' }
      });
    } catch (e) { setError(e.message); }
  }

  function updateShipmentLine(idx, field, value) {
    setShipmentForm((prev) => {
      const lines = prev.lines.slice();
      lines[idx] = { ...lines[idx], [field]: value };
      return { ...prev, lines };
    });
  }

  function addShipmentLine() {
    setShipmentForm((prev) => ({ ...prev, lines: [...prev.lines, { sku: '', quantity: 0 }] }));
  }

  async function submitShipment() {
    if (!selectedOrder?._id) return;
    setError('');
    try {
      const payload = {
        orderId: selectedOrder._id,
        shippedAt: shipmentForm.shippedAt,
        lines: shipmentForm.lines.map((l) => ({ ...l, quantity: Number(l.quantity || 0) })),
        logistics: shipmentForm.logistics
      };
      await api('/api/shipments', { method: 'POST', body: JSON.stringify(payload) });
      await openOrderDetail(selectedOrder._id);
      await loadOrders();
      await loadOverview();
    } catch (e) { setError(e.message); }
  }

  function download(path) {
    window.open(`${path}?${filterQuery}`, '_blank');
  }

  return (
    <div>
      <div className="filter-row" style={{ marginBottom: 8 }}>
        <button onClick={openCreateOrder}>新建工厂订单</button>
        <button onClick={() => download('/api/exports/orders.xlsx')}>导出 Excel</button>
        <button onClick={() => download('/api/exports/overview.pdf')}>导出 PDF</button>
      </div>

      <section className="filters">
        <div className="filter-row">
          <label>工厂：<input value={filters.factoryName} onChange={(e) => setFilters((f) => ({ ...f, factoryName: e.target.value }))} placeholder="输入工厂名" /></label>
          <label>SKU：<input value={filters.sku} onChange={(e) => setFilters((f) => ({ ...f, sku: e.target.value }))} placeholder="输入SKU" /></label>
          <label>品牌：<input value={filters.brand} onChange={(e) => setFilters((f) => ({ ...f, brand: e.target.value }))} placeholder="输入品牌" /></label>
          <label>状态：
            <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
              <option value="">全部</option>
              {ORDER_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
        <div className="filter-row">
          <label>下单起：<input type="date" value={filters.orderFrom} onChange={(e) => setFilters((f) => ({ ...f, orderFrom: e.target.value }))} /></label>
          <label>下单止：<input type="date" value={filters.orderTo} onChange={(e) => setFilters((f) => ({ ...f, orderTo: e.target.value }))} /></label>
          <label>交期起：<input type="date" value={filters.deliveryFrom} onChange={(e) => setFilters((f) => ({ ...f, deliveryFrom: e.target.value }))} /></label>
          <label>交期止：<input type="date" value={filters.deliveryTo} onChange={(e) => setFilters((f) => ({ ...f, deliveryTo: e.target.value }))} /></label>
          <button onClick={loadOrders}>刷新</button>
        </div>
      </section>

      {overview && (
        <section className="overview">
          <h3>汇总</h3>
          <div className="overview-grid">
            <div>订单数：{overview.orderCount}</div>
            <div>总下单量：{overview.orderedQuantity}</div>
            <div>已发货量：{overview.shippedQuantity}</div>
            <div>剩余量：{overview.remainingQuantity}</div>
            <div>总金额：{overview.orderedAmount?.toFixed?.(2) ?? ''}</div>
          </div>
        </section>
      )}

      {error && <div className="error">错误：{error}</div>}

      <section className="main">
        {/* 左侧订单列表 */}
        <div className="orders-panel">
          <h3>订单列表</h3>
          {loading ? <div>加载中...</div> : (
            <table className="table">
              <thead>
                <tr><th>工厂</th><th>SKU</th><th>品牌</th><th>下单日期</th><th>状态</th><th>总量</th><th>已发</th><th>剩余</th><th>预计生产(天)</th><th>交期</th><th>操作</th></tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const skus = o.items?.map(it => it.sku).join(', ') || '-';
                  const brands = [...new Set(o.items?.map(it => it.brand).filter(b => b))].join(', ') || '-';
                  return (
                  <tr key={o._id} className={selectedOrder?._id === o._id ? 'row-selected' : ''}>
                    <td>{o.factoryName}</td>
                    <td style={{ fontSize: 10, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={skus}>{skus}</td>
                    <td style={{ fontSize: 10 }}>{brands}</td>
                    <td style={{ fontSize: 11 }}>{formatDate(o.orderDate)}</td>
                    <td><span className={`status-badge status-${o.status}`}>{o.status}</span></td>
                    <td>{o.orderedQuantity}</td>
                    <td>{o.shippedQuantity}</td>
                    <td>{o.remainingQuantity}</td>
                    <td>{o.estimatedProductionDays || '-'}</td>
                    <td style={{ fontSize: 10 }}>{o.deliveryDate ? formatDate(o.deliveryDate) : '-'}</td>
                    <td>
                      <button onClick={() => openOrderDetail(o._id)} style={{ marginRight: 4 }}>详情</button>
                      <button onClick={() => deleteOrder(o._id, o.factoryName)} style={{ background: '#dc3545', color: '#fff', fontSize: 12 }}>删除</button>
                    </td>
                  </tr>
                  );
                })}
                {orders.length === 0 && <tr><td colSpan={11} style={{ textAlign: 'center' }}>暂无数据</td></tr>}
              </tbody>
            </table>
          )}
        </div>

        {/* 右侧详情 */}
        <div className="detail-panel">
          {selectedOrder ? (
            <>
              <h3>订单详情</h3>
              <div className="detail-block">
                <div>工厂：{selectedOrder.factoryName}</div>
                <div>下单日期：{formatDate(selectedOrder.orderDate)}</div>
                <div>预计生产：{selectedOrder.estimatedProductionDays || 0} 天</div>
                {selectedOrder.deliveryDate && <div>交期：{formatDate(selectedOrder.deliveryDate)}</div>}
                <div>状态：{selectedOrder.status}</div>
                <div>备注：{selectedOrder.notes}</div>
              </div>

              <h4>产品明细</h4>
              <table className="table small">
                <thead><tr><th>SKU</th><th>名称</th><th>颜色</th><th>尺码</th><th>数量</th><th>单价</th></tr></thead>
                <tbody>
                  {selectedOrder.items.map((it, idx) => (
                    <tr key={idx}><td>{it.sku}</td><td>{it.productName}</td><td>{it.color}</td><td>{it.size}</td><td>{it.quantity}</td><td>{it.unitPrice}</td></tr>
                  ))}
                </tbody>
              </table>

              <h4>发货记录</h4>
              <table className="table small">
                <thead><tr><th>日期</th><th>承运商</th><th>运单号</th><th>明细</th></tr></thead>
                <tbody>
                  {shipments.map((s) => (
                    <tr key={s._id}>
                      <td>{formatDate(s.shippedAt)}</td>
                      <td>{s.logistics?.carrier}</td>
                      <td>{s.logistics?.trackingNo}</td>
                      <td>{s.lines.map((l) => `${l.sku} x${l.quantity}`).join('；')}</td>
                    </tr>
                  ))}
                  {shipments.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center' }}>暂无发货</td></tr>}
                </tbody>
              </table>

              <h4>新建发货单</h4>
              <div className="form">
                <div className="form-row">
                  <label>发货日期：<input type="date" value={shipmentForm.shippedAt} onChange={(e) => setShipmentForm((f) => ({ ...f, shippedAt: e.target.value }))} /></label>
                </div>
                {shipmentForm.lines.map((l, idx) => (
                  <div className="form-row" key={idx}>
                    <label>SKU：
                      <select value={l.sku} onChange={(e) => updateShipmentLine(idx, 'sku', e.target.value)}>
                        <option value="">-- 选择 --</option>
                        {selectedOrder.items.map((it) => (
                          <option key={it.sku} value={it.sku}>{it.sku} - {it.productName}</option>
                        ))}
                      </select>
                    </label>
                    <label>数量：<input type="number" value={l.quantity} onChange={(e) => updateShipmentLine(idx, 'quantity', Number(e.target.value))} /></label>
                  </div>
                ))}
                <button type="button" onClick={addShipmentLine}>+ 添加一行</button>
                <div className="form-row">
                  <label>承运商：<input value={shipmentForm.logistics.carrier} onChange={(e) => setShipmentForm((f) => ({ ...f, logistics: { ...f.logistics, carrier: e.target.value } }))} /></label>
                  <label>运单号：<input value={shipmentForm.logistics.trackingNo} onChange={(e) => setShipmentForm((f) => ({ ...f, logistics: { ...f.logistics, trackingNo: e.target.value } }))} /></label>
                </div>
                <div className="form-row">
                  <label>备注：<input value={shipmentForm.logistics.note} onChange={(e) => setShipmentForm((f) => ({ ...f, logistics: { ...f.logistics, note: e.target.value } }))} /></label>
                </div>
                <button type="button" onClick={submitShipment}>提交发货</button>
              </div>
            </>
          ) : (
            <div className="empty-detail">请选择左侧订单查看详情</div>
          )}
        </div>
      </section>

      {/* 新建订单弹窗：从产品库选择 */}
      {creatingOrder && (
        <div className="modal-backdrop" onClick={() => setCreatingOrder(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>新建工厂订单</h2>
            <div className="form">
              <div className="form-row">
                <label>选择工厂：
                  <select value={orderForm.factoryName} onChange={(e) => setOrderForm((f) => ({ ...f, factoryName: e.target.value }))}>
                    <option value="">-- 请选择工厂 --</option>
                    {allFactories.map((fac) => <option key={fac._id} value={fac.name}>{fac.name}</option>)}
                  </select>
                </label>
                <label>下单日期：<input type="date" value={orderForm.orderDate} onChange={(e) => setOrderForm((f) => ({ ...f, orderDate: e.target.value }))} required /></label>
                <label>预计生产(天)：<input type="number" value={orderForm.estimatedProductionDays} onChange={(e) => setOrderForm((f) => ({ ...f, estimatedProductionDays: e.target.value }))} style={{ width: 80 }} /></label>
                <label>交期（可选）：<input type="date" value={orderForm.deliveryDate} onChange={(e) => setOrderForm((f) => ({ ...f, deliveryDate: e.target.value }))} /></label>
                <label>状态：
                  <select value={orderForm.status} onChange={(e) => setOrderForm((f) => ({ ...f, status: e.target.value }))}>
                    {ORDER_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              </div>
              {allFactories.length === 0 && (
                <div style={{ color: '#f60', fontSize: 12, marginBottom: 8 }}>
                  暂无工厂，请先在「工厂管理」中添加
                </div>
              )}

              <h3>从产品库添加</h3>
              <div style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="搜索 SKU / 产品名称 / 品牌"
                  value={productSearchKeyword}
                  onChange={(e) => setProductSearchKeyword(e.target.value)}
                  style={{ width: 300, padding: 4 }}
                />
              </div>
              <div className="product-picker">
                {allProducts.length === 0 ? (
                  <div style={{ color: '#888', fontSize: 12 }}>暂无产品，请先在「产品管理」中添加</div>
                ) : (
                  <table className="table small">
                    <thead>
                      <tr><th>图片</th><th>SKU</th><th>名称</th><th>品牌</th><th>颜色</th><th>尺寸</th><th>单价</th><th>操作</th></tr>
                    </thead>
                    <tbody>
                      {allProducts
                        .filter((p) => {
                          if (!productSearchKeyword) return true;
                          const kw = productSearchKeyword.toLowerCase();
                          return (
                            p.sku.toLowerCase().includes(kw) ||
                            p.productName.toLowerCase().includes(kw) ||
                            (p.brand || '').toLowerCase().includes(kw)
                          );
                        })
                        .map((p) => (
                        <tr key={p._id}>
                          <td>
                            {p.imageUrl ? (
                              <img src={getImageURL(p.imageUrl)} alt={p.productName} style={{ width: 30, height: 30, objectFit: 'cover', borderRadius: 3 }} />
                            ) : (
                              <div style={{ width: 30, height: 30, background: '#f0f0f0', borderRadius: 3 }} />
                            )}
                          </td>
                          <td>{p.sku}</td>
                          <td>{p.productName}</td>
                          <td>{p.brand}</td>
                          <td>{p.color}</td>
                          <td>{p.size}</td>
                          <td>{p.unitPrice}</td>
                          <td><button onClick={() => addProductToOrder(p)}>+ 添加</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <h3>已选产品（可修改数量和单价）</h3>
              {orderForm.items.length === 0 ? (
                <div style={{ color: '#888', fontSize: 12 }}>请从上方产品库点击"添加"</div>
              ) : (
                <table className="table small">
                  <thead>
                    <tr><th>SKU</th><th>名称</th><th>颜色</th><th>尺寸</th><th>数量</th><th>单价</th><th>操作</th></tr>
                  </thead>
                  <tbody>
                    {orderForm.items.map((it, idx) => (
                      <tr key={idx}>
                        <td>{it.sku}</td>
                        <td>{it.productName}</td>
                        <td>{it.color}</td>
                        <td>{it.size}</td>
                        <td>
                          <input type="number" value={it.quantity} style={{ width: 60 }}
                            onChange={(e) => updateOrderItem(idx, 'quantity', e.target.value)} />
                        </td>
                        <td>
                          <input type="number" value={it.unitPrice} style={{ width: 70 }}
                            onChange={(e) => updateOrderItem(idx, 'unitPrice', e.target.value)} />
                        </td>
                        <td><button onClick={() => removeOrderItem(idx)}>移除</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="form-row">
                <label>备注：<input value={orderForm.notes} onChange={(e) => setOrderForm((f) => ({ ...f, notes: e.target.value }))} style={{ width: 300 }} /></label>
              </div>
              <div className="modal-actions">
                <button onClick={submitOrder}>提交订单</button>
                <button onClick={() => setCreatingOrder(false)}>取消</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
