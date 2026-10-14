import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
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
import PartnerProfile from './pages/PartnerProfile';
import ProviderAccessInbox from './pages/ProviderAccessInbox';
import PartnerSubscriptions from './pages/PartnerSubscriptions';
import ProviderClaims from './pages/ProviderClaims';
import StaffLogin from './pages/StaffLogin';
import StaffConsole from './pages/StaffConsole';
import StaffRoute from './routes/StaffRoute';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/onboard" element={<Onboarding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/staff/login" element={<StaffLogin />} />
          <Route element={<StaffRoute />}><Route path="/staff" element={<StaffConsole />} /></Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/kyc" element={<KycSubmission />} />
            <Route path="/profile" element={<PartnerProfile />} />
            <Route path="/subscriptions" element={<PartnerSubscriptions />} />
            <Route element={<RoleRoute allow="provider" />}>
              <Route path="/plans" element={<PlanManagement />} />
              <Route path="/access-inbox" element={<ProviderAccessInbox />} />
              <Route path="/claims" element={<ProviderClaims />} />
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
