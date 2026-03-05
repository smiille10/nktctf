import { useState, useEffect } from 'react';
import { scoreboardAPI } from '../api';
import { Trophy, Medal, Terminal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Scoreboard() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    scoreboardAPI.getAll() // ← CORRECTION ICI : getAll() au lieu de get()
      .then(res => {
        setPlayers(res.data);
        setError(null);
      })
      .catch(err => {
        console.error('Erreur chargement scoreboard:', err);
        setError('Impossible de charger le classement');
        setPlayers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy size={18} className="text-yellow-400" style={{ filter: 'drop-shadow(0 0 6px rgba(255,215,0,0.6))' }} />;
    if (rank === 2) return <Medal size={18} className="text-gray-300" />;
    if (rank === 3) return <Medal size={18} className="text-amber-600" />;
    return <span className="text-nkt-muted font-mono text-sm w-[18px] text-center">{rank}</span>;
  };

  // Gestion de l'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-nkt-bg bg-grid pt-20 px-4 pb-12">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-nkt-card border border-nkt-red/30 rounded-lg p-8">
            <Terminal size={40} className="text-nkt-red/50 mx-auto mb-4" />
            <h2 className="text-nkt-red font-mono text-lg mb-2">Erreur de chargement</h2>
            <p className="text-nkt-muted text-sm">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 nkt-btn px-4 py-2 rounded text-xs"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nkt-bg bg-grid pt-20 px-4 pb-12">
      <div className="max-w-4xl mx-auto">

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Terminal size={16} className="text-nkt-green" />
            <span className="text-[11px] font-mono text-nkt-muted tracking-widest">GLOBAL_RANKING</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-nkt-text">SCOREBOARD</h1>
        </div>

        {!loading && players.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[players[1], players[0], players[2]].map((player, i) => {
              if (!player) return null; // Sécurité au cas où
              const actualRank = i === 0 ? 2 : i === 1 ? 1 : 3;
              const colors = { 1: '#ffd700', 2: '#c0c0c0', 3: '#cd7f32' };
              const color = colors[actualRank];
              return (
                <div key={player.id}
                  className={`bg-nkt-card border rounded-lg p-4 text-center relative overflow-hidden ${actualRank === 1 ? 'border-yellow-400/30' : 'border-nkt-border'}`}
                  style={{ marginTop: actualRank === 1 ? 0 : '24px' }}>
                  {actualRank === 1 && <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />}
                  <div className="text-2xl mb-1">{actualRank === 1 ? '🥇' : actualRank === 2 ? '🥈' : '🥉'}</div>
                  <div className="w-10 h-10 rounded border mx-auto mb-2 flex items-center justify-center font-bold text-sm"
                    style={{ borderColor: `${color}40`, background: `${color}15`, color }}>
                    {player.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <p className="font-mono text-xs font-bold text-nkt-text truncate">{player.username}</p>
                  <p className="font-display text-lg font-bold mt-1" style={{ color }}>{player.score || 0}</p>
                  <p className="text-nkt-muted text-[10px] font-mono">{player.solves || 0} solves</p>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-nkt-card border border-nkt-border rounded-lg overflow-hidden">
          <div className="border-b border-nkt-border px-6 py-3 grid grid-cols-12 gap-4">
            <span className="col-span-1 text-[10px] font-mono text-nkt-muted tracking-wider">#</span>
            <span className="col-span-6 text-[10px] font-mono text-nkt-muted tracking-wider">PLAYER</span>
            <span className="col-span-3 text-[10px] font-mono text-nkt-muted tracking-wider text-center">SOLVES</span>
            <span className="col-span-2 text-[10px] font-mono text-nkt-muted tracking-wider text-right">SCORE</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-nkt-green border-t-transparent rounded-full animate-spin" />
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-16 text-nkt-muted font-mono text-sm">NO PLAYERS YET</div>
          ) : players.map((player, index) => {
            const rank = index + 1;
            const isCurrentUser = player.username === user?.username;
            return (
              <div key={player.id}
                className={`px-6 py-4 grid grid-cols-12 gap-4 items-center border-b border-nkt-border/50 transition-colors
                  ${isCurrentUser ? 'bg-nkt-green/5 border-l-2 border-l-nkt-green' : 'hover:bg-white/[0.02]'}`}>
                <div className="col-span-1 flex items-center justify-center">{getRankIcon(rank)}</div>
                <div className="col-span-6 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded border flex items-center justify-center text-xs font-bold
                    ${rank === 1 ? 'border-yellow-400/40 bg-yellow-400/10 text-yellow-400'
                    : rank === 2 ? 'border-gray-400/40 bg-gray-400/10 text-gray-300'
                    : rank === 3 ? 'border-amber-600/40 bg-amber-600/10 text-amber-600'
                    : 'border-nkt-border bg-nkt-bg text-nkt-muted'}`}>
                    {player.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <p className={`font-mono text-sm font-semibold ${isCurrentUser ? 'text-nkt-green' : 'text-nkt-text'}`}>
                    {player.username}
                    {isCurrentUser && <span className="ml-2 text-[10px] text-nkt-green/60">(you)</span>}
                  </p>
                </div>
                <div className="col-span-3 text-center">
                  <span className="font-mono text-sm text-nkt-muted">{player.solves || 0}</span>
                </div>
                <div className="col-span-2 text-right">
                  <span className={`font-display text-sm font-bold ${rank <= 3 ? 'neon-text-dim' : 'text-nkt-text'}`}>
                    {player.score || 0}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}