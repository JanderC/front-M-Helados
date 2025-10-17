import { useState } from 'react';
import { Container } from 'react-bootstrap';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const [showSidebar, setShowSidebar] = useState(false);

  const handleToggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const handleCloseSidebar = () => {
    setShowSidebar(false);
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar onToggleSidebar={handleToggleSidebar} />
      
      <div className="d-flex flex-grow-1">
        <Sidebar show={showSidebar} onHide={handleCloseSidebar} />
        
        <main className="flex-grow-1" style={{ 
          overflowX: 'hidden',
          background: '#f8f9fa'
        }}>
          <Container fluid className="p-3 p-md-4">
            {children}
          </Container>
        </main>
      </div>
    </div>
  );
};

export default Layout;