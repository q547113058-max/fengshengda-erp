// 后台预加载其他页面模块，登录页渲染完成后调用
// 浏览器会缓存这些模块，后续路由切换即时渲染

export function preloadPages() {
  // 用 requestIdleCallback 或 setTimeout 延迟执行，不阻塞首屏
  const trigger = () => {
    // 后台 import，不 await — 纯触发网络缓存
    import('../pages/Dashboard');
    import('../pages/Products');
    import('../pages/ProductDetail');
    import('../pages/Purchase');
    import('../pages/Suppliers');
    import('../pages/Inventory');
    import('../pages/BatchDetail');
    import('../pages/Movements');
    import('../pages/Media');
    import('../pages/Sales');
    import('../pages/Customers');
    import('../pages/CustomerDetail');
    import('../pages/Salesman');
    import('../pages/Commission');
    import('../pages/FinanceReceive');
    import('../pages/FinancePay');
    import('../pages/AccountLedger');
    import('../pages/UserSettings');
    import('../layouts/MainLayout');
  };

  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(trigger, { timeout: 2000 });
  } else {
    setTimeout(trigger, 1000);
  }
}
