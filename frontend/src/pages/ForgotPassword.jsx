import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Shield, ChevronLeft, CheckCircle } from 'lucide-react';
import api from '../api';

export default function ForgotPassword() {
  const [email, setEmail]       = useState('');
  const [sent, setSent]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur serveur');
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
            {!sent ? (
              <>
                <h2 className="font-display text-xl font-bold text-nkt-text mb-1">Mot de passe oublié</h2>
                <p className="font-mono text-xs text-nkt-muted mb-6">
                  Entre ton email et on t'envoie un lien de réinitialisation.
                </p>

                {error && (
                  <div className="mb-4 p-3 rounded border border-nkt-red/30 bg-nkt-red/10 font-mono text-xs text-nkt-red">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono text-nkt-muted tracking-widest mb-1.5">EMAIL</label>
                    <div className="relative">
                      <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nkt-muted" />
                      <input type="email" required autoFocus
                        className="nkt-input w-full pl-9 pr-4 py-3 rounded font-mono text-sm"
                        placeholder="ton@email.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)} />
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="nkt-btn nkt-btn-solid w-full py-3 rounded font-mono text-sm font-bold disabled:opacity-50">
                    {loading ? 'Envoi...' : 'ENVOYER LE LIEN'}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-4">
                <CheckCircle size={48} className="text-nkt-green mx-auto mb-4" />
                <h2 className="font-display text-xl font-bold text-nkt-text mb-2">Email envoyé !</h2>
                <p className="font-mono text-sm text-nkt-muted">
                  Si <span className="text-nkt-text">{email}</span> existe dans notre base, tu recevras un lien dans quelques minutes.
                </p>
                <p className="font-mono text-xs text-nkt-muted/60 mt-3">Le lien expire dans 1 heure.</p>
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-6">
          <Link to="/login" className="flex items-center justify-center gap-1 font-mono text-xs text-nkt-muted hover:text-nkt-text transition-colors">
            <ChevronLeft size={13} /> Retour au login
          </Link>
        </div>
      </div>
    </div>
  );
}