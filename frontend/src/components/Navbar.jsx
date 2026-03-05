import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Terminal, Trophy, Shield, LogOut,
  Menu, X, Cpu, LayoutDashboard,
  Calendar, Crown, Zap, Settings,
  ChevronRight, Users
} from 'lucide-react';

const PLAN_COLORS = {
  free:  '#00ff88',
  pro:   '#00d4ff',
  elite: '#ffd700',
};

const PLAN_LABELS = {
  free:  'Free Member',
  pro:   'PRO Member',
  elite: 'ELITE Member',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = [
    { to: '/dashboard',  label: 'DASHBOARD',  icon: LayoutDashboard },
    { to: '/challenges', label: 'CHALLENGES', icon: Terminal         },
    { to: '/teams',      label: 'TEAMS',      icon: Users            },
    { to: '/events',     label: 'EVENTS',     icon: Calendar         },
    { to: '/scoreboard', label: 'SCOREBOARD', icon: Trophy           },
    { to: '/pricing',    label: 'PRICING',    icon: Crown            },
    ...(user?.role === 'superadmin' || user?.role === 'manager'
      ? [{ to: '/admin', label: 'ADMIN', icon: Cpu }]
      : []
    ),
  ];

  const isActive    = (path) => location.pathname === path;
  const planColor   = PLAN_COLORS[user?.plan]  || PLAN_COLORS.free;
  const planLabel   = PLAN_LABELS[user?.plan]  || PLAN_LABELS.free;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-nkt-border bg-nkt-bg/90 backdrop-blur-md">
      <div className="h-[2px] bg-gradient-to-r from-transparent via-nkt-green to-transparent" />

      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">

        {/* ── Logo ── */}
        <Link to="/dashboard" className="flex items-center gap-3 flex-shrink-0">
          <Shield size={28} className="text-nkt-green"
            style={{ filter: 'drop-shadow(0 0 8px rgba(0,255,136,0.6))' }} />
          <div>
            <div>
              <span className="font-display text-xl font-bold neon-text">NKT</span>
              <span className="font-display text-xl font-bold text-nkt-text">CTF</span>
            </div>
            <p className="text-[9px] text-nkt-muted font-mono tracking-widest">WHERE HACKERS RISE</p>
          </div>
        </Link>

        {/* ── Links desktop ── */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}
              className={`flex items-center gap-2 px-3 py-2 rounded text-[11px] font-mono font-semibold tracking-widest transition-all duration-300 ${
                isActive(to)
                  ? 'text-nkt-green bg-nkt-green/10 border border-nkt-green/30'
                  : 'text-nkt-muted hover:text-nkt-green hover:bg-nkt-green/5 border border-transparent'
              }`}>
              <Icon size={13} />
              {label}
            </Link>
          ))}
        </div>

        {/* ── User desktop dropdown ── */}
        <div className="hidden md:flex items-center" ref={dropdownRef}>
          {user && (
            <div className="relative">

              {/* Avatar bouton */}
              <button
                onClick={() => setDropdownOpen(v => !v)}
                className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                <div className="text-right">
                  <p className="text-xs font-mono font-semibold" style={{ color: planColor }}>
                    {user.username}
                  </p>
                  <p className="text-[10px] font-mono text-nkt-muted">{user.score || 0} pts</p>
                </div>
                <div className="w-9 h-9 rounded-lg border-2 flex items-center justify-center relative"
                  style={{
                    borderColor: planColor,
                    background:  `${planColor}15`,
                    boxShadow:   `0 0 12px ${planColor}30`,
                  }}>
                  <span className="font-bold text-sm" style={{ color: planColor }}>
                    {user.username[0].toUpperCase()}
                  </span>
                  {user.plan && user.plan !== 'free' && (
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-2 border-nkt-bg flex items-center justify-center"
                      style={{ background: planColor }}>
                      {user.plan === 'elite'
                        ? <Crown size={8} color="#080d14" />
                        : <Zap   size={8} color="#080d14" />
                      }
                    </div>
                  )}
                </div>
              </button>

              {/* ── DROPDOWN ── */}
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-3 w-64 bg-nkt-card border border-nkt-border rounded-xl overflow-hidden shadow-2xl shadow-black/60 z-50">
                  <div className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{ background: `linear-gradient(90deg, transparent, ${planColor}, transparent)` }} />

                  {/* Header */}
                  <div className="px-4 py-4 border-b border-nkt-border">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl border-2 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: planColor, background: `${planColor}15` }}>
                        <span className="font-bold text-lg" style={{ color: planColor }}>
                          {user.username[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono font-bold text-nkt-text text-sm truncate">{user.username}</p>
                        <p className="font-mono text-[10px] text-nkt-muted truncate">{user.email}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: planColor }} />
                          <span className="text-[10px] font-mono font-bold" style={{ color: planColor }}>
                            {planLabel.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mini stats */}
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {[
                        { label: 'PTS',  value: user.score || 0              },
                        { label: 'PLAN', value: user.plan?.toUpperCase() || 'FREE' },
                        { label: 'ROLE', value: user.role === 'superadmin' ? 'ADMIN' : user.role === 'manager' ? 'MGR' : 'USER' },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-nkt-bg rounded-lg py-2 text-center border border-nkt-border">
                          <p className="font-display font-bold text-sm" style={{ color: planColor }}>{value}</p>
                          <p className="text-[9px] font-mono text-nkt-muted">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="py-2">

                    {/* Account */}
                    <button
                      onClick={() => { navigate('/account'); setDropdownOpen(false); }}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-mono text-nkt-text hover:bg-white/[0.04] hover:text-nkt-green transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg border border-nkt-border bg-nkt-bg flex items-center justify-center group-hover:border-nkt-green/30 group-hover:bg-nkt-green/5 transition-all">
                          <Settings size={14} className="text-nkt-muted group-hover:text-nkt-green transition-colors" />
                        </div>
                        <span>Account</span>
                      </div>
                      <ChevronRight size={14} className="text-nkt-muted/40 group-hover:text-nkt-green/60" />
                    </button>

                    {/* Upgrade si free */}
                    {user.plan === 'free' && (
                      <button
                        onClick={() => { navigate('/pricing'); setDropdownOpen(false); }}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-mono transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg border border-yellow-400/30 bg-yellow-400/5 flex items-center justify-center">
                            <Crown size={14} className="text-yellow-400" />
                          </div>
                          <span className="text-yellow-400 font-bold">Upgrade PRO/ELITE</span>
                        </div>
                        <ChevronRight size={14} className="text-yellow-400/40" />
                      </button>
                    )}

                    <div className="mx-4 my-1 border-t border-nkt-border" />

                    {/* Logout */}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-mono text-nkt-muted hover:text-nkt-red hover:bg-nkt-red/5 transition-all group">
                      <div className="w-8 h-8 rounded-lg border border-transparent group-hover:border-nkt-red/30 group-hover:bg-nkt-red/10 flex items-center justify-center transition-all">
                        <LogOut size={14} />
                      </div>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Burger mobile ── */}
        <button className="md:hidden text-nkt-green" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* ── Menu mobile ── */}
      {menuOpen && (
        <div className="md:hidden border-t border-nkt-border bg-nkt-card px-4 py-4 space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 py-2.5 px-3 rounded text-sm font-mono transition-colors ${
                isActive(to) ? 'text-nkt-green bg-nkt-green/10' : 'text-nkt-muted hover:text-nkt-green'
              }`}>
              <Icon size={15} /> {label}
            </Link>
          ))}
          <div className="border-t border-nkt-border pt-3 mt-3 space-y-1">
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-9 h-9 rounded-lg border-2 flex items-center justify-center flex-shrink-0"
                style={{ borderColor: planColor, background: `${planColor}15` }}>
                <span className="font-bold" style={{ color: planColor }}>
                  {user?.username[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-mono text-sm font-bold" style={{ color: planColor }}>{user?.username}</p>
                <p className="text-[10px] font-mono text-nkt-muted">{user?.score || 0} pts · {planLabel}</p>
              </div>
            </div>
            <button onClick={() => { navigate('/account'); setMenuOpen(false); }}
              className="flex items-center gap-3 py-2.5 px-3 rounded text-sm font-mono text-nkt-muted hover:text-nkt-green w-full transition-colors">
              <Settings size={15} /> ACCOUNT
            </button>
            <button onClick={handleLogout}
              className="flex items-center gap-3 py-2.5 px-3 rounded text-sm font-mono text-nkt-muted hover:text-nkt-red w-full transition-colors">
              <LogOut size={15} /> LOGOUT
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}