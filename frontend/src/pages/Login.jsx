import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Shield, Terminal, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.login(form);
      login(res.data.token, res.data.user);
      navigate('/challenges');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-nkt-bg bg-grid flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(0,255,136,0.03) 0%, transparent 70%)' }} />

      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <Shield size={56} className="text-nkt-green" style={{ filter: 'drop-shadow(0 0 20px rgba(0,255,136,0.6))' }} />
          </div>
          <h1 className="font-display text-3xl font-bold neon-text glitch" data-text="NKTCTF">NKTCTF</h1>
          <p className="text-nkt-muted text-xs font-mono tracking-[0.3em] mt-2">WHERE HACKERS RISE</p>
          <p className="text-nkt-muted/40 text-[10px] font-mono mt-1">🇲🇷 NOUAKCHOTT</p>
        </div>

        <div className="bg-nkt-card border border-nkt-border rounded-lg p-8 relative">
          <div className="flex items-center gap-2 mb-6">
            <Terminal size={16} className="text-nkt-green" />
            <span className="font-mono text-xs text-nkt-muted tracking-wider">USER_AUTH</span>
            <span className="ml-auto w-2 h-2 rounded-full bg-nkt-green animate-pulse" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">USERNAME</label>
              <input
                type="text"
                className="nkt-input w-full px-4 py-3 rounded text-sm"
                placeholder="h4cker_name"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">PASSWORD</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="nkt-input w-full px-4 py-3 rounded text-sm pr-12"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-nkt-muted hover:text-nkt-green transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-nkt-red/10 border border-nkt-red/30 rounded px-3 py-2">
                <span className="text-nkt-red text-xs font-mono">❌ {error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="nkt-btn nkt-btn-solid w-full py-3 rounded text-sm">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border border-nkt-bg border-t-transparent rounded-full animate-spin" />
                  CONNECTING...
                </span>
              ) : '[ ACCESS SYSTEM ]'}
            </button>
          </form>

          <p className="text-center text-xs font-mono text-nkt-muted mt-6">
            Pas de compte ?{' '}
            <Link to="/register" className="text-nkt-green hover:underline">REGISTER</Link>
          </p>
        </div>

        <p className="text-center text-[10px] font-mono text-nkt-muted/40 mt-6">
          NKTCTF © 2025 — Nouakchott, Mauritania 🇲🇷
        </p>
      </div>
    </div>
  );
}