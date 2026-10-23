import { Navigate, Route, Routes } from 'react-router-dom';
import { Landing } from './Landing';
import { VendorApp } from '@/vendor/VendorApp';
import { ProcurementLayout } from '@/procurement/ProcurementLayout';
import { Dashboard } from '@/procurement/Dashboard';
import { Queue } from '@/procurement/Queue';
import { VendorReview } from '@/procurement/Review';
import { Vendors } from '@/procurement/Vendors';
import { CountryRules } from '@/procurement/CountryRules';
import { ToastProvider } from '@/components/Toast';
import { TourProvider } from './Tour';
import { Settings } from '@/procurement/Settings';
import { Outbox } from '@/procurement/Outbox';
import { NotFound } from './NotFound';

export default function App() {
  return (
    <ToastProvider>
      <TourProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/vendor/:inviteId" element={<VendorApp />} />
        <Route path="/procurement" element={<ProcurementLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="queue" element={<Queue />} />
          <Route path="vendors" element={<Vendors />} />
          <Route path="countries" element={<CountryRules />} />
          <Route path="settings" element={<Settings />} />
          <Route path="outbox" element={<Outbox />} />
          <Route path="vendors/:id" element={<VendorReview />} />
          <Route path="vendors/:id/:tab" element={<VendorReview />} />
        </Route>
        <Route path="home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </TourProvider>
    </ToastProvider>
  );
}
