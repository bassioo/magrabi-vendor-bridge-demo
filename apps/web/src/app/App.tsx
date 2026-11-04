import { useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { setUnauthorizedHandler } from '@/api/client';
import { Landing } from './Landing';
import { Login } from './Login';
import { NotFound } from './NotFound';
import { StaffLayout } from '@/staff/StaffLayout';
import { Dashboard } from '@/staff/Dashboard';
import { Queue } from '@/staff/Queue';
import { VendorDetail } from '@/staff/VendorDetail';
import { SapVendors } from '@/staff/SapVendors';
import { Outbox } from '@/staff/Outbox';
import { Reports } from '@/staff/Reports';
import { Settings } from '@/staff/Settings';
import { VendorApp } from '@/vendor/VendorApp';

export default function App() {
  const navigate = useNavigate();
  useEffect(() => {
    setUnauthorizedHandler(() => navigate('/login', { replace: true, state: { from: window.location.pathname } }));
    return () => setUnauthorizedHandler(null);
  }, [navigate]);
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/app" element={<StaffLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="queue" element={<Queue />} />
        <Route path="vendors/:id" element={<VendorDetail />} />
        <Route path="vendors/:id/:tab" element={<VendorDetail />} />
        <Route path="sap" element={<SapVendors />} />
        <Route path="outbox" element={<Outbox />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/:section" element={<Settings />} />
      </Route>
      <Route path="/v/:token" element={<VendorApp />} />
      <Route path="/procurement/*" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
