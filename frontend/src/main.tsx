import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { PersistGate } from './components/PersistGate';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1e293b',
          colorInfo: '#059669',
          colorSuccess: '#059669',
          colorWarning: '#d97706',
          colorError: '#dc2626',
          borderRadius: 6,
          fontFamily: '"PingFang SC", "Microsoft YaHei", -apple-system, sans-serif',
          colorBgContainer: '#ffffff',
          colorBgLayout: '#f8fafc',
          colorBorder: '#e2e8f0',
          controlHeight: 36,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        },
        components: {
          Table: {
            headerBg: '#f1f5f9',
            rowHoverBg: '#f8fafc',
            borderColor: '#f1f5f9',
            headerBorderRadius: 6,
          },
          Card: {
            paddingLG: 20,
            borderRadiusLG: 6,
          },
          Modal: {
            borderRadiusLG: 8,
            titleFontSize: 16,
          },
          Menu: {
            itemBorderRadius: 6,
            itemSelectedBg: '#1e293b',
            itemSelectedColor: '#ffffff',
            itemHoverBg: 'rgba(217,119,6,0.06)',
            itemHoverColor: '#d97706',
          },
          Button: {
            primaryShadow: 'none',
            borderRadius: 6,
          },
          Tag: {
            borderRadiusSM: 4,
          },
        },
      }}
    >
      <AntApp>
        <BrowserRouter>
          <PersistGate>
            <App />
          </PersistGate>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
);
