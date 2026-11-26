import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import { SessionProvider } from './context/SessionContext';
import { RequireApproved, RequireKind, RequireOrgAdmin } from './routes/guards';
import PortalShell from './components/PortalShell';

import Landing from './pages/Landing';
import Login from './pages/public/Login';
import PortalChooser from './pages/public/PortalChooser';
import Onboard from './pages/public/Onboard';

import Overview from './pages/org/Overview';
import Kyc from './pages/org/Kyc';
import Profile from './pages/org/Profile';
import Team from './pages/org/Team';

import Products, { NewProduct } from './pages/provider/Products';
import ProductDetail from './pages/provider/ProductDetail';
import AccessInbox from './pages/provider/AccessInbox';

import Catalogue from './pages/distributor/Catalogue';
import MyRequests from './pages/distributor/MyRequests';

import KycQueue from './pages/staff/KycQueue';
import AccessGrants from './pages/staff/AccessGrants';
import StaffAccounts from './pages/staff/StaffAccounts';

function NotFound() {
  return (
    <div className="boot-screen">
      <h1>Page not found</h1>
      <Link className="portal-button" to="/">Go home</Link>
    </div>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<PortalChooser mode="login" />} />
          <Route path="/onboard" element={<PortalChooser mode="onboard" />} />
          <Route path="/onboard/provider" element={<Onboard kind="provider" />} />
          <Route path="/onboard/distributor" element={<Onboard kind="distributor" />} />
          <Route path="/provider/login" element={<Login kind="provider" />} />
          <Route path="/distributor/login" element={<Login kind="distributor" />} />
          <Route path="/staff/login" element={<Login kind="staff" />} />

          <Route element={<RequireKind kind="provider" />}>
            <Route path="/provider" element={<PortalShell />}>
              <Route index element={<Overview />} />
              <Route path="kyc" element={<Kyc />} />
              <Route path="profile" element={<Profile />} />
              <Route element={<RequireOrgAdmin />}><Route path="team" element={<Team />} /></Route>
              <Route element={<RequireApproved />}>
                <Route path="products" element={<Products />} />
                <Route element={<RequireOrgAdmin />}><Route path="products/new" element={<NewProduct />} /></Route>
                <Route path="products/:id" element={<ProductDetail />} />
                <Route path="access" element={<AccessInbox />} />
              </Route>
            </Route>
          </Route>

          <Route element={<RequireKind kind="distributor" />}>
            <Route path="/distributor" element={<PortalShell />}>
              <Route index element={<Overview />} />
              <Route path="kyc" element={<Kyc />} />
              <Route path="profile" element={<Profile />} />
              <Route path="catalogue" element={<Catalogue />} />
              <Route element={<RequireOrgAdmin />}><Route path="team" element={<Team />} /></Route>
              <Route element={<RequireApproved />}>
                <Route path="access" element={<MyRequests />} />
              </Route>
            </Route>
          </Route>

          <Route element={<RequireKind kind="staff" />}>
            <Route path="/staff" element={<PortalShell />}>
              <Route index element={<KycQueue />} />
              <Route path="access" element={<AccessGrants />} />
              <Route path="accounts" element={<StaffAccounts />} />
            </Route>
          </Route>

          {/* Old paths from the previous portal */}
          <Route path="/kyc" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}
