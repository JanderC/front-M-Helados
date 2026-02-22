import { useState, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 992) setShowSidebar(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (showSidebar && window.innerWidth < 992) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showSidebar]);

  return (
    <div className="d-flex flex-column" style={{ minHeight: '100vh' }}>
      <Navbar onToggleSidebar={() => setShowSidebar(prev => !prev)} />

      <div className="d-flex flex-grow-1" style={{ minHeight: 0 }}>
        <Sidebar show={showSidebar} onHide={() => setShowSidebar(false)} />

        <main
          className="flex-grow-1"
          style={{
            overflowX: 'hidden',
            overflowY: 'auto',
            background: '#f4f2f8',
            minWidth: 0,
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