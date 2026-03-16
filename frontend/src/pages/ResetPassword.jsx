import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Shield, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import api from '../api';

export default function ResetPassword() {
  const [searchParams]          = useSearchParams();
  const navigate                = useNavigate();
  const token                   = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (!token) setError('Lien invalide — aucun token trouvé.');
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas');
    if (password.length < 6)  return setError('Minimum 6 caractères');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Lien invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-nkt-bg bg-grid flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3">
            <Shield size={32} className="text-nkt-green" style={{ filter: 'drop-shadow(0 0 8px rgba(0,255,136,0.6))' }} />
            <div className="text-left">
              <div>
                <span className="font-display text-2xl font-bold neon-text">NKT</span>
                <span className="font-display text-2xl font-bold text-nkt-text">CTF</span>
              </div>
              <p className="text-[9px] text-nkt-muted font-mono tracking-widest">WHERE HACKERS RISE</p>
            </div>
          </Link>
        </div>

        <div className="bg-nkt-card border border-nkt-border rounded-xl overflow-hidden relative">
          <div className="h-[2px] bg-gradient-to-r from-transparent via-nkt-green to-transparent" />

          <div className="p-8">
            {done ? (
              <div className="text-center py-4">
                <CheckCircle size={48} className="text-nkt-green mx-auto mb-4" />
                <h2 className="font-display text-xl font-bold text-nkt-text mb-2">Mot de passe changé !</h2>
                <p className="font-mono text-sm text-nkt-muted">Redirection vers le login dans 3 secondes...</p>
              </div>
            ) : error && !token ? (
              <div className="text-center py-4">
                <XCircle size={48} className="text-nkt-red mx-auto mb-4" />
                <h2 className="font-display text-xl font-bold text-nkt-text mb-2">Lien invalide</h2>
                <p className="font-mono text-sm text-nkt-muted mb-6">{error}</p>
                <Link to="/forgot-password" className="nkt-btn nkt-btn-solid px-6 py-3 rounded font-mono text-sm">
                  Nouveau lien
                </Link>
              </div>
            ) : (
              <>
                <h2 className="font-display text-xl font-bold text-nkt-text mb-1">Nouveau mot de passe</h2>
                <p className="font-mono text-xs text-nkt-muted mb-6">Choisis un mot de passe sécurisé.</p>

                {error && (
                  <div className="mb-4 p-3 rounded border border-nkt-red/30 bg-nkt-red/10 font-mono text-xs text-nkt-red">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono text-nkt-muted tracking-widest mb-1.5">NOUVEAU MOT DE PASSE</label>
                    <div className="relative">
                      <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nkt-muted" />
                      <input type={showPass ? 'text' : 'password'} required autoFocus
                        className="nkt-input w-full pl-9 pr-10 py-3 rounded font-mono text-sm"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)} />
                      <button type="button" onClick={() => setShowPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-nkt-muted hover:text-nkt-text">
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-nkt-muted tracking-widest mb-1.5">CONFIRMER</label>
                    <div className="relative">
                      <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nkt-muted" />
                      <input type={showPass ? 'text' : 'password'} required
                        className="nkt-input w-full pl-9 pr-4 py-3 rounded font-mono text-sm"
                        placeholder="••••••••"
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)} />
                    </div>
                    {confirm && password !== confirm && (
                      <p className="font-mono text-[10px] text-nkt-red mt-1">Les mots de passe ne correspondent pas</p>
                    )}
                  </div>

                  <button type="submit" disabled={loading}
                    className="nkt-btn nkt-btn-solid w-full py-3 rounded font-mono text-sm font-bold disabled:opacity-50">
                    {loading ? 'Sauvegarde...' : 'CHANGER LE MOT DE PASSE'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <div className="text-center mt-6">
          <Link to="/login" className="font-mono text-xs text-nkt-muted hover:text-nkt-text transition-colors">
            Retour au login
          </Link>
        </div>
      </div>
    </div>
  );
}