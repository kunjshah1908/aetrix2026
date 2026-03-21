import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import RegionalOfficerDashboard from './pages/RegionalOfficerDashboard';
import RegionalOfficerAuth from './pages/RegionalOfficerAuth';
import RequireRegionalAuth from './components/RequireRegionalAuth';
import CommandCenterAuth from './pages/CommandCenterAuth';
import RequireCommandCenterAuth from './components/RequireCommandCenterAuth';
import History from './pages/History';
import './styles.css';

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<CommandCenterAuth />} />
      <Route
        path="/dashboard/home"
        element={
          <RequireCommandCenterAuth>
            <Dashboard />
          </RequireCommandCenterAuth>
        }
      />
      <Route path="/regional" element={<RegionalOfficerAuth />} />
      <Route
        path="/regional/dashboard"
        element={
          <RequireRegionalAuth>
            <RegionalOfficerDashboard />
          </RequireRegionalAuth>
        }
      />
      <Route path="/history" element={<History />} />
    </Routes>
  </BrowserRouter>
);

export default App;
