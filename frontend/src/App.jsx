import React, { useState } from 'react';
import { OrdersPage } from './pages/OrdersPage';
import { ProductsPage } from './pages/ProductsPage';
import { FactoriesPage } from './pages/FactoriesPage';
import { InventoryPage } from './pages/InventoryPage';
import { ShipmentsPage } from './pages/ShipmentsPage';
import { FactoryHistoryPage } from './pages/FactoryHistoryPage';
import { SkuHistoryPage } from './pages/SkuHistoryPage';

const TABS = [
  { key: 'orders', label: '订单管理' },
  { key: 'products', label: '产品管理' },
  { key: 'factories', label: '工厂管理' },
  { key: 'inventory', label: '库存管理' },
  { key: 'shipments', label: '发货管理' },
  { key: 'factoryHistory', label: '工厂历史' },
  { key: 'skuHistory', label: 'SKU历史' }
];

export function App() {
  const [tab, setTab] = useState('orders');

  return (
    <div className="page">
      <header className="header">
        <h1>工厂订单管理系统</h1>
      </header>
      <nav className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="tab-content">
        {tab === 'orders' && <OrdersPage />}
        {tab === 'products' && <ProductsPage />}
        {tab === 'factories' && <FactoriesPage />}
        {tab === 'inventory' && <InventoryPage />}
        {tab === 'shipments' && <ShipmentsPage />}
        {tab === 'factoryHistory' && <FactoryHistoryPage />}
        {tab === 'skuHistory' && <SkuHistoryPage />}
      </div>
    </div>
  );
}
