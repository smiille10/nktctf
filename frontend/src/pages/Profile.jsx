import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  Shield, Trophy, Target, Zap, Star,
  Calendar, Award, CheckCircle, Lock,
  ArrowLeft, Crown
} from 'lucide-react';

const PLAN_BADGES = {
  free:  { label: 'FREE',  color: '#4a6070', icon: Shield },
  pro:   { label: 'PRO',   color: '#00d4ff', icon: Zap    },
  elite: { label: 'ELITE', color: '#ffd700', icon: Crown  },
};

export default function Profile() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [solvedChallenges, setSolvedChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = !username || username === currentUser?.username;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (isOwnProfile) {
          const r = await api.get('/auth/me');
          setProfile(r.data);
          const sc = await api.get('/profile/solved');
          setSolvedChallenges(sc.data || []);
        } else {
          const r = await api.get(`/profile/${username}`);
          setProfile(r.data);
          setSolvedChallenges(r.data.solved_challenges || []);
        }
      } catch {
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username]);

  if (loading) return (
    <div className="min-h-screen bg-nkt-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-nkt-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!profile) return null;

  const plan = profile.plan || 'free';
  const badge = PLAN_BADGES[plan] || PLAN_BADGES.free;
  const BadgeIcon = badge.icon;

  const joinDate = new Date(profile.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  const DIFF_COLORS = {
    Easy:   'text-nkt-green border-nkt-green/30 bg-nkt-green/10',
    Medium: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
    Hard:   'text-nkt-red border-nkt-red/30 bg-nkt-red/10',
  };

  const totalCategories = [...new Set(solvedChallenges.map(c => c.category))];

  return (
    <div className="min-h-screen bg-nkt-bg bg-grid pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4">

        {/* Back */}
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-nkt-muted hover:text-nkt-green transition-colors font-mono text-xs mb-6">
          <ArrowLeft size={14} /> BACK
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* ── Colonne gauche — Infos profil ── */}
          <div className="space-y-4">

            {/* Avatar + nom */}
            <div className="bg-nkt-card border border-nkt-border rounded-xl p-6 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ background: `linear-gradient(90deg, transparent, ${badge.color}, transparent)` }} />

              {/* Avatar */}
              <div className="relative inline-block mb-4">
                <div className="w-20 h-20 rounded-xl border-2 flex items-center justify-center mx-auto text-3xl font-bold font-display"
                  style={{
                    borderColor: badge.color,
                    background: `${badge.color}15`,
                    color: badge.color,
                    boxShadow: `0 0 20px ${badge.color}30`,
                  }}>
                  {profile.username[0].toUpperCase()}
                </div>
                {/* Badge plan */}
                <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-lg border flex items-center justify-center"
                  style={{ borderColor: badge.color, background: badge.color, boxShadow: `0 0 10px ${badge.color}50` }}>
                  <BadgeIcon size={12} color="#080d14" />
                </div>
              </div>

              <h1 className="font-display text-xl font-bold text-nkt-text">{profile.username}</h1>

              {profile.full_name && (
                <p className="text-nkt-muted text-xs font-mono mt-1">{profile.full_name}</p>
              )}

              {/* Plan badge */}
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-full border"
                  style={{ borderColor: badge.color, color: badge.color, background: `${badge.color}15` }}>
                  {badge.label} MEMBER
                </span>
              </div>

              {/* Rôle admin */}
              {(profile.role === 'superadmin' || profile.role === 'manager') && (
                <div className="mt-2">
                  <span className="text-[10px] font-mono text-nkt-green border border-nkt-green/30 bg-nkt-green/10 px-2 py-0.5 rounded">
                    {profile.role.toUpperCase()}
                  </span>
                </div>
              )}

              {/* Date inscription */}
              <div className="flex items-center justify-center gap-1.5 mt-4 text-nkt-muted">
                <Calendar size={11} />
                <span className="text-[10px] font-mono">Membre depuis {joinDate}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-nkt-card border border-nkt-border rounded-xl p-5 space-y-4">
              <p className="text-[10px] font-mono text-nkt-muted tracking-widest">STATISTIQUES</p>

              {[
                { label: 'Score total',       value: profile.score || 0,             icon: Trophy,  color: '#ffd700', suffix: 'pts' },
                { label: 'Challenges résolus', value: solvedChallenges.length,        icon: Target,  color: '#00ff88', suffix: ''    },
                { label: 'Catégories',         value: totalCategories.length,          icon: Star,    color: '#00d4ff', suffix: ''    },
              ].map(({ label, value, icon: Icon, color, suffix }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={13} style={{ color }} />
                    <span className="text-xs font-mono text-nkt-muted">{label}</span>
                  </div>
                  <span className="font-display font-bold text-sm" style={{ color }}>
                    {value}{suffix && ` ${suffix}`}
                  </span>
                </div>
              ))}
            </div>

            {/* Catégories maîtrisées */}
            {totalCategories.length > 0 && (
              <div className="bg-nkt-card border border-nkt-border rounded-xl p-5">
                <p className="text-[10px] font-mono text-nkt-muted tracking-widest mb-3">CATÉGORIES</p>
                <div className="flex flex-wrap gap-2">
                  {totalCategories.map(cat => (
                    <span key={cat}
                      className="text-[10px] font-mono font-bold px-2 py-1 rounded border border-nkt-green/30 bg-nkt-green/10 text-nkt-green">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Colonne droite — Challenges résolus ── */}
          <div className="md:col-span-2 space-y-4">

            {/* Header */}
            <div className="bg-nkt-card border border-nkt-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Award size={14} className="text-nkt-green" />
                <h2 className="font-mono text-sm font-bold text-nkt-text">Challenges Résolus</h2>
                <span className="ml-auto font-display text-nkt-green font-bold">
                  {solvedChallenges.length}
                </span>
              </div>
              <div className="h-2 bg-nkt-bg rounded-full overflow-hidden mt-3">
                <div className="h-full bg-gradient-to-r from-nkt-green to-nkt-cyan rounded-full transition-all"
                  style={{ width: `${Math.min(100, (solvedChallenges.length / 20) * 100)}%` }} />
              </div>
            </div>

            {/* Liste challenges résolus */}
            <div className="bg-nkt-card border border-nkt-border rounded-xl overflow-hidden">
              <div className="border-b border-nkt-border px-5 py-3 grid grid-cols-12 gap-2 bg-nkt-bg/30">
                <span className="col-span-5 text-[10px] font-mono text-nkt-muted tracking-wider">CHALLENGE</span>
                <span className="col-span-3 text-[10px] font-mono text-nkt-muted tracking-wider">CATÉGORIE</span>
                <span className="col-span-2 text-[10px] font-mono text-nkt-muted tracking-wider">DIFF</span>
                <span className="col-span-2 text-[10px] font-mono text-nkt-muted tracking-wider text-right">PTS</span>
              </div>

              {solvedChallenges.length === 0 ? (
                <div className="text-center py-16">
                  <Lock size={36} className="text-nkt-muted/20 mx-auto mb-3" />
                  <p className="text-nkt-muted font-mono text-sm">Aucun challenge résolu</p>
                  <button onClick={() => navigate('/challenges')}
                    className="mt-4 nkt-btn nkt-btn-solid px-5 py-2 rounded text-xs">
                    VOIR LES CHALLENGES
                  </button>
                </div>
              ) : solvedChallenges.map((ch, i) => (
                <div key={ch.id || i}
                  className="px-5 py-3.5 grid grid-cols-12 gap-2 items-center border-b border-nkt-border/40 hover:bg-white/[0.02] cursor-pointer"
                  onClick={() => navigate(`/challenges/${ch.id}`)}>
                  <div className="col-span-5 flex items-center gap-2">
                    <CheckCircle size={12} className="text-nkt-green flex-shrink-0" />
                    <span className="font-mono text-sm text-nkt-text">{ch.title}</span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-[10px] font-mono text-nkt-muted">{ch.category}</span>
                  </div>
                  <div className="col-span-2">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${DIFF_COLORS[ch.difficulty] || DIFF_COLORS.Easy}`}>
                      {ch.difficulty}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="font-display text-sm text-nkt-green font-bold">+{ch.points}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}