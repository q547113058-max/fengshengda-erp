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
          colorPrimary: '#1a2018',
          colorInfo: '#2d4a3e',
          colorSuccess: '#2d4a3e',
          colorWarning: '#b8693a',
          colorError: '#7a2a2a',
          borderRadius: 2,
          fontFamily: '"DM Sans", -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
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
