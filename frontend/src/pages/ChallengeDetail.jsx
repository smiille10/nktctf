import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  Terminal, Download, Lightbulb, Send,
  CheckCircle, XCircle, Users, ArrowLeft
} from 'lucide-react';

const DIFF_STYLES = {
  Easy:   'text-nkt-green border-nkt-green/30 bg-nkt-green/10',
  Medium: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  Hard:   'text-nkt-red border-nkt-red/30 bg-nkt-red/10',
};

export default function ChallengeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [flag, setFlag]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]       = useState(null);
  const [showHint, setShowHint]   = useState(false);

  useEffect(() => {
    api.get(`/challenges/${id}`)
      .then(r => setChallenge(r.data))
      .catch(() => navigate('/challenges'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!flag.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await api.post(`/challenges/${id}/submit`, { flag: flag.trim() });
      setResult(res.data);
      if (res.data.correct) {
        await refreshUser();
        setChallenge(prev => ({ ...prev, solved: true }));
      }
    } catch (err) {
      setResult({
        correct: false,
        message: err.response?.data?.error || 'Erreur serveur',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-nkt-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-nkt-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!challenge) return null;

  const diffStyle = DIFF_STYLES[challenge.difficulty] || DIFF_STYLES.Easy;

  const downloadUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/challenges/${id}/download`;

  return (
    <div className="min-h-screen bg-nkt-bg bg-grid pt-20 pb-12">
      <div className="max-w-3xl mx-auto px-4">

        {/* Bouton retour */}
        <button
          onClick={() => navigate('/challenges')}
          className="flex items-center gap-2 text-nkt-muted hover:text-nkt-green transition-colors font-mono text-xs mb-6">
          <ArrowLeft size={14} /> BACK TO CHALLENGES
        </button>

        {/* Card */}
        <div className="bg-nkt-card border border-nkt-border rounded-xl overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-nkt-green to-transparent" />

          {/* ── Header ── */}
          <div className="p-6 border-b border-nkt-border">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">

                {/* Badges */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-[10px] font-mono font-bold text-nkt-green border border-nkt-green/30 bg-nkt-green/10 px-2 py-0.5 rounded">
                    {challenge.category}
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${diffStyle}`}>
                    {challenge.difficulty}
                  </span>
                  {challenge.solved && (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-nkt-green border border-nkt-green/30 bg-nkt-green/10 px-2 py-0.5 rounded">
                      <CheckCircle size={10} /> SOLVED
                    </span>
                  )}
                </div>

                {/* Titre */}
                <h1 className="font-display text-2xl font-bold text-nkt-text leading-tight">
                  {challenge.title}
                </h1>

                {/* Solves */}
                <div className="flex items-center gap-1 mt-2 text-nkt-muted">
                  <Users size={12} />
                  <span className="text-xs font-mono">{challenge.solves || 0} solves</span>
                </div>
              </div>

              {/* Points */}
              <div className="text-right flex-shrink-0">
                <p className="font-display text-4xl font-bold neon-text">{challenge.points}</p>
                <p className="text-[10px] font-mono text-nkt-muted">POINTS</p>
              </div>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="p-6 space-y-6">

            {/* Description */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Terminal size={13} className="text-nkt-green" />
                <span className="text-[11px] font-mono text-nkt-muted tracking-widest">DESCRIPTION</span>
              </div>
              <div className="bg-nkt-bg rounded-lg p-4 border border-nkt-border">
                <p className="text-sm font-mono text-nkt-text leading-relaxed whitespace-pre-wrap">
                  {challenge.description}
                </p>
              </div>
            </div>

            {/* Fichier à télécharger */}
            {challenge.file_name && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-4 bg-nkt-bg border border-nkt-cyan/30 rounded-lg hover:border-nkt-cyan/60 hover:bg-nkt-cyan/5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Download size={16} className="text-nkt-cyan flex-shrink-0" />
                  <div>
                    <p className="text-xs font-mono font-bold text-nkt-cyan tracking-wider">
                      DOWNLOAD FILE
                    </p>
                    <p className="text-[10px] font-mono text-nkt-muted">
                      {challenge.file_name}
                    </p>
                  </div>
                </div>
                <span className="text-nkt-cyan/40 group-hover:text-nkt-cyan transition-colors font-mono text-sm">
                  →
                </span>
              </a>
            )}

            {/* Hint */}
            {challenge.hint && (
              <div>
                <button
                  onClick={() => setShowHint(v => !v)}
                  className="flex items-center gap-2 text-yellow-400/70 hover:text-yellow-400 transition-colors">
                  <Lightbulb size={14} />
                  <span className="text-[11px] font-mono tracking-widest">
                    {showHint ? 'HIDE HINT' : 'REVEAL HINT'}
                  </span>
                </button>
                {showHint && (
                  <div className="mt-3 bg-yellow-400/5 border border-yellow-400/20 rounded-lg p-4">
                    <p className="text-sm font-mono text-yellow-400/80">{challenge.hint}</p>
                  </div>
                )}
              </div>
            )}

            {/* Zone submit ou solved */}
            {challenge.solved ? (
              <div className="flex items-center gap-3 p-4 bg-nkt-green/10 border border-nkt-green/30 rounded-lg">
                <CheckCircle size={20} className="text-nkt-green flex-shrink-0" />
                <div>
                  <p className="font-mono text-sm font-bold text-nkt-green">
                    CHALLENGE COMPLETED
                  </p>
                  <p className="font-mono text-xs text-nkt-muted mt-0.5">
                    Tu as déjà résolu ce challenge !
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-nkt-green font-mono text-xs">›_</span>
                  <span className="text-[11px] font-mono text-nkt-muted tracking-widest">
                    SUBMIT FLAG
                  </span>
                </div>

                <form onSubmit={handleSubmit} className="flex gap-3">
                  <div className="flex-1 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-nkt-green font-mono text-sm pointer-events-none">
                      ›
                    </span>
                    <input
                      className="nkt-input w-full pl-8 pr-4 py-3 rounded-lg text-sm font-mono"
                      placeholder="NKTCTF{your_flag_here}"
                      value={flag}
                      onChange={e => setFlag(e.target.value)}
                      disabled={submitting}
                      autoComplete="off"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting || !flag.trim()}
                    className="nkt-btn nkt-btn-solid px-6 py-3 rounded-lg flex items-center gap-2 text-sm font-mono font-bold whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitting
                      ? <span className="w-4 h-4 border-2 border-nkt-bg border-t-transparent rounded-full animate-spin" />
                      : <><Send size={14} /> SUBMIT</>
                    }
                  </button>
                </form>

                {/* Résultat */}
                {result && (
                  <div className={`mt-4 flex items-center gap-3 p-4 rounded-lg border ${
                    result.correct
                      ? 'bg-nkt-green/10 border-nkt-green/30'
                      : 'bg-nkt-red/10 border-nkt-red/30'
                  }`}>
                    {result.correct
                      ? <CheckCircle size={18} className="text-nkt-green flex-shrink-0" />
                      : <XCircle    size={18} className="text-nkt-red flex-shrink-0"   />
                    }
                    <div>
                      <p className={`font-mono text-sm font-bold ${
                        result.correct ? 'text-nkt-green' : 'text-nkt-red'
                      }`}>
                        {result.message}
                      </p>
                      {result.correct && (
                        <p className="font-mono text-xs text-nkt-muted mt-0.5">
                          +{result.points} pts ajoutés à ton score !
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}