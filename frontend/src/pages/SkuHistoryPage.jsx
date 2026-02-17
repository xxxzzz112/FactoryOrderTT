import React, { useState } from 'react';
import { api, formatDate } from '../api';

export function SkuHistoryPage() {
  const [sku, setSku] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!sku.trim()) { setError('请输入 SKU'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await api(`/api/history/sku?sku=${encodeURIComponent(sku.trim())}`);
      setData(res);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div className="filter-row" style={{ marginBottom: 12 }}>
        <label>SKU：<input value={sku} onChange={(e) => setSku(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') search(); }} /></label>
        <button onClick={search}>查询</button>
      </div>

      {error && <div className="error">错误：{error}</div>}
      {loading && <div>加载中...</div>}

      {data && (
        <div>
          <h3>SKU：{data.sku}</h3>
          <div className="overview-grid" style={{ marginBottom: 12 }}>
            <div>总下单量：{data.totalOrdered}</div>
            <div>总已发货：{data.totalShipped}</div>
            <div>总剩余量：{data.totalRemaining}</div>
          </div>

          <h4>相关订单（{data.data.length} 个）</h4>
          {data.data.map((o) => (
            <div key={o.orderId} className="history-card">
              <div className="history-card-header">
                <span>工厂：{o.factoryName}</span>
                <span>交货日期：{formatDate(o.deliveryDate)}</span>
                <span className={`status-badge status-${o.status}`}>{o.status}</span>
                <span>下单：{o.orderedQuantity} | 已发：{o.shippedQuantity} | 剩余：{o.remainingQuantity}</span>
              </div>

              <table className="table small">
                <thead><tr><th>SKU</th><th>名称</th><th>颜色</th><th>尺码</th><th>数量</th><th>单价</th></tr></thead>
                <tbody>
                  {o.skuItems.map((it, idx) => (
                    <tr key={idx}><td>{it.sku}</td><td>{it.productName}</td><td>{it.color}</td><td>{it.size}</td><td>{it.quantity}</td><td>{it.unitPrice}</td></tr>
                  ))}
                </tbody>
              </table>

              {o.shipments.length > 0 && (
                <>
                  <h5>发货记录</h5>
                  <table className="table small">
                    <thead><tr><th>日期</th><th>承运商</th><th>运单号</th><th>数量</th></tr></thead>
                    <tbody>
                      {o.shipments.map((s) => (
                        <tr key={s._id}>
                          <td>{formatDate(s.shippedAt)}</td>
                          <td>{s.logistics?.carrier}</td>
                          <td>{s.logistics?.trackingNo}</td>
                          <td>{s.lines.map((l) => l.quantity).join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          ))}
          {data.data.length === 0 && <div style={{ color: '#888' }}>该 SKU 暂无订单记录</div>}
        </div>
      )}
    </div>
  );
}
