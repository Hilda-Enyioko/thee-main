import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';

import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';
import PlanManagement from './pages/plans/PlanManagement';
import AccessRequests from './pages/distributor/AccessRequests';
import Analytics from './pages/analytics/Analytics';
import KycSubmission from './pages/kyc/KycSubmission';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/onboard" element={<Onboarding />} />
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/kyc" element={<KycSubmission />} />
            <Route element={<RoleRoute allow="provider" />}>
              <Route path="/plans" element={<PlanManagement />} />
            </Route>
            <Route element={<RoleRoute allow="distributor" />}>
              <Route path="/access-requests" element={<AccessRequests />} />
            </Route>
            <Route path="/analytics" element={<Analytics />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
