import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowRight, X } from 'lucide-react';
import api from '../api';

export default function JoinSchool() {
  const navigate = useNavigate();
  const [code, setCode]     = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]       = useState('');
  const [success, setSuccess] = useState(null);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true); setMsg('');
    try {
      const r = await api.post('/schools/join', { code: code.trim().toUpperCase() });
      setSuccess(r.data);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="min-h-screen bg-nkt-bg bg-grid flex items-center justify-center px-4">
      <div className="bg-nkt-card border border-nkt-green/30 rounded-xl p-8 w-full max-w-md text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-nkt-green to-transparent" />
        <div className="w-16 h-16 rounded-full bg-nkt-green/10 border border-nkt-green/30 flex items-center justify-center mx-auto mb-4">
          <GraduationCap size={28} className="text-nkt-green" />
        </div>
        <h2 className="font-display text-xl font-bold text-nkt-text mb-2">Bienvenue !</h2>
        <p className="font-mono text-sm text-nkt-muted mb-1">Tu as rejoint</p>
        <p className="font-display text-2xl font-bold text-nkt-green mb-6">{success.school?.name}</p>
        <button onClick={() => navigate('/my-school')}
          className="nkt-btn nkt-btn-solid px-8 py-3 rounded-lg font-mono text-sm font-bold flex items-center gap-2 mx-auto">
          VOIR MON ESPACE <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-nkt-bg bg-grid flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-nkt-card border border-nkt-border rounded-xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent" />

          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)' }}>
              <GraduationCap size={26} style={{ color: '#a855f7' }} />
            </div>
            <h1 className="font-display text-2xl font-bold text-nkt-text">Rejoindre une École</h1>
            <p className="font-mono text-xs text-nkt-muted mt-2">Entre le code fourni par ton école</p>
          </div>

          {msg && (
            <div className="mb-4 p-3 rounded border bg-nkt-red/10 border-nkt-red/30 text-nkt-red font-mono text-sm flex items-center justify-between">
              <span>{msg}</span>
              <button onClick={() => setMsg('')}><X size={14} /></button>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">CODE D'ACCÈS</label>
              <input
                className="nkt-input w-full px-4 py-4 rounded-lg text-center text-2xl font-mono font-bold tracking-[0.5em] uppercase"
                placeholder="XXXX"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().slice(0, 8))}
                maxLength={8}
                required
              />
              <p className="text-[10px] font-mono text-nkt-muted mt-2 text-center">
                Code fourni par ton école ou ton professeur
              </p>
            </div>

            <button type="submit" disabled={loading || !code.trim()}
              className="w-full nkt-btn py-3 rounded-lg font-mono text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: '#a855f7', borderColor: '#a855f7', color: '#080d14' }}>
              {loading
                ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <><ArrowRight size={16} /> REJOINDRE</>
              }
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-nkt-border text-center">
            <p className="text-[11px] font-mono text-nkt-muted">
              Pas encore de compte ?{' '}
              <button onClick={() => navigate('/register')} className="text-nkt-green hover:underline">
                S'inscrire
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}