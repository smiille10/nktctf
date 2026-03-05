import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  User, Lock, Shield, Crown, Zap,
  Check, X, Eye, EyeOff, ArrowLeft,
  Trophy, Target, Edit2, Save
} from 'lucide-react';

const PLAN_INFO = {
  free: {
    label: 'FREE',
    color: '#4a6070',
    icon: Shield,
    price: 'Gratuit',
    features: [
      'Challenges publics uniquement',
      'Scoreboard global',
      'Events gratuits',
      'Support communauté',
    ],
  },
  pro: {
    label: 'PRO',
    color: '#00d4ff',
    icon: Zap,
    price: '$5/mois ou $40/an',
    features: [
      'Tous les challenges',
      'Events premium',
      'Badge PRO sur le profil',
      'Support basique',
    ],
  },
  elite: {
    label: 'ELITE',
    color: '#ffd700',
    icon: Crown,
    price: '$15/mois ou $100/an',
    features: [
      'Challenges exclusifs',
      'Events VIP',
      'Badge ELITE animé',
      'Certificats de complétion',
      'Support prioritaire',
    ],
  },
};

export default function Account() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [editUsername, setEditUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState('');

  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  const [stats, setStats] = useState({ solved: 0, rank: '—' });

  useEffect(() => {
    api.get('/profile/solved')
      .then(r => setStats(s => ({ ...s, solved: r.data.length })))
      .catch(() => {});
    api.get('/scoreboard')
      .then(r => {
        const idx = r.data.findIndex(u => u.username === user?.username);
        setStats(s => ({ ...s, rank: idx >= 0 ? idx + 1 : '—' }));
      })
      .catch(() => {});
  }, []);

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    if (!newUsername.trim() || newUsername.trim() === user?.username) return;
    setUsernameLoading(true);
    setUsernameMsg('');
    try {
      await api.patch('/auth/update-username', { username: newUsername.trim() });
      await refreshUser();
      setUsernameMsg('✅ Username mis à jour !');
      setEditUsername(false);
    } catch (err) {
      setUsernameMsg('❌ ' + (err.response?.data?.error || 'Erreur'));
    } finally {
      setUsernameLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) {
      setPwMsg('❌ Les mots de passe ne correspondent pas');
      return;
    }
    if (pwForm.newPw.length < 6) {
      setPwMsg('❌ Minimum 6 caractères');
      return;
    }
    setPwLoading(true);
    setPwMsg('');
    try {
      await api.patch('/auth/update-password', {
        current_password: pwForm.current,
        new_password: pwForm.newPw,
      });
      setPwMsg('✅ Mot de passe mis à jour !');
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch (err) {
      setPwMsg('❌ ' + (err.response?.data?.error || 'Mot de passe actuel incorrect'));
    } finally {
      setPwLoading(false);
    }
  };

  const plan = user?.plan || 'free';
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.free;
  const PlanIcon = planInfo.icon;

  return (
    <div className="min-h-screen bg-nkt-bg bg-grid pt-20 pb-12">
      <div className="max-w-2xl mx-auto px-4">

        {/* Back */}
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-nkt-muted hover:text-nkt-green transition-colors font-mono text-xs mb-6">
          <ArrowLeft size={14} /> BACK
        </button>

        <div className="mb-6">
          <p className="text-[11px] font-mono text-nkt-muted tracking-widest mb-1">USER_SETTINGS</p>
          <h1 className="font-display text-2xl font-bold text-nkt-text">Mon Compte</h1>
        </div>

        <div className="space-y-5">

          {/* ── APERÇU PROFIL ── */}
          <div className="bg-nkt-card border border-nkt-border rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px]"
              style={{ background: `linear-gradient(90deg, transparent, ${planInfo.color}, transparent)` }} />

            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-xl border-2 flex items-center justify-center"
                  style={{
                    borderColor: planInfo.color,
                    background: `${planInfo.color}15`,
                    boxShadow: `0 0 20px ${planInfo.color}25`,
                  }}>
                  <span className="font-display font-bold text-2xl" style={{ color: planInfo.color }}>
                    {user?.username?.[0]?.toUpperCase()}
                  </span>
                </div>
                <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-lg border-2 border-nkt-bg flex items-center justify-center"
                  style={{ background: planInfo.color }}>
                  <PlanIcon size={12} color="#080d14" />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-xl font-bold text-nkt-text">{user?.username}</h2>
                <p className="text-nkt-muted text-xs font-mono truncate mt-0.5">{user?.email}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border"
                    style={{ borderColor: planInfo.color, color: planInfo.color, background: `${planInfo.color}15` }}>
                    {planInfo.label} MEMBER
                  </span>
                  {(user?.role === 'superadmin' || user?.role === 'manager') && (
                    <span className="text-[10px] font-mono text-nkt-green border border-nkt-green/30 bg-nkt-green/10 px-2 py-0.5 rounded-full">
                      {user.role.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex-shrink-0 grid grid-cols-3 gap-3 text-center">
                <div className="bg-nkt-bg border border-nkt-border rounded-lg px-3 py-2">
                  <p className="font-display font-bold text-base" style={{ color: planInfo.color }}>
                    {user?.score || 0}
                  </p>
                  <p className="text-[9px] font-mono text-nkt-muted">PTS</p>
                </div>
                <div className="bg-nkt-bg border border-nkt-border rounded-lg px-3 py-2">
                  <p className="font-display font-bold text-base text-nkt-text">#{stats.rank}</p>
                  <p className="text-[9px] font-mono text-nkt-muted">RANK</p>
                </div>
                <div className="bg-nkt-bg border border-nkt-border rounded-lg px-3 py-2">
                  <p className="font-display font-bold text-base text-nkt-text">{stats.solved}</p>
                  <p className="text-[9px] font-mono text-nkt-muted">SOLVED</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── PLAN ACTUEL ── */}
          <div className="bg-nkt-card border border-nkt-border rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: `linear-gradient(90deg, transparent, ${planInfo.color}, transparent)` }} />

            <p className="text-[11px] font-mono text-nkt-muted tracking-widest mb-4">ABONNEMENT</p>

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg border flex items-center justify-center"
                    style={{ borderColor: planInfo.color, background: `${planInfo.color}15` }}>
                    <PlanIcon size={18} style={{ color: planInfo.color }} />
                  </div>
                  <div>
                    <p className="font-display text-lg font-bold" style={{ color: planInfo.color }}>
                      Plan {planInfo.label}
                    </p>
                    <p className="text-[10px] font-mono text-nkt-muted">{planInfo.price}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {planInfo.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check size={12} style={{ color: planInfo.color }} />
                      <span className="text-xs font-mono text-nkt-text">{f}</span>
                    </div>
                  ))}
                </div>

                {/* Ce qu'il n'a pas (si free) */}
                {plan === 'free' && (
                  <div className="mt-3 space-y-1">
                    {['Challenges exclusifs', 'Events premium', 'Badge spécial', 'Support prioritaire'].map((f, i) => (
                      <div key={i} className="flex items-center gap-2 opacity-40">
                        <X size={10} className="text-nkt-muted" />
                        <span className="text-xs font-mono text-nkt-muted line-through">{f}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {plan === 'free' && (
                <button
                  onClick={() => navigate('/pricing')}
                  className="flex-shrink-0 px-4 py-2.5 rounded-lg text-xs font-mono font-bold border transition-all hover:opacity-90"
                  style={{ borderColor: '#ffd700', color: '#ffd700', background: 'rgba(255,215,0,0.1)' }}>
                  <Crown size={12} className="inline mr-1.5" />
                  UPGRADE
                </button>
              )}
            </div>
          </div>

          {/* ── CHANGER USERNAME ── */}
          <div className="bg-nkt-card border border-nkt-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <User size={14} className="text-nkt-green" />
                <p className="text-[11px] font-mono text-nkt-muted tracking-widest">
                  NOM D'UTILISATEUR
                </p>
              </div>
              {!editUsername && (
                <button
                  onClick={() => { setEditUsername(true); setNewUsername(user?.username || ''); setUsernameMsg(''); }}
                  className="flex items-center gap-1.5 text-[11px] font-mono text-nkt-cyan hover:text-nkt-green transition-colors">
                  <Edit2 size={12} /> Modifier
                </button>
              )}
            </div>

            {!editUsername ? (
              <div className="flex items-center gap-3 bg-nkt-bg border border-nkt-border rounded-lg px-4 py-3">
                <User size={14} className="text-nkt-muted flex-shrink-0" />
                <span className="font-mono text-sm text-nkt-text">{user?.username}</span>
              </div>
            ) : (
              <form onSubmit={handleUsernameSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">
                    NOUVEAU USERNAME
                  </label>
                  <input
                    className="nkt-input w-full px-4 py-2.5 rounded-lg text-sm font-mono"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    placeholder="Nouveau username..."
                    minLength={3}
                    autoFocus
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={usernameLoading}
                    className="nkt-btn nkt-btn-solid px-5 py-2.5 rounded-lg text-sm flex items-center gap-2">
                    {usernameLoading
                      ? <span className="w-4 h-4 border-2 border-nkt-bg border-t-transparent rounded-full animate-spin" />
                      : <><Save size={13} /> SAUVEGARDER</>
                    }
                  </button>
                  <button type="button"
                    onClick={() => { setEditUsername(false); setUsernameMsg(''); }}
                    className="nkt-btn px-4 py-2.5 rounded-lg text-sm flex items-center gap-2">
                    <X size={13} /> ANNULER
                  </button>
                </div>
              </form>
            )}

            {usernameMsg && (
              <p className={`mt-3 text-xs font-mono ${usernameMsg.startsWith('✅') ? 'text-nkt-green' : 'text-nkt-red'}`}>
                {usernameMsg}
              </p>
            )}
          </div>

          {/* ── CHANGER MOT DE PASSE ── */}
          <div className="bg-nkt-card border border-nkt-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Lock size={14} className="text-nkt-green" />
              <p className="text-[11px] font-mono text-nkt-muted tracking-widest">
                MOT DE PASSE
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">

              {/* Actuel */}
              <div>
                <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">
                  MOT DE PASSE ACTUEL *
                </label>
                <div className="relative">
                  <input
                    type={showPw.current ? 'text' : 'password'}
                    className="nkt-input w-full px-4 py-2.5 rounded-lg text-sm font-mono pr-11"
                    placeholder="••••••••"
                    value={pwForm.current}
                    onChange={e => setPwForm({ ...pwForm, current: e.target.value })}
                    required
                  />
                  <button type="button"
                    onClick={() => setShowPw(v => ({ ...v, current: !v.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-nkt-muted hover:text-nkt-text transition-colors">
                    {showPw.current ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Nouveau */}
              <div>
                <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">
                  NOUVEAU MOT DE PASSE *
                </label>
                <div className="relative">
                  <input
                    type={showPw.newPw ? 'text' : 'password'}
                    className="nkt-input w-full px-4 py-2.5 rounded-lg text-sm font-mono pr-11"
                    placeholder="Min. 6 caractères"
                    value={pwForm.newPw}
                    onChange={e => setPwForm({ ...pwForm, newPw: e.target.value })}
                    required
                  />
                  <button type="button"
                    onClick={() => setShowPw(v => ({ ...v, newPw: !v.newPw }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-nkt-muted hover:text-nkt-text transition-colors">
                    {showPw.newPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirmer */}
              <div>
                <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">
                  CONFIRMER LE NOUVEAU MOT DE PASSE *
                </label>
                <div className="relative">
                  <input
                    type={showPw.confirm ? 'text' : 'password'}
                    className="nkt-input w-full px-4 py-2.5 rounded-lg text-sm font-mono pr-11"
                    placeholder="Répète le nouveau mot de passe"
                    value={pwForm.confirm}
                    onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
                    required
                  />
                  <button type="button"
                    onClick={() => setShowPw(v => ({ ...v, confirm: !v.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-nkt-muted hover:text-nkt-text transition-colors">
                    {showPw.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {pwForm.confirm && (
                  <p className={`mt-2 text-[10px] font-mono flex items-center gap-1 ${
                    pwForm.newPw === pwForm.confirm ? 'text-nkt-green' : 'text-nkt-red'
                  }`}>
                    {pwForm.newPw === pwForm.confirm
                      ? <><Check size={10} /> Les mots de passe correspondent</>
                      : <><X size={10} /> Ne correspondent pas</>
                    }
                  </p>
                )}
              </div>

              <button type="submit" disabled={pwLoading}
                className="nkt-btn nkt-btn-solid px-6 py-2.5 rounded-lg text-sm flex items-center gap-2">
                {pwLoading
                  ? <span className="w-4 h-4 border-2 border-nkt-bg border-t-transparent rounded-full animate-spin" />
                  : <><Lock size={13} /> CHANGER LE MOT DE PASSE</>
                }
              </button>
            </form>

            {pwMsg && (
              <p className={`mt-3 text-xs font-mono ${pwMsg.startsWith('✅') ? 'text-nkt-green' : 'text-nkt-red'}`}>
                {pwMsg}
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}