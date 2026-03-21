import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import RegionalOfficerDashboard from './pages/RegionalOfficerDashboard';
import History from './pages/History';
import './styles.css';

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/regional" element={<RegionalOfficerDashboard />} />
      <Route path="/history" element={<History />} />
    </Routes>
  </BrowserRouter>
);

export default App;
