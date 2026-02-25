import { useState, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const [showMobile, setShowMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 992) setShowMobile(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (showMobile && window.innerWidth < 992) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showMobile]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar
        onToggleMobile={() => setShowMobile(prev => !prev)}
        onToggleCollapse={() => setCollapsed(prev => !prev)}
        collapsed={collapsed}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar
          showMobile={showMobile}
          onHideMobile={() => setShowMobile(false)}
          collapsed={collapsed}
        />

        <main
          style={{
            flex: 1,
            overflowX: 'hidden',
            overflowY: 'auto',
            background: '#f4f2f8',
            minWidth: 0,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <Container fluid className="p-3 p-md-4">
            {children}
          </Container>
        </main>
      </div>
    </div>
  );
};

export default Layout;