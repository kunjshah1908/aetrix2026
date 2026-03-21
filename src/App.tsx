import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import './styles.css';

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/history" element={<History />} />
    </Routes>
  </BrowserRouter>
);

export default App;
