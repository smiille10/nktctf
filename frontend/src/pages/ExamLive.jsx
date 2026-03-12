import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, Send, Flag, Trophy, AlertTriangle } from 'lucide-react';
import api from '../api';

export default function ExamLive() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [exam,        setExam]        = useState(null);
  const [challenges,  setChallenges]  = useState([]);
  const [timeLeft,    setTimeLeft]    = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [flags,       setFlags]       = useState({});   // challengeId → flag input
  const [results,     setResults]     = useState({});   // challengeId → { correct, message }
  const [submitting,  setSubmitting]  = useState({});
  const [finished,    setFinished]    = useState(false);
  const [finalScore,  setFinalScore]  = useState(null);
  const [msg,         setMsg]         = useState('');
  const timerRef = useRef(null);

  const loadChallenges = useCallback(async () => {
    try {
      const r = await api.get(`/exams/${id}/challenges`);
      setChallenges(r.data.challenges || []);
      setTimeLeft(r.data.time_left_seconds || 0);
      setExam(prev => ({ ...prev, ...r.data.session }));
    } catch (err) {
      if (err.response?.data?.error === 'Temps écoulé !') {
        setFinished(true);
        setMsg('⏰ Temps écoulé !');
      }
    }
  }, [id]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // Récupère les infos de l'examen
        const r = await api.get(`/exams/${id}/challenges`);
        setChallenges(r.data.challenges || []);
        setTimeLeft(r.data.time_left_seconds || 0);
        setExam(r.data);
      } catch (err) {
        setMsg('❌ ' + (err.response?.data?.error || 'Examen introuvable'));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

  // ── Timer ──
  useEffect(() => {
    if (timeLeft <= 0 || finished) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleFinish(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timeLeft > 0, finished]);

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const timerColor = timeLeft < 300 ? '#ff4560' : timeLeft < 900 ? '#ffd700' : '#00ff88';

  const handleSubmitFlag = async (challengeId) => {
    const flag = flags[challengeId]?.trim();
    if (!flag) return;
    setSubmitting(prev => ({ ...prev, [challengeId]: true }));
    try {
      const r = await api.post(`/exams/${id}/submit`, { challenge_id: challengeId, flag });
      setResults(prev => ({ ...prev, [challengeId]: r.data }));
      if (r.data.correct) {
        setChallenges(prev => prev.map(c => c.id === challengeId ? { ...c, solved: true } : c));
      }
    } catch (err) {
      setResults(prev => ({ ...prev, [challengeId]: { correct: false, message: err.response?.data?.error || 'Erreur' } }));
    } finally {
      setSubmitting(prev => ({ ...prev, [challengeId]: false }));
    }
  };

  const handleFinish = async (auto = false) => {
    if (!auto && !confirm('Terminer l\'examen ? Tu ne pourras plus soumettre de flags.')) return;
    clearInterval(timerRef.current);
    try {
      const r = await api.post(`/exams/${id}/finish`);
      setFinalScore(r.data);
      setFinished(true);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Erreur'));
    }
  };

  const solvedCount = challenges.filter(c => c.solved).length;

  if (loading) return (
    <div className="min-h-screen bg-nkt-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-nkt-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── Écran résultats ──
  if (finished) return (
    <div className="min-h-screen bg-nkt-bg bg-grid flex items-center justify-center px-4">
      <div className="bg-nkt-card border border-nkt-border rounded-xl p-8 w-full max-w-md text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-nkt-green to-transparent" />
        <Trophy size={48} className="mx-auto mb-4 text-yellow-400" />
        <h2 className="font-display text-2xl font-bold text-nkt-text mb-2">Examen Terminé !</h2>
        {finalScore && (
          <>
            <p className="font-display text-5xl font-bold text-nkt-green my-6">{finalScore.session?.score || 0}</p>
            <p className="font-mono text-sm text-nkt-muted mb-2">points obtenus</p>
            <p className="font-mono text-lg font-bold text-nkt-text">{finalScore.percentage}%</p>
            {finalScore.certificate && (
              <div className="mt-4 p-3 bg-yellow-400/10 border border-yellow-400/30 rounded-lg">
                <p className="font-mono text-sm text-yellow-400 font-bold">🏅 Certificat obtenu !</p>
                <p className="font-mono text-xs text-nkt-muted mt-1">Score ≥ 70%</p>
              </div>
            )}
          </>
        )}
        {msg && <p className="font-mono text-sm text-yellow-400 mt-2">{msg}</p>}
        <div className="flex gap-3 mt-6">
          <button onClick={() => navigate('/my-school')}
            className="flex-1 nkt-btn nkt-btn-solid py-3 rounded-lg font-mono text-sm font-bold">
            MON ESPACE
          </button>
          <button onClick={() => navigate('/learn')}
            className="flex-1 nkt-btn py-3 rounded-lg font-mono text-sm font-bold">
            COURS
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-nkt-bg bg-grid pt-0 pb-12">

      {/* ── Barre fixe timer ── */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-nkt-card/95 backdrop-blur border-b border-nkt-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono text-nkt-muted tracking-widest">EXAMEN EN COURS</p>
            <p className="font-mono text-sm font-bold text-nkt-text">{solvedCount}/{challenges.length} résolus</p>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-2">
            <Clock size={16} style={{ color: timerColor }} />
            <span className="font-mono text-2xl font-bold tabular-nums" style={{ color: timerColor }}>
              {formatTime(timeLeft)}
            </span>
          </div>

          <button onClick={() => handleFinish(false)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-nkt-red/30 text-nkt-red bg-nkt-red/5 hover:bg-nkt-red/10 transition-all text-xs font-mono font-bold">
            <Flag size={13} /> TERMINER
          </button>
        </div>

        {/* Barre de progression */}
        <div className="h-0.5 bg-nkt-bg">
          <div className="h-full transition-all duration-1000" style={{ width: `${(timeLeft / (exam?.duration_minutes * 60 || 3600)) * 100}%`, background: timerColor }} />
        </div>
      </div>

      {/* ── Challenges ── */}
      <div className="max-w-5xl mx-auto px-4 pt-24 space-y-4">

        {msg && (
          <div className="p-3 rounded border bg-nkt-red/10 border-nkt-red/30 text-nkt-red font-mono text-sm flex items-center gap-2">
            <AlertTriangle size={14} /> {msg}
          </div>
        )}

        {challenges.map((ch, i) => (
          <div key={ch.id} className={`bg-nkt-card border rounded-xl overflow-hidden transition-all ${
            ch.solved ? 'border-nkt-green/40' : 'border-nkt-border'
          }`}>
            {ch.solved && <div className="h-[2px] bg-gradient-to-r from-transparent via-nkt-green to-transparent" />}

            <div className="p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[10px] font-mono text-nkt-muted border border-nkt-border px-2 py-0.5 rounded">
                      #{i + 1}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-nkt-muted">{ch.category}</span>
                    {ch.solved && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-nkt-green border border-nkt-green/30 bg-nkt-green/10 px-2 py-0.5 rounded">
                        <CheckCircle size={10} /> RÉSOLU
                      </span>
                    )}
                  </div>
                  <h3 className="font-mono text-base font-bold text-nkt-text">{ch.title}</h3>
                  <p className="font-mono text-sm text-nkt-muted mt-2 leading-relaxed whitespace-pre-wrap">{ch.description}</p>
                  {ch.hint && (
                    <p className="font-mono text-xs text-yellow-400/70 mt-2">💡 {ch.hint}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-display text-2xl font-bold text-nkt-green">{ch.points}</p>
                  <p className="text-[10px] font-mono text-nkt-muted">pts</p>
                </div>
              </div>

              {/* Submit flag */}
              {!ch.solved && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-nkt-green font-mono text-sm">›</span>
                      <input
                        className="nkt-input w-full pl-8 pr-4 py-2.5 rounded-lg text-sm font-mono"
                        placeholder="NKTCTF{...}"
                        value={flags[ch.id] || ''}
                        onChange={e => setFlags(prev => ({ ...prev, [ch.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleSubmitFlag(ch.id)}
                        disabled={submitting[ch.id]}
                      />
                    </div>
                    <button onClick={() => handleSubmitFlag(ch.id)}
                      disabled={submitting[ch.id] || !flags[ch.id]?.trim()}
                      className="nkt-btn nkt-btn-solid px-5 py-2.5 rounded-lg text-sm font-mono font-bold flex items-center gap-2 disabled:opacity-50">
                      {submitting[ch.id]
                        ? <span className="w-4 h-4 border-2 border-nkt-bg border-t-transparent rounded-full animate-spin" />
                        : <><Send size={13} /> SUBMIT</>
                      }
                    </button>
                  </div>

                  {results[ch.id] && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-mono ${
                      results[ch.id].correct
                        ? 'bg-nkt-green/10 border-nkt-green/30 text-nkt-green'
                        : 'bg-nkt-red/10 border-nkt-red/30 text-nkt-red'
                    }`}>
                      {results[ch.id].correct ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      {results[ch.id].message}
                    </div>
                  )}
                </div>
              )}

              {ch.solved && (
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-nkt-green/5 border-nkt-green/20 text-nkt-green text-sm font-mono">
                  <CheckCircle size={14} /> Challenge résolu ! +{ch.points} pts
                </div>
              )}
            </div>
          </div>
        ))}

        <button onClick={() => handleFinish(false)}
          className="w-full py-4 rounded-xl border border-nkt-red/30 text-nkt-red bg-nkt-red/5 hover:bg-nkt-red/10 transition-all font-mono font-bold flex items-center justify-center gap-2">
          <Flag size={16} /> TERMINER L'EXAMEN
        </button>
      </div>
    </div>
  );
}