import { useState, useEffect } from 'react';
import { challengesAPI } from '../api';
import { useNavigate } from 'react-router-dom';
import { Search, CheckCircle, Download, Users } from 'lucide-react';

const CATEGORIES = ['All Categories', 'WEB', 'FORENSICS', 'CRYPTO', 'OSINT', 'MISC'];
const DIFFICULTIES = ['All Difficulties', 'Easy', 'Medium', 'Hard'];

const CAT_ICONS = { WEB: '🌐', FORENSICS: '🔍', CRYPTO: '🔐', OSINT: '👁️', MISC: '⚡' };
const CAT_COLORS = { WEB: '#00d4ff', FORENSICS: '#ffa500', CRYPTO: '#9400d3', OSINT: '#ff4560', MISC: '#888' };

const DIFF_STYLES = {
  Easy: 'bg-nkt-green/10 text-nkt-green border-nkt-green/30',
  Medium: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30',
  Hard: 'bg-nkt-red/10 text-nkt-red border-nkt-red/30',
};

export default function Challenges() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All Categories');
  const [difficulty, setDifficulty] = useState('All Difficulties');
  const [search, setSearch] = useState('');
  const [hideSolved, setHideSolved] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    challengesAPI.getAll()
      .then(r => setChallenges(r.data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = challenges.filter(c => {
    if (category !== 'All Categories' && c.category.toUpperCase() !== category) return false;
    if (difficulty !== 'All Difficulties' && (c.difficulty || 'Easy') !== difficulty) return false;
    if (hideSolved && c.solved) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const solved = challenges.filter(c => c.solved).length;

  return (
    <div className="min-h-screen bg-nkt-bg bg-grid pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">

        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-nkt-text mb-1">
            Challenges
            <span className="text-nkt-green neon-text-dim ml-3 text-base font-mono">[{challenges.length}]</span>
          </h1>
          <p className="text-nkt-muted text-xs font-mono">{solved} solved / {challenges.length - solved} remaining</p>
        </div>

        <div className="flex gap-6">

          {/* LEFT SIDEBAR */}
          <div className="hidden md:block w-56 flex-shrink-0 space-y-4">

            {/* Search */}
            <div className="bg-nkt-card border border-nkt-border rounded-lg p-4">
              <p className="text-[10px] font-mono text-nkt-muted tracking-widest mb-3">SEARCH</p>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nkt-muted" />
                <input type="text" className="nkt-input w-full pl-8 pr-3 py-2 rounded text-xs"
                  placeholder="Search by name..." value={search}
                  onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            {/* Filters */}
            <div className="bg-nkt-card border border-nkt-border rounded-lg p-4">
              <p className="text-[10px] font-mono text-nkt-muted tracking-widest mb-3">FILTERS</p>
              <label className="flex items-center gap-2 cursor-pointer group">
                <div onClick={() => setHideSolved(!hideSolved)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${hideSolved ? 'bg-nkt-green border-nkt-green' : 'border-nkt-border'}`}>
                  {hideSolved && <CheckCircle size={10} className="text-nkt-bg" />}
                </div>
                <span className="text-xs font-mono text-nkt-muted group-hover:text-nkt-text transition-colors">Hide Solved</span>
              </label>
            </div>

            {/* Difficulty */}
            <div className="bg-nkt-card border border-nkt-border rounded-lg p-4">
              <p className="text-[10px] font-mono text-nkt-muted tracking-widest mb-3">DIFFICULTY</p>
              <div className="space-y-1">
                {DIFFICULTIES.map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`w-full text-left px-3 py-2 rounded text-xs font-mono transition-all ${
                      difficulty === d
                        ? 'bg-nkt-green/10 text-nkt-green border border-nkt-green/30'
                        : 'text-nkt-muted hover:text-nkt-text hover:bg-white/[0.03] border border-transparent'
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="bg-nkt-card border border-nkt-border rounded-lg p-4">
              <p className="text-[10px] font-mono text-nkt-muted tracking-widest mb-3">CATEGORY</p>
              <div className="space-y-1">
                {CATEGORIES.map(cat => {
                  const count = cat === 'All Categories'
                    ? challenges.length
                    : challenges.filter(c => c.category.toUpperCase() === cat).length;
                  return (
                    <button key={cat} onClick={() => setCategory(cat)}
                      className={`w-full text-left px-3 py-2 rounded text-xs font-mono transition-all flex items-center justify-between ${
                        category === cat
                          ? 'bg-nkt-green/10 text-nkt-green border border-nkt-green/30'
                          : 'text-nkt-muted hover:text-nkt-text hover:bg-white/[0.03] border border-transparent'
                      }`}>
                      <span className="flex items-center gap-2">
                        {cat !== 'All Categories' && <span>{CAT_ICONS[cat]}</span>}
                        {cat}
                      </span>
                      <span className="opacity-50 text-[10px]">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT — challenge grid */}
          <div className="flex-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="w-8 h-8 border-2 border-nkt-green border-t-transparent rounded-full animate-spin" />
                <p className="text-nkt-muted text-xs font-mono">LOADING CHALLENGES...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-32">
                <p className="text-nkt-muted font-mono text-sm">NO CHALLENGES FOUND</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(challenge => {
                  const cat = challenge.category.toUpperCase();
                  const diff = challenge.difficulty || 'Easy';
                  const color = CAT_COLORS[cat] || '#888';
                  return (
                    <div key={challenge.id}
                      onClick={() => navigate(`/challenges/${challenge.id}`)}
                      className={`challenge-card bg-nkt-card rounded-lg p-5 cursor-pointer relative overflow-hidden ${challenge.solved ? 'solved' : ''}`}>

                      <div className="absolute top-0 left-0 right-0 h-[3px]"
                        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />

                      {challenge.solved && (
                        <div className="absolute top-3 right-3">
                          <CheckCircle size={16} className="text-nkt-green"
                            style={{ filter: 'drop-shadow(0 0 4px rgba(0,255,136,0.8))' }} />
                        </div>
                      )}

                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-mono" style={{ color }}>
                          {CAT_ICONS[cat]} {challenge.category}
                        </span>
                        <span className={`ml-auto text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${DIFF_STYLES[diff]}`}>
                          {diff}
                        </span>
                      </div>

                      <h3 className="font-mono font-bold text-nkt-text text-sm mb-3 leading-tight line-clamp-2">
                        {challenge.title}
                      </h3>

                      <p className="text-nkt-muted text-xs leading-relaxed mb-4 line-clamp-2">
                        {challenge.description}
                      </p>

                      <div className="flex items-center justify-between pt-3 border-t border-nkt-border/50">
                        <div className="flex items-center gap-1 text-nkt-muted text-[10px] font-mono">
                          <Users size={11} />
                          <span>{challenge.solves || 0} solves</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {challenge.file_name && (
                            <div className="flex items-center gap-1 text-[10px] font-mono text-nkt-cyan">
                              <Download size={10} /> FILE
                            </div>
                          )}
                          <span className="font-display text-base font-bold" style={{ color }}>
                            {challenge.points}
                            <span className="text-[9px] text-nkt-muted font-mono ml-1">pts</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}