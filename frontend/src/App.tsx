import { Outlet, Link, useNavigate } from 'react-router-dom';
import { getToken, logout } from './lib/api';

export default function App() {
  const token = getToken()
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-slate-800 hover:text-blue-600 transition-colors">
            💰 Personal Finance
          </Link>
          <nav className="flex gap-2 text-sm items-center">
            {token ? (
              <>
                <Link to="/dashboard" className="px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-all font-medium">
                  Dashboard
                </Link>
                <Link to="/transactions" className="px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-all font-medium">
                  Transactions
                </Link>
                <Link to="/upload" className="px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-all font-medium">
                  Import
                </Link>
                <button 
                  className="ml-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-all font-medium"
                  onClick={() => logout()}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button 
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-all font-medium"
                  onClick={() => navigate('/login')}
                >
                  Login
                </button>
                <button 
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm hover:shadow-md font-medium"
                  onClick={() => navigate('/register')}
                >
                  Register
                </button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}