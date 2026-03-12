import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Flag, CheckCircle, XCircle, AlertTriangle, Trophy, ChevronDown, ChevronUp, Download } from 'lucide-react';
import api from '../api';

export default function ExamLive() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [phase, setPhase]           = useState('starting');
  const [exam, setExam]             = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [timeLeft, setTimeLeft]     = useState(0);
  const [flags, setFlags]           = useState({});
  const [results, setResults]       = useState({});
  const [msg, setMsg]               = useState('');
  const [finishing, setFinishing]   = useState(false);
  const [finalResult, setFinalResult] = useState(null);
  const [errorMsg, setErrorMsg]     = useState('');
  const [expanded, setExpanded]     = useState({});
  const timerRef = useRef(null);

  useEffect(() => {
    const start = async () => {
      try {
        const r = await api.post(`/exams/${id}/start`);
        setExam(r.data.exam);
        if (r.data.session.status === 'finished' || r.data.session.status === 'timed_out') {
          setPhase('finished'); return;
        }
        const cr = await api.get(`/exams/${id}/challenges`);
        const chals = cr.data.challenges || [];
        setChallenges(chals);
        setTotalPoints(cr.data.total_points || 0);
        setTimeLeft(cr.data.time_left_seconds || 0);
        // Ouvrir tous les challenges non résolus par défaut
        const exp = {};
        chals.forEach(c => { if (!c.solved) exp[c.id] = true; });
        setExpanded(exp);
        setPhase('active');
      } catch (err) {
        setErrorMsg(err.response?.data?.error || "Erreur démarrage examen");
        setPhase('error');
      }
    };
    start();
  }, [id]);

  useEffect(() => {
    if (phase !== 'active') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); finishExam(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const refreshChallenges = useCallback(async () => {
    try {
      const cr = await api.get(`/exams/${id}/challenges`);
      setChallenges(cr.data.challenges || []);
    } catch {}
  }, [id]);

  const submitFlag = async (challengeId) => {
    const flag = (flags[challengeId] || '').trim();
    if (!flag) return;
    setMsg('');
    try {
      const r = await api.post(`/exams/${id}/submit`, { challenge_id: challengeId, flag });
      setResults(prev => ({ ...prev, [challengeId]: r.data }));
      setMsg(r.data.message);
      if (r.data.correct) {
        setExpanded(prev => ({ ...prev, [challengeId]: false }));
        await refreshChallenges();
      }
    } catch (err) {
      setMsg(err.response?.data?.error || '❌ Erreur soumission');
    }
  };

  const finishExam = async (auto = false) => {
    if (finishing) return;
    if (!auto && !confirm('Terminer l\'examen maintenant ?')) return;
    setFinishing(true);
    clearInterval(timerRef.current);
    try {
      const r = await api.post(`/exams/${id}/finish`);
      setFinalResult(r.data);
      setPhase('finished');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Erreur fin examen');
      setFinishing(false);
    }
  };

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const solved = challenges.filter(c => c.solved).length;
  const score  = challenges.filter(c => c.solved).reduce((sum, c) => sum + (c.points || 0), 0);
  const urgent = timeLeft > 0 && timeLeft < 300;

  if (phase === 'starting') return (
    <div className="min-h-screen bg-nkt-bg flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-nkt-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-mono text-sm text-nkt-muted">Démarrage de l'examen...</p>
      </div>
    </div>
  );

  if (phase === 'error') return (
    <div className="min-h-screen bg-nkt-bg flex items-center justify-center p-4">
      <div className="bg-nkt-card border border-nkt-red/30 rounded-xl p-8 text-center max-w-md">
        <XCircle size={48} className="text-nkt-red mx-auto mb-4" />
        <h2 className="font-mono text-lg font-bold text-nkt-text mb-2">Accès refusé</h2>
        <p className="font-mono text-sm text-nkt-muted mb-6">{errorMsg}</p>
        <button onClick={() => navigate('/my-school')} className="nkt-btn nkt-btn-solid px-6 py-3 rounded font-mono text-sm">← Retour</button>
      </div>
    </div>
  );

  if (phase === 'finished') return (
    <div className="min-h-screen bg-nkt-bg flex items-center justify-center p-4">
      <div className="bg-nkt-card border border-nkt-green/30 rounded-xl p-8 text-center max-w-md w-full relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-nkt-green to-transparent" />
        <Trophy size={48} className="text-yellow-400 mx-auto mb-4" />
        <h2 className="font-display text-2xl font-bold text-nkt-text mb-2">Examen Terminé !</h2>
        {finalResult ? (
          <>
            <div className="my-6">
              <p className="font-display text-5xl font-bold text-nkt-green">{finalResult.percentage}%</p>
              <p className="font-mono text-sm text-nkt-muted mt-1">score final</p>
            </div>
            {finalResult.certificate && (
              <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-3 mb-4">
                <p className="font-mono text-sm text-yellow-400 font-bold">🏅 Certificat débloqué !</p>
              </div>
            )}
          </>
        ) : (
          <p className="font-mono text-sm text-nkt-muted my-6">Résultats disponibles dans Mon École</p>
        )}
        <button onClick={() => navigate('/my-school')} className="nkt-btn nkt-btn-solid px-8 py-3 rounded font-mono text-sm w-full">← Retour à Mon École</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-nkt-bg bg-grid pb-12">

      {/* ── Barre top ── */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-nkt-card/95 backdrop-blur border-b border-nkt-border h-16">
        <div className="max-w-5xl mx-auto px-4 h-full flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] text-nkt-muted tracking-widest">EXAMEN EN COURS</p>
            <p className="font-mono text-sm font-bold text-nkt-text truncate">{exam?.title}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:flex flex-col items-center">
              <p className="font-mono text-[10px] text-nkt-muted">RÉSOLUS</p>
              <p className="font-mono font-bold text-sm text-nkt-green">{solved}/{challenges.length}</p>
            </div>
            <div className="hidden sm:flex flex-col items-center">
              <p className="font-mono text-[10px] text-nkt-muted">SCORE</p>
              <p className="font-display font-bold text-sm text-nkt-green">{score}/{totalPoints}</p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${urgent ? 'border-nkt-red/50 bg-nkt-red/10 animate-pulse' : 'border-nkt-border'}`}>
              <Clock size={13} className={urgent ? 'text-nkt-red' : 'text-nkt-muted'} />
              <span className={`font-mono text-base font-bold tabular-nums ${urgent ? 'text-nkt-red' : 'text-nkt-text'}`}>{fmt(timeLeft)}</span>
            </div>
            <button onClick={() => finishExam(false)} disabled={finishing}
              className="px-4 py-2 rounded border border-nkt-red/40 text-nkt-red hover:bg-nkt-red/10 transition-all font-mono text-xs font-bold disabled:opacity-50 whitespace-nowrap">
              {finishing ? '...' : 'TERMINER'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-20">

        {msg && (
          <div className={`mb-4 p-3 rounded border font-mono text-sm ${msg.includes('🎉') || msg.includes('Correct') ? 'bg-nkt-green/10 border-nkt-green/30 text-nkt-green' : 'bg-nkt-red/10 border-nkt-red/30 text-nkt-red'}`}>
            {msg}
          </div>
        )}

        {/* Progression */}
        <div className="bg-nkt-card border border-nkt-border rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs text-nkt-muted tracking-widest">PROGRESSION</span>
            <span className="font-mono text-xs text-nkt-green font-bold">{solved}/{challenges.length} challenges</span>
          </div>
          <div className="h-2 bg-nkt-bg rounded-full overflow-hidden">
            <div className="h-full bg-nkt-green rounded-full transition-all duration-500"
              style={{ width: `${challenges.length > 0 ? (solved / challenges.length) * 100 : 0}%` }} />
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {challenges.map((ch, i) => (
              <button key={ch.id} onClick={() => setExpanded(p => ({ ...p, [ch.id]: !p[ch.id] }))}
                className={`w-8 h-8 rounded border font-mono text-xs font-bold transition-all ${
                  ch.solved ? 'border-nkt-green bg-nkt-green/20 text-nkt-green' : 'border-nkt-border text-nkt-muted hover:border-nkt-green/30'
                }`}>
                {ch.solved ? '✓' : i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* ── Challenges ── */}
        {challenges.length === 0 ? (
          <div className="text-center py-20">
            <AlertTriangle size={40} className="text-nkt-muted/30 mx-auto mb-3" />
            <p className="font-mono text-sm text-nkt-muted">Aucun challenge dans cet examen</p>
          </div>
        ) : challenges.map((ch, i) => (
          <div key={ch.id} className={`mb-4 rounded-xl border overflow-hidden transition-all ${
            ch.solved ? 'border-nkt-green/40' : 'border-nkt-border'
          }`}>

            {/* Header du challenge — cliquable pour expand/collapse */}
            <button className={`w-full text-left px-6 py-4 flex items-center justify-between gap-4 transition-all ${
              ch.solved ? 'bg-nkt-green/5 hover:bg-nkt-green/8' : 'bg-nkt-card hover:bg-white/[0.02]'
            }`} onClick={() => setExpanded(p => ({ ...p, [ch.id]: !p[ch.id] }))}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center font-mono text-sm font-bold flex-shrink-0 ${
                  ch.solved ? 'border-nkt-green bg-nkt-green/20 text-nkt-green' : 'border-nkt-border text-nkt-muted'
                }`}>
                  {ch.solved ? <CheckCircle size={16} /> : `#${i+1}`}
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-sm font-bold text-nkt-text">{ch.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] font-mono border border-nkt-border text-nkt-muted px-2 py-0.5 rounded">{ch.category}</span>
                    {ch.solved
                      ? <span className="text-[10px] font-mono text-nkt-green border border-nkt-green/30 px-2 py-0.5 rounded bg-nkt-green/10">✓ RÉSOLU</span>
                      : <span className="text-[10px] font-mono text-nkt-muted">En attente...</span>
                    }
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                  <p className="font-display text-xl font-bold text-nkt-green">{ch.points}</p>
                  <p className="text-[10px] font-mono text-nkt-muted">pts</p>
                </div>
                {expanded[ch.id] ? <ChevronUp size={16} className="text-nkt-muted" /> : <ChevronDown size={16} className="text-nkt-muted" />}
              </div>
            </button>

            {/* Contenu expandable */}
            {expanded[ch.id] && (
              <div className="px-6 pb-6 pt-2 bg-nkt-card border-t border-nkt-border/40">

                {/* Description complète */}
                <div className="bg-nkt-bg rounded-lg p-4 mb-4 border border-nkt-border/40">
                  <p className="text-[10px] font-mono text-nkt-muted tracking-widest mb-2">DESCRIPTION</p>
                  <p className="font-mono text-sm text-nkt-text whitespace-pre-wrap leading-relaxed">{ch.description || '—'}</p>
                </div>

                {/* Hint */}
                {ch.hint && (
                  <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-lg px-4 py-3 mb-4">
                    <p className="text-[10px] font-mono text-yellow-400/70 tracking-widest mb-1">INDICE</p>
                    <p className="font-mono text-sm text-yellow-400">{ch.hint}</p>
                  </div>
                )}

                {/* Fichier à télécharger */}
                {ch.file_name && (
                  <div className="mb-4">
                    <p className="text-[10px] font-mono text-nkt-muted tracking-widest mb-2">FICHIER</p>
                    <a href={`${import.meta.env.VITE_API_URL}/admin/challenges/${ch.id}/file`}
                      target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-mono text-nkt-cyan border border-nkt-cyan/30 bg-nkt-cyan/5 px-4 py-2 rounded hover:bg-nkt-cyan/10 transition-all">
                      <Download size={13} /> {ch.file_name}
                    </a>
                  </div>
                )}

                {/* Soumettre flag */}
                {!ch.solved ? (
                  <div>
                    <p className="text-[10px] font-mono text-nkt-muted tracking-widest mb-2">SOUMETTRE LE FLAG</p>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <Flag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nkt-muted" />
                        <input className="nkt-input w-full pl-9 pr-4 py-3 rounded text-sm font-mono"
                          placeholder="NKTCTF{flag_ici}"
                          value={flags[ch.id] || ''}
                          onChange={e => setFlags(p => ({ ...p, [ch.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && submitFlag(ch.id)} />
                      </div>
                      <button onClick={() => submitFlag(ch.id)}
                        className="nkt-btn nkt-btn-solid px-6 py-3 rounded text-sm font-mono font-bold whitespace-nowrap">
                        VALIDER
                      </button>
                    </div>
                    {results[ch.id] && (
                      <p className={`mt-2 font-mono text-xs flex items-center gap-1 ${results[ch.id].correct ? 'text-nkt-green' : 'text-nkt-red'}`}>
                        {results[ch.id].correct ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {results[ch.id].message}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-nkt-green/10 border border-nkt-green/30 rounded-lg px-4 py-3">
                    <CheckCircle size={16} className="text-nkt-green" />
                    <span className="font-mono text-sm text-nkt-green font-bold">Challenge résolu ! +{ch.points} pts</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}