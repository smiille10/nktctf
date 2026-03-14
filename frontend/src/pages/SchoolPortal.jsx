import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { School, Mail, Lock, User, GraduationCap, ChevronLeft, Eye, EyeOff, AlertCircle } from 'lucide-react';
import api from '../api';

export default function SchoolPortal() {
  const { id } = useParams();
  const navigate  = useNavigate();
  const { login, user } = useAuth();

  const [school, setSchool]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [tab, setTab]           = useState('login');
  const [role, setRole]         = useState('student');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg]           = useState('');
  const [form, setForm]         = useState({ username: '', email: '', password: '', confirmPassword: '' });

  // Si déjà connecté à cette école, rediriger directement
  useEffect(() => {
    if (user && String(user.school_id) === String(id)) {
      if (user.school_role === 'teacher') navigate('/school/teacher', { replace: true });
      else navigate('/school/student', { replace: true });
    }
  }, [user, id]);

  useEffect(() => {
    api.get(`/schools/public/${id}`)
      .then(r => { setSchool(r.data); setLoading(false); })
      .catch(err => {
        setError(err.response?.data?.error || 'École introuvable');
        setLoading(false);
      });
  }, [id]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg(''); setSubmitting(true);
    try {
      const r = await api.post(`/schools/portal/${id}/login`, { email: form.email, password: form.password });
      login(r.data.token, r.data.user);
      if (r.data.user.school_role === 'teacher') navigate('/school/teacher');
      else navigate('/school/student');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Erreur connexion');
    } finally { setSubmitting(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMsg('');
    if (form.password !== form.confirmPassword) return setMsg('Les mots de passe ne correspondent pas');
    if (form.password.length < 6) return setMsg('Minimum 6 caractères');
    setSubmitting(true);
    try {
      const r = await api.post(`/schools/portal/${id}/register`, {
        username: form.username, email: form.email, password: form.password, role,
      });
      login(r.data.token, r.data.user);
      if (role === 'teacher') navigate('/school/teacher');
      else navigate('/school/student');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Erreur inscription');
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-nkt-bg flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-nkt-bg flex flex-col items-center justify-center p-4">
      <AlertCircle size={40} className="text-nkt-red mb-4" />
      <p className="font-mono text-sm text-nkt-muted mb-6">{error}</p>
      <button onClick={() => navigate('/school')} className="flex items-center gap-2 font-mono text-sm text-nkt-muted hover:text-nkt-text">
        <ChevronLeft size={14} /> Retour aux écoles
      </button>
    </div>
  );

  const placeholder = school.allowed_domain ? `nom@${school.allowed_domain}` : 'votre@email.com';

  return (
    <div className="min-h-screen bg-nkt-bg bg-grid flex flex-col items-center justify-center px-4 py-12">

      {/* Back */}
      <button onClick={() => navigate('/school')}
        className="flex items-center gap-2 text-nkt-muted hover:text-nkt-text font-mono text-xs mb-8 transition-colors self-start max-w-md w-full mx-auto">
        <ChevronLeft size={14} /> Toutes les écoles
      </button>

      <div className="w-full max-w-md">

        {/* Header école */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border border-purple-500/40 bg-purple-500/10 mb-4"
            style={{ boxShadow: '0 0 30px rgba(168,85,247,0.2)' }}>
            <span className="font-display text-2xl font-bold text-purple-400">
              {school.name[0].toUpperCase()}
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold text-nkt-text mb-1">{school.name}</h1>
          {school.city && <p className="font-mono text-xs text-nkt-muted">{school.city}, {school.country}</p>}
          {school.allowed_domain && (
            <div className="inline-flex items-center gap-1.5 mt-3 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5">
              <Mail size={11} className="text-purple-400" />
              <span className="font-mono text-[11px] text-purple-300 font-bold">@{school.allowed_domain} uniquement</span>
            </div>
          )}
        </div>

        {/* Card */}
        <div className="bg-nkt-card border border-nkt-border rounded-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent" />

          {/* Tabs */}
          <div className="flex border-b border-nkt-border">
            {[
              { id: 'login',    label: 'SE CONNECTER' },
              { id: 'register', label: "S'INSCRIRE"   },
            ].map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setMsg(''); }}
                className={`flex-1 py-4 text-xs font-mono font-bold tracking-widest transition-all ${
                  tab === t.id
                    ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-500/5'
                    : 'text-nkt-muted hover:text-nkt-text'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6">

            {msg && (
              <div className="mb-4 p-3 rounded-lg border border-nkt-red/30 bg-nkt-red/10 font-mono text-xs text-nkt-red flex items-start gap-2">
                <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                {msg}
              </div>
            )}

            {/* ── LOGIN ── */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-nkt-muted tracking-widest mb-1.5">EMAIL</label>
                  <div className="relative">
                    <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nkt-muted" />
                    <input type="email" required autoFocus
                      className="nkt-input w-full pl-9 pr-4 py-3 rounded-lg font-mono text-sm"
                      placeholder={placeholder}
                      value={form.email}
                      onChange={e => set('email', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-nkt-muted tracking-widest mb-1.5">MOT DE PASSE</label>
                  <div className="relative">
                    <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nkt-muted" />
                    <input type={showPass ? 'text' : 'password'} required
                      className="nkt-input w-full pl-9 pr-10 py-3 rounded-lg font-mono text-sm"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={e => set('password', e.target.value)} />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-nkt-muted hover:text-nkt-text">
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={submitting}
                  className="w-full py-3 rounded-lg font-mono text-sm font-bold transition-all disabled:opacity-50"
                  style={{ background: '#a855f7', color: '#fff', boxShadow: '0 0 20px rgba(168,85,247,0.3)' }}>
                  {submitting ? '...' : 'SE CONNECTER'}
                </button>
                <p className="text-center font-mono text-xs text-nkt-muted">
                  Pas encore inscrit ?{' '}
                  <button type="button" onClick={() => setTab('register')} className="text-purple-400 hover:text-purple-300 underline">
                    S'inscrire
                  </button>
                </p>
              </form>
            )}

            {/* ── REGISTER ── */}
            {tab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">

                {/* Rôle */}
                <div>
                  <label className="block text-[10px] font-mono text-nkt-muted tracking-widest mb-2">JE SUIS</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'student', label: 'Étudiant',   icon: User,          desc: 'Cours & examens' },
                      { id: 'teacher', label: 'Enseignant', icon: GraduationCap, desc: 'Gère la classe'   },
                    ].map(r => (
                      <button key={r.id} type="button" onClick={() => setRole(r.id)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          role === r.id ? 'border-purple-500/60 bg-purple-500/10' : 'border-nkt-border hover:border-purple-500/20'
                        }`}>
                        <r.icon size={16} className={`mb-1 ${role === r.id ? 'text-purple-400' : 'text-nkt-muted'}`} />
                        <p className={`font-mono text-xs font-bold ${role === r.id ? 'text-purple-300' : 'text-nkt-text'}`}>{r.label}</p>
                        <p className="font-mono text-[10px] text-nkt-muted">{r.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-nkt-muted tracking-widest mb-1.5">NOM D'UTILISATEUR</label>
                  <div className="relative">
                    <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nkt-muted" />
                    <input type="text" required
                      className="nkt-input w-full pl-9 pr-4 py-3 rounded-lg font-mono text-sm"
                      placeholder="username"
                      value={form.username}
                      onChange={e => set('username', e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-nkt-muted tracking-widest mb-1.5">EMAIL</label>
                  <div className="relative">
                    <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nkt-muted" />
                    <input type="email" required
                      className="nkt-input w-full pl-9 pr-4 py-3 rounded-lg font-mono text-sm"
                      placeholder={placeholder}
                      value={form.email}
                      onChange={e => set('email', e.target.value)} />
                  </div>
                  {school.allowed_domain && (
                    <p className="font-mono text-[10px] text-purple-400/80 mt-1">⚠️ Doit être @{school.allowed_domain}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-nkt-muted tracking-widest mb-1.5">MOT DE PASSE</label>
                  <div className="relative">
                    <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nkt-muted" />
                    <input type={showPass ? 'text' : 'password'} required
                      className="nkt-input w-full pl-9 pr-10 py-3 rounded-lg font-mono text-sm"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={e => set('password', e.target.value)} />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-nkt-muted hover:text-nkt-text">
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-nkt-muted tracking-widest mb-1.5">CONFIRMER MOT DE PASSE</label>
                  <div className="relative">
                    <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nkt-muted" />
                    <input type={showPass ? 'text' : 'password'} required
                      className="nkt-input w-full pl-9 pr-4 py-3 rounded-lg font-mono text-sm"
                      placeholder="••••••••"
                      value={form.confirmPassword}
                      onChange={e => set('confirmPassword', e.target.value)} />
                  </div>
                </div>

                <button type="submit" disabled={submitting}
                  className="w-full py-3 rounded-lg font-mono text-sm font-bold transition-all disabled:opacity-50"
                  style={{ background: '#a855f7', color: '#fff', boxShadow: '0 0 20px rgba(168,85,247,0.3)' }}>
                  {submitting ? '...' : `S'INSCRIRE COMME ${role === 'teacher' ? 'ENSEIGNANT' : 'ÉTUDIANT'}`}
                </button>

                <p className="text-center font-mono text-xs text-nkt-muted">
                  Déjà inscrit ?{' '}
                  <button type="button" onClick={() => setTab('login')} className="text-purple-400 hover:text-purple-300 underline">
                    Se connecter
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>

        <p className="text-center font-mono text-[10px] text-nkt-muted/40 mt-6">
          {school.student_count} étudiant{school.student_count !== 1 ? 's' : ''} · {school.teacher_count} enseignant{school.teacher_count !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}