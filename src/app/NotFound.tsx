import { Link } from 'react-router-dom';
import { LensMark } from '@/components/LensMark';

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-greige p-8 text-center">
      <LensMark size={56} />
      <h1 className="mt-6 text-3xl">That page isn't <span className="accent">in focus.</span></h1>
      <p className="mt-2 max-w-md text-sm text-body">The link may be old or mistyped. Vendors: use the invitation link from your email. Procurement: start from the console.</p>
      <div className="mt-6 flex gap-2">
        <Link to="/" className="btn-secondary">Home</Link>
        <Link to="/procurement" className="btn-primary">Open console</Link>
      </div>
    </div>
  );
}
