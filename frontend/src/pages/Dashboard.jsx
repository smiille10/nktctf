import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { challengesAPI, scoreboardAPI } from '../api';
import { useNavigate } from 'react-router-dom';
import { Terminal, Trophy, Target, Zap, TrendingUp, Shield } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scoreboard, setScoreboard] = useState([]);
  const [challenges, setChallenges] = useState([]);

  useEffect(() => {
    scoreboardAPI.getAll().then(r => setScoreboard(r.data));
    challengesAPI.getAll().then(r => setChallenges(r.data));
  }, []);

  const solved = challenges.filter(c => c.solved).length;
  const myRank = scoreboard.findIndex(p => p.username === user?.username) + 1;
  const recentSolves = scoreboard.slice(0, 5);
  const top5 = scoreboard.slice(0, 5);

  return (
    <div className="min-h-screen bg-nkt-bg bg-grid pt-20 px-4 pb-12">
      <div className="max-w-7xl mx-auto">

        {/* Welcome header */}
        <div className="mb-8">
          <p className="text-nkt-muted text-xs font-mono mb-1">WELCOME BACK,</p>
          <h1 className="font-display text-3xl font-bold">
            <span className="neon-text">{user?.username}</span>
            <span className="text-nkt-muted text-lg ml-3 font-mono">#{myRank || '—'}</span>
          </h1>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'SCORE', value: user?.score || 0, icon: Zap, color: '#00ff88' },
            { label: 'RANK', value: `#${myRank || '—'}`, icon: Trophy, color: '#ffd700' },
            { label: 'SOLVED', value: `${solved}/${challenges.length}`, icon: Target, color: '#00d4ff' },
            { label: 'PROGRESS', value: challenges.length ? `${Math.round(solved/challenges.length*100)}%` : '0%', icon: TrendingUp, color: '#ff4560' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-nkt-card border border-nkt-border rounded-lg p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-mono text-nkt-muted tracking-widest mb-2">{label}</p>
                  <p className="font-display text-2xl font-bold" style={{ color }}>{value}</p>
                </div>
                <Icon size={20} style={{ color, opacity: 0.5 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* My Rank card */}
          <div className="bg-nkt-card border border-nkt-border rounded-lg overflow-hidden">
            <div className="border-b border-nkt-border px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy size={15} className="text-nkt-green" />
                <span className="font-mono text-xs font-bold text-nkt-text tracking-wider">RANK</span>
              </div>
              <button onClick={() => navigate('/scoreboard')} className="text-nkt-green text-[10px] font-mono hover:underline">
                See all →
              </button>
            </div>
            <div className="p-5 space-y-3">
              {top5.map((player, i) => {
                const isMe = player.username === user?.username;
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <div key={player.id}
                    className={`flex items-center gap-3 p-3 rounded transition-colors ${isMe ? 'bg-nkt-green/10 border border-nkt-green/20' : 'hover:bg-white/[0.02]'}`}>
                    <div className="w-7 text-center">
                      {i < 3 ? <span className="text-base">{medals[i]}</span> :
                        <span className="text-nkt-muted font-mono text-sm">{i + 1}</span>}
                    </div>
                    <div className="w-8 h-8 rounded border flex items-center justify-center text-xs font-bold"
                      style={{ borderColor: isMe ? '#00ff8840' : '#1a2a3a', background: isMe ? '#00ff8815' : '#080d14', color: isMe ? '#00ff88' : '#4a6070' }}>
                      {player.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className={`font-mono text-sm font-semibold ${isMe ? 'text-nkt-green' : 'text-nkt-text'}`}>
                        {player.username}
                        {isMe && <span className="ml-2 text-[10px] text-nkt-green/60 bg-nkt-green/10 px-1.5 py-0.5 rounded">You</span>}
                      </p>
                    </div>
                    <span className="font-display text-sm font-bold text-nkt-green">{player.score} pts</span>
                  </div>
                );
              })}
              {myRank > 5 && scoreboard[myRank - 1] && (
                <>
                  <div className="text-center text-nkt-muted text-xs font-mono">• • •</div>
                  <div className="flex items-center gap-3 p-3 rounded bg-nkt-green/10 border border-nkt-green/20">
                    <div className="w-7 text-center">
                      <span className="text-nkt-muted font-mono text-sm">{myRank}</span>
                    </div>
                    <div className="w-8 h-8 rounded border border-nkt-green/40 bg-nkt-green/15 flex items-center justify-center text-xs font-bold text-nkt-green">
                      {user?.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-mono text-sm font-semibold text-nkt-green">
                        {user?.username}
                        <span className="ml-2 text-[10px] text-nkt-green/60 bg-nkt-green/10 px-1.5 py-0.5 rounded">You</span>
                      </p>
                    </div>
                    <span className="font-display text-sm font-bold text-nkt-green">{user?.score || 0} pts</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Category progress */}
          <div className="bg-nkt-card border border-nkt-border rounded-lg overflow-hidden">
            <div className="border-b border-nkt-border px-5 py-4 flex items-center gap-2">
              <Target size={15} className="text-nkt-green" />
              <span className="font-mono text-xs font-bold text-nkt-text tracking-wider">CATEGORY PROGRESS</span>
            </div>
            <div className="p-5 space-y-4">
              {['WEB', 'FORENSICS', 'CRYPTO', 'OSINT', 'MISC'].map(cat => {
                const total = challenges.filter(c => c.category.toUpperCase() === cat).length;
                const done = challenges.filter(c => c.category.toUpperCase() === cat && c.solved).length;
                const pct = total ? Math.round(done / total * 100) : 0;
                const colors = { WEB: '#00d4ff', FORENSICS: '#ffa500', CRYPTO: '#9400d3', OSINT: '#ff4560', MISC: '#aaa' };
                const icons = { WEB: '🌐', FORENSICS: '🔍', CRYPTO: '🔐', OSINT: '👁️', MISC: '⚡' };
                const color = colors[cat];
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{icons[cat]}</span>
                        <span className="font-mono text-xs text-nkt-text">{cat}</span>
                      </div>
                      <span className="font-mono text-xs text-nkt-muted">{done}/{total}</span>
                    </div>
                    <div className="h-1.5 bg-nkt-bg rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}60` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick action */}
            <div className="border-t border-nkt-border p-5">
              <button onClick={() => navigate('/challenges')}
                className="nkt-btn nkt-btn-solid w-full py-2.5 rounded text-sm flex items-center justify-center gap-2">
                <Shield size={15} />
                START HACKING
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}