import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../api';
import { Shield, Terminal, Eye, EyeOff, Mail, RefreshCw } from 'lucide-react';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authAPI.register(form);
      setRegistered(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur inscription');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendMsg('');
    try {
      await authAPI.resendVerification(form.email);
      setResendMsg('✅ Email renvoyé !');
    } catch (err) {
      setResendMsg('❌ ' + (err.response?.data?.error || 'Erreur'));
    } finally {
      setResendLoading(false);
    }
  };

  // PAGE D'ATTENTE après inscription
  if (registered) {
    return (
      <div className="min-h-screen bg-nkt-bg bg-grid flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,255,136,0.03) 0%, transparent 70%)' }} />

        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Mail size={56} className="text-nkt-green"
                  style={{ filter: 'drop-shadow(0 0 20px rgba(0,255,136,0.6))' }} />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-nkt-green rounded-full animate-pulse" />
              </div>
            </div>
            <h1 className="font-display text-2xl font-bold neon-text">CHECK YOUR EMAIL</h1>
            <p className="text-nkt-muted text-xs font-mono tracking-[0.2em] mt-2">VERIFICATION REQUIRED</p>
          </div>

          <div className="bg-nkt-card border border-nkt-border rounded-lg p-8 relative">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-nkt-green to-transparent" />

            <div className="flex items-center gap-2 mb-6">
              <Terminal size={16} className="text-nkt-green" />
              <span className="font-mono text-xs text-nkt-muted tracking-wider">EMAIL_VERIFICATION</span>
              <span className="ml-auto w-2 h-2 rounded-full bg-nkt-green animate-pulse" />
            </div>

            <div className="bg-nkt-green/5 border border-nkt-green/20 rounded-lg p-4 mb-6">
              <p className="text-nkt-text text-sm font-mono leading-relaxed">
                Un email de vérification a été envoyé à :
              </p>
              <p className="text-nkt-green font-mono font-bold mt-1">{form.email}</p>
            </div>

            <div className="space-y-3 mb-6">
              {[
                '1. Ouvre ta boîte mail',
                '2. Cherche un email de NKTCTF',
                '3. Clique sur le lien de vérification',
                '4. Tu seras redirigé automatiquement',
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded border border-nkt-green/30 bg-nkt-green/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-nkt-green text-[10px] font-bold">{i + 1}</span>
                  </div>
                  <p className="text-nkt-muted text-xs font-mono">{step.slice(3)}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-nkt-border pt-5">
              <p className="text-nkt-muted text-xs font-mono mb-3 text-center">
                Tu n'as pas reçu l'email ?
              </p>
              <button
                onClick={handleResend}
                disabled={resendLoading}
                className="nkt-btn w-full py-2.5 rounded text-xs flex items-center justify-center gap-2"
              >
                {resendLoading
                  ? <span className="w-3 h-3 border border-nkt-green border-t-transparent rounded-full animate-spin" />
                  : <RefreshCw size={13} />
                }
                RENVOYER L'EMAIL
              </button>
              {resendMsg && (
                <p className={`text-center text-xs font-mono mt-2 ${resendMsg.startsWith('✅') ? 'text-nkt-green' : 'text-nkt-red'}`}>
                  {resendMsg}
                </p>
              )}
            </div>
          </div>

          <p className="text-center text-xs font-mono text-nkt-muted mt-6">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-nkt-green hover:underline">LOGIN</Link>
          </p>
        </div>
      </div>
    );
  }

  // PAGE D'INSCRIPTION normale
  return (
    <div className="min-h-screen bg-nkt-bg bg-grid flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(0,255,136,0.03) 0%, transparent 70%)' }} />

      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <Shield size={56} className="text-nkt-green"
              style={{ filter: 'drop-shadow(0 0 20px rgba(0,255,136,0.6))' }} />
          </div>
          <h1 className="font-display text-3xl font-bold neon-text">NKTCTF</h1>
          <p className="text-nkt-muted text-xs font-mono tracking-[0.3em] mt-2">CREATE YOUR IDENTITY</p>
        </div>

        <div className="bg-nkt-card border border-nkt-border rounded-lg p-8 relative">
          <div className="flex items-center gap-2 mb-6">
            <Terminal size={16} className="text-nkt-green" />
            <span className="font-mono text-xs text-nkt-muted tracking-wider">NEW_USER_INIT</span>
            <span className="ml-auto w-2 h-2 rounded-full bg-nkt-green animate-pulse" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">USERNAME</label>
              <input type="text" className="nkt-input w-full px-4 py-3 rounded text-sm"
                placeholder="h4cker_name" value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">EMAIL</label>
              <input type="email" className="nkt-input w-full px-4 py-3 rounded text-sm"
                placeholder="hacker@nktctf.ma" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">PASSWORD</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'}
                  className="nkt-input w-full px-4 py-3 rounded text-sm pr-12"
                  placeholder="••••••••" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} required />
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

            <button type="submit" disabled={loading}
              className="nkt-btn nkt-btn-solid w-full py-3 rounded text-sm">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border border-nkt-bg border-t-transparent rounded-full animate-spin" />
                  REGISTERING...
                </span>
              ) : '[ JOIN THE ARENA ]'}
            </button>
          </form>

          <p className="text-center text-xs font-mono text-nkt-muted mt-6">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-nkt-green hover:underline">LOGIN</Link>
          </p>
        </div>
      </div>
    </div>
  );
}