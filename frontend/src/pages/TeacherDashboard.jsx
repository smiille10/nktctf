import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Clock, Users, Trophy, RefreshCw, ChevronDown, ChevronRight, BookOpen, ClipboardList, Star } from 'lucide-react';
import api from '../api';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab]             = useState('exams');
  const [exams, setExams]         = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [sessions, setSessions]   = useState([]);
  const [liveInterval, setLiveInterval] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [msg, setMsg]             = useState('');
  const [grading, setGrading]     = useState({});
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [subs, setSubs]           = useState([]);
  const intervalRef = useRef(null);

  // Charger les examens et devoirs de l'école du prof
  const load = useCallback(async () => {
    try {
      const [exRes, asRes] = await Promise.all([
        api.get('/exams/my-school'),
        api.get('/assignments/my-school'),
      ]);
      setExams(exRes.data || []);
      setAssignments(asRes.data || []);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Erreur chargement'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  // Charger les sessions live d'un examen
  const loadSessions = useCallback(async (examId) => {
    try {
      const r = await api.get(`/exams/${examId}/sessions`);
      setSessions(r.data || []);
    } catch {}
  }, []);

  const openExam = async (exam) => {
    setSelectedExam(exam);
    setSelectedAssignment(null);
    await loadSessions(exam.id);
    // Auto-refresh toutes les 10s
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => loadSessions(exam.id), 10000);
  };

  const closeExam = () => {
    setSelectedExam(null);
    setSessions([]);
    clearInterval(intervalRef.current);
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const openAssignment = async (a) => {
    setSelectedAssignment(a);
    setSelectedExam(null);
    closeExam();
    try {
      const r = await api.get(`/assignments/${a.id}/submissions`);
      setSubs(r.data || []);
      const g = {};
      r.data.forEach(s => { g[s.user_id] = { grade: s.grade ?? '', feedback: s.feedback ?? '' }; });
      setGrading(g);
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Erreur')); }
  };

  const handleGrade = async (assignmentId, userId) => {
    const { grade, feedback } = grading[userId] || {};
    if (grade === '' || grade === undefined) return setMsg('❌ Entre une note');
    try {
      await api.post(`/assignments/${assignmentId}/submissions/${userId}/grade`, { grade: parseInt(grade), feedback });
      setMsg('✅ Note enregistrée !');
      await openAssignment(selectedAssignment);
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Erreur')); }
  };

  const fmt = (s) => {
    if (!s) return '—';
    const sec = Math.max(0, s);
    return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
  };

  const statusColor = {
    in_progress: 'text-nkt-green border-nkt-green/30 bg-nkt-green/10',
    finished:    'text-nkt-muted border-nkt-border bg-transparent',
    timed_out:   'text-nkt-red border-nkt-red/30 bg-nkt-red/10',
  };

  if (loading) return (
    <div className="min-h-screen bg-nkt-bg flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-nkt-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-nkt-bg bg-grid pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4">

        {/* Header */}
        <div className="mb-6">
          <p className="text-[11px] font-mono text-nkt-muted tracking-widest mb-1">TEACHER_DASHBOARD</p>
          <h1 className="font-display text-2xl font-bold text-nkt-text">Espace Enseignant</h1>
          <p className="font-mono text-xs text-nkt-muted mt-1">Connecté en tant que <span className="text-nkt-cyan">{user?.username}</span></p>
        </div>

        {msg && (
          <div className={`mb-4 p-3 rounded border font-mono text-sm ${msg.startsWith('✅') ? 'bg-nkt-green/10 border-nkt-green/30 text-nkt-green' : 'bg-nkt-red/10 border-nkt-red/30 text-nkt-red'}`}>
            {msg} <button onClick={() => setMsg('')} className="ml-3 opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-nkt-border">
          {[
            { id: 'exams', label: 'EXAMENS', icon: ClipboardList },
            { id: 'assignments', label: 'DEVOIRS', icon: BookOpen },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setTab(id); closeExam(); setSelectedAssignment(null); }}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-mono font-semibold tracking-wider border-b-2 transition-all ${
                tab === id ? 'border-nkt-green text-nkt-green' : 'border-transparent text-nkt-muted hover:text-nkt-text'
              }`}>
              <Icon size={13} /> {label}
            </button>
          ))}
          <button onClick={load} className="ml-auto flex items-center gap-1 text-nkt-muted hover:text-nkt-text transition-colors text-xs font-mono px-3 py-3">
            <RefreshCw size={12} /> Actualiser
          </button>
        </div>

        {/* ══ EXAMENS ══ */}
        {tab === 'exams' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Liste examens */}
            <div className="space-y-3">
              <p className="font-mono text-xs text-nkt-muted tracking-widest">{exams.length} EXAMEN{exams.length !== 1 ? 'S' : ''}</p>
              {exams.length === 0 ? (
                <div className="bg-nkt-card border border-nkt-border rounded-xl p-8 text-center">
                  <ClipboardList size={32} className="text-nkt-muted/20 mx-auto mb-3" />
                  <p className="font-mono text-sm text-nkt-muted">Aucun examen dans votre école</p>
                </div>
              ) : exams.map(exam => (
                <button key={exam.id} onClick={() => selectedExam?.id === exam.id ? closeExam() : openExam(exam)}
                  className={`w-full text-left bg-nkt-card border rounded-xl p-4 transition-all hover:border-nkt-green/30 ${
                    selectedExam?.id === exam.id ? 'border-nkt-green/50 bg-nkt-green/5' : 'border-nkt-border'
                  }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                          exam.status === 'active' ? 'text-nkt-green border-nkt-green/30 bg-nkt-green/10' : 'text-nkt-muted border-nkt-border'
                        }`}>{exam.status?.toUpperCase()}</span>
                        <span className="text-[10px] font-mono text-nkt-muted flex items-center gap-1">
                          <Clock size={10} /> {exam.duration_minutes} min
                        </span>
                        <span className="text-[10px] font-mono text-nkt-muted flex items-center gap-1">
                          <Users size={10} /> {exam.participant_count || 0} étudiants
                        </span>
                      </div>
                      <p className="font-mono text-sm font-bold text-nkt-text">{exam.title}</p>
                      <p className="font-mono text-xs text-nkt-muted mt-0.5">{exam.challenge_count || 0} challenges · {exam.school_name}</p>
                    </div>
                    {selectedExam?.id === exam.id ? <ChevronDown size={14} className="text-nkt-green mt-1" /> : <ChevronRight size={14} className="text-nkt-muted mt-1" />}
                  </div>
                </button>
              ))}
            </div>

            {/* Panel live sessions */}
            {selectedExam && (
              <div className="bg-nkt-card border border-nkt-green/30 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-nkt-border flex items-center justify-between">
                  <div>
                    <p className="font-mono text-xs text-nkt-muted tracking-widest">SUIVI EN DIRECT</p>
                    <p className="font-mono text-sm font-bold text-nkt-text">{selectedExam.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-nkt-green animate-pulse" />
                    <span className="font-mono text-[10px] text-nkt-green">LIVE</span>
                    <button onClick={() => loadSessions(selectedExam.id)} className="text-nkt-muted hover:text-nkt-text ml-2">
                      <RefreshCw size={13} />
                    </button>
                  </div>
                </div>

                {sessions.length === 0 ? (
                  <div className="text-center py-12">
                    <Users size={32} className="text-nkt-muted/20 mx-auto mb-3" />
                    <p className="font-mono text-sm text-nkt-muted">Aucun étudiant n'a commencé</p>
                  </div>
                ) : (
                  <div>
                    {/* Stats globales */}
                    <div className="grid grid-cols-3 gap-0 border-b border-nkt-border">
                      {[
                        { label: 'EN COURS', value: sessions.filter(s => s.status === 'in_progress').length, color: '#00ff88' },
                        { label: 'TERMINÉS', value: sessions.filter(s => s.status === 'finished').length, color: '#00d4ff' },
                        { label: 'MEILLEUR', value: Math.max(0, ...sessions.map(s => s.score || 0)) + 'pts', color: '#ffd700' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="px-4 py-3 text-center border-r border-nkt-border last:border-r-0">
                          <p className="font-display text-xl font-bold" style={{ color }}>{value}</p>
                          <p className="text-[10px] font-mono text-nkt-muted">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Liste étudiants */}
                    <div className="divide-y divide-nkt-border/30 max-h-96 overflow-y-auto">
                      {sessions.sort((a, b) => (b.score || 0) - (a.score || 0)).map((s, i) => {
                        const elapsed = s.started_at ? Math.floor((Date.now() - new Date(s.started_at)) / 1000) : 0;
                        const timeRemaining = Math.max(0, (selectedExam.duration_minutes * 60) - elapsed);
                        const pct = selectedExam.challenge_count > 0 ? Math.round((s.solved_count || 0) / selectedExam.challenge_count * 100) : 0;

                        return (
                          <div key={s.user_id} className="px-5 py-3">
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-xs text-nkt-muted w-5 flex-shrink-0">#{i+1}</span>
                                <div className="w-7 h-7 rounded-lg border border-nkt-border bg-nkt-bg flex items-center justify-center text-xs font-bold text-nkt-muted flex-shrink-0">
                                  {s.username?.[0]?.toUpperCase()}
                                </div>
                                <span className="font-mono text-sm font-bold text-nkt-text truncate">{s.username}</span>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${statusColor[s.status] || 'text-nkt-muted border-nkt-border'}`}>
                                  {s.status === 'in_progress' ? '▶ EN COURS' : s.status === 'finished' ? '✓ TERMINÉ' : '⏱ EXPIRÉ'}
                                </span>
                                <span className="font-display text-base font-bold text-nkt-green">{s.score || 0}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 ml-14">
                              {s.status === 'in_progress' && (
                                <div className="flex items-center gap-1 text-[10px] font-mono text-nkt-muted">
                                  <Clock size={10} className={timeRemaining < 300 ? 'text-nkt-red' : ''} />
                                  <span className={timeRemaining < 300 ? 'text-nkt-red font-bold' : ''}>{fmt(timeRemaining)}</span>
                                </div>
                              )}
                              <div className="flex-1 h-1.5 bg-nkt-bg rounded-full overflow-hidden">
                                <div className="h-full bg-nkt-green/60 rounded-full transition-all"
                                  style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] font-mono text-nkt-muted">{s.solved_count || 0}/{selectedExam.challenge_count || 0}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ DEVOIRS ══ */}
        {tab === 'assignments' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Liste devoirs */}
            <div className="space-y-3">
              <p className="font-mono text-xs text-nkt-muted tracking-widest">{assignments.length} DEVOIR{assignments.length !== 1 ? 'S' : ''}</p>
              {assignments.length === 0 ? (
                <div className="bg-nkt-card border border-nkt-border rounded-xl p-8 text-center">
                  <BookOpen size={32} className="text-nkt-muted/20 mx-auto mb-3" />
                  <p className="font-mono text-sm text-nkt-muted">Aucun devoir dans votre école</p>
                </div>
              ) : assignments.map(a => {
                const expired = a.due_date && new Date(a.due_date) < new Date();
                return (
                  <button key={a.id} onClick={() => selectedAssignment?.id === a.id ? setSelectedAssignment(null) : openAssignment(a)}
                    className={`w-full text-left bg-nkt-card border rounded-xl p-4 transition-all hover:border-purple-500/30 ${
                      selectedAssignment?.id === a.id ? 'border-purple-500/50 bg-purple-500/5' : 'border-nkt-border'
                    }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                            expired ? 'text-nkt-red border-nkt-red/30 bg-nkt-red/10' : 'text-nkt-green border-nkt-green/30 bg-nkt-green/10'
                          }`}>{expired ? '⛔ EXPIRÉ' : '✓ ACTIF'}</span>
                          <span className="text-[10px] font-mono text-nkt-muted">
                            📅 {a.due_date ? new Date(a.due_date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </span>
                        </div>
                        <p className="font-mono text-sm font-bold text-nkt-text">{a.title}</p>
                        <p className="font-mono text-xs text-nkt-muted mt-0.5">{a.submission_count || 0} rendu{(a.submission_count || 0) !== 1 ? 's' : ''}</p>
                      </div>
                      <Star size={14} className="text-yellow-400 mt-1 flex-shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Panel corrections */}
            {selectedAssignment && (
              <div className="bg-nkt-card border rounded-xl overflow-hidden" style={{ borderColor: 'rgba(168,85,247,0.3)' }}>
                <div className="px-5 py-4 border-b border-nkt-border">
                  <p className="font-mono text-xs text-nkt-muted tracking-widest">CORRECTIONS</p>
                  <p className="font-mono text-sm font-bold text-nkt-text">{selectedAssignment.title}</p>
                </div>
                {subs.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="font-mono text-sm text-nkt-muted">Aucun rendu pour l'instant</p>
                  </div>
                ) : subs.map(sub => (
                  <div key={sub.user_id} className="border-b border-nkt-border/30 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-mono text-sm font-bold text-nkt-text">{sub.username}</p>
                        <p className="text-[10px] font-mono text-nkt-muted">
                          Rendu : {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString('fr-FR') : '—'}
                        </p>
                      </div>
                      {sub.grade !== null && sub.grade !== undefined && (
                        <div className="text-right">
                          <p className="font-display text-2xl font-bold text-nkt-green">{sub.grade}<span className="text-sm text-nkt-muted">/100</span></p>
                        </div>
                      )}
                    </div>
                    {sub.content && (
                      <div className="bg-nkt-bg border border-nkt-border rounded-lg p-3 mb-3">
                        <p className="text-[10px] font-mono text-nkt-muted mb-1 tracking-widest">RÉPONSE</p>
                        <p className="font-mono text-sm text-nkt-text whitespace-pre-wrap">{sub.content}</p>
                      </div>
                    )}
                    <div className="flex items-end gap-3 flex-wrap pt-2">
                      <div>
                        <label className="block text-[10px] font-mono text-nkt-muted mb-1 tracking-widest">NOTE /100</label>
                        <input type="number" min="0" max="100"
                          className="nkt-input px-3 py-2 rounded text-sm w-20 text-center font-mono font-bold"
                          value={grading[sub.user_id]?.grade ?? ''}
                          onChange={e => setGrading(p => ({ ...p, [sub.user_id]: { ...p[sub.user_id], grade: e.target.value } }))}
                          placeholder="—" />
                      </div>
                      <div className="flex-1 min-w-36">
                        <label className="block text-[10px] font-mono text-nkt-muted mb-1 tracking-widest">COMMENTAIRE</label>
                        <input className="nkt-input w-full px-3 py-2 rounded text-sm font-mono"
                          value={grading[sub.user_id]?.feedback ?? ''}
                          onChange={e => setGrading(p => ({ ...p, [sub.user_id]: { ...p[sub.user_id], feedback: e.target.value } }))}
                          placeholder="Feedback..." />
                      </div>
                      <button onClick={() => handleGrade(selectedAssignment.id, sub.user_id)}
                        className="nkt-btn nkt-btn-solid px-5 py-2 rounded text-xs font-mono font-bold">
                        NOTER
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}