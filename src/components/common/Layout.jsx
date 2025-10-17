import { Container, Row, Col } from 'react-bootstrap';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="layout">
      <Navbar />
      <Row className="g-0">
        <Col xs="auto">
          <Sidebar />
        </Col>
        <Col>
          <Container fluid className="p-4">
            {children}
          </Container>
        </Col>
      </Row>
    </div>
  );
};

export default Layout;