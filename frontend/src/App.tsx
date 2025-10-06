import { Outlet, Link, useNavigate } from 'react-router-dom';
import { getToken, logout } from './lib/api';

export default function App() {
  const token = getToken()
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-semibold">Personal Finance</Link>
          <nav className="flex gap-4 text-sm items-center">
            {token ? (
              <>
                <Link to="/dashboard">Dashboard</Link>
                <Link to="/transactions">Transactions</Link>
                <Link to="/upload">Import</Link>
                <button className="border px-2 py-1" onClick={() => logout()}>Logout</button>
              </>
            ) : (
              <>
                <button className="border px-2 py-1" onClick={() => navigate('/login')}>Login</button>
                <button className="border px-2 py-1" onClick={() => navigate('/register')}>Register</button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
