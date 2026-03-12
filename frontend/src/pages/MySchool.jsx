import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, BookOpen, ClipboardList, Clock,
  CheckCircle, AlertCircle, ArrowRight, Trophy, X
} from 'lucide-react';
import api from '../api';

const TABS = [
  { id: 'exams',       label: 'EXAMENS',  icon: ClipboardList },
  { id: 'assignments', label: 'DEVOIRS',  icon: BookOpen      },
  { id: 'results',     label: 'RÉSULTATS',icon: Trophy        },
];

export default function MySchool() {
  const navigate = useNavigate();
  const [school,      setSchool]      = useState(null);
  const [exams,       setExams]       = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [tab,         setTab]         = useState('exams');
  const [loading,     setLoading]     = useState(true);
  const [joinCode,    setJoinCode]    = useState('');
  const [examCode,    setExamCode]    = useState('');
  const [msg,         setMsg]         = useState('');
  const [joiningExam, setJoiningExam] = useState(false);

  // ── Devoir modal ──
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submitContent,      setSubmitContent]      = useState('');
  const [submitFile,         setSubmitFile]         = useState(null);
  const [submitting,         setSubmitting]         = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [schoolRes, examsRes, assignRes] = await Promise.all([
          api.get('/schools/my'),
          api.get('/exams/my'),
          api.get('/assignments/my'),
        ]);
        setSchool(schoolRes.data);
        setExams(examsRes.data || []);
        setAssignments(assignRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleJoinSchool = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post('/schools/join', { code: joinCode.toUpperCase() });
      setSchool(r.data.school);
      setMsg('✅ ' + r.data.message);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Code invalide'));
    }
  };

  const handleJoinExam = async (e) => {
    e.preventDefault();
    setJoiningExam(true); setMsg('');
    try {
      const r = await api.post('/exams/join', { code: examCode.toUpperCase() });
      navigate(`/exam/${r.data.exam.id}/live`);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Code invalide'));
    } finally {
      setJoiningExam(false);
    }
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      if (submitContent) formData.append('content', submitContent);
      if (submitFile)    formData.append('file', submitFile);
      await api.post(`/assignments/${selectedAssignment.id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMsg('✅ Devoir rendu !');
      setSelectedAssignment(null);
      setSubmitContent(''); setSubmitFile(null);
      const r = await api.get('/assignments/my');
      setAssignments(r.data || []);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Erreur'));
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const isExpired = (d) => d && new Date(d) < new Date();
  const isUrgent  = (d) => {
    if (!d) return false;
    const diff = new Date(d) - new Date();
    return diff > 0 && diff < 48 * 3600 * 1000;
  };

  if (loading) return (
    <div className="min-h-screen bg-nkt-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-nkt-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── Pas encore dans une école ──
  if (!school) return (
    <div className="min-h-screen bg-nkt-bg bg-grid pt-20 pb-12 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-nkt-card border border-nkt-border rounded-xl p-8 relative overflow-hidden text-center">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
          <GraduationCap size={40} className="mx-auto mb-4" style={{ color: '#a855f7' }} />
          <h2 className="font-display text-xl font-bold text-nkt-text mb-2">Rejoindre une École</h2>
          <p className="font-mono text-xs text-nkt-muted mb-6">Entre le code fourni par ton professeur</p>

          {msg && (
            <div className={`mb-4 p-3 rounded border font-mono text-sm ${msg.startsWith('✅') ? 'bg-nkt-green/10 border-nkt-green/30 text-nkt-green' : 'bg-nkt-red/10 border-nkt-red/30 text-nkt-red'}`}>
              {msg}
            </div>
          )}

          <form onSubmit={handleJoinSchool} className="space-y-3">
            <input className="nkt-input w-full px-4 py-4 rounded-lg text-center text-2xl font-mono font-bold tracking-[0.5em] uppercase"
              placeholder="XXXX" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 8))} required />
            <button type="submit" className="w-full py-3 rounded-lg font-mono text-sm font-bold flex items-center justify-center gap-2"
              style={{ background: '#a855f7', color: '#080d14' }}>
              <ArrowRight size={16} /> REJOINDRE
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  // ── Dashboard principal ──
  return (
    <div className="min-h-screen bg-nkt-bg bg-grid pt-20 pb-12">
      <div className="max-w-5xl mx-auto px-4">

        {/* Header école */}
        <div className="bg-nkt-card border border-nkt-border rounded-xl p-5 mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-display font-bold text-xl"
                style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', color: '#a855f7' }}>
                {school.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-[10px] font-mono text-nkt-muted tracking-widest">MON ÉCOLE</p>
                <h1 className="font-display text-lg font-bold text-nkt-text">{school.name}</h1>
                <p className="text-[10px] font-mono text-nkt-muted capitalize">{school.my_role} · Plan {school.plan}</p>
              </div>
            </div>

            {/* Rejoindre un examen */}
            <form onSubmit={handleJoinExam} className="flex gap-2">
              <input className="nkt-input px-4 py-2 rounded-lg text-sm font-mono font-bold tracking-widest uppercase w-32 text-center"
                placeholder="CODE" value={examCode} onChange={e => setExamCode(e.target.value.toUpperCase().slice(0, 8))} />
              <button type="submit" disabled={joiningExam || !examCode.trim()}
                className="nkt-btn nkt-btn-solid px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-1 disabled:opacity-50">
                {joiningExam ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <><ArrowRight size={13} /> EXAMEN</>}
              </button>
            </form>
          </div>
        </div>

        {msg && (
          <div className={`mb-4 p-3 rounded border font-mono text-sm flex items-center justify-between ${msg.startsWith('✅') ? 'bg-nkt-green/10 border-nkt-green/30 text-nkt-green' : 'bg-nkt-red/10 border-nkt-red/30 text-nkt-red'}`}>
            <span>{msg}</span>
            <button onClick={() => setMsg('')}><X size={14} /></button>
          </div>
        )}

        {/* Stats rapides */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'EXAMENS', value: exams.length, color: '#00d4ff' },
            { label: 'DEVOIRS', value: assignments.length, color: '#a855f7' },
            { label: 'COMPLÉTÉS', value: assignments.filter(a => a.submitted).length, color: '#00ff88' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-nkt-card border border-nkt-border rounded-lg p-4 text-center">
              <p className="font-display text-2xl font-bold" style={{ color }}>{value}</p>
              <p className="text-[10px] font-mono text-nkt-muted tracking-widest mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-nkt-border">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-mono font-semibold tracking-wider border-b-2 transition-all ${
                tab === id ? 'border-nkt-green text-nkt-green' : 'border-transparent text-nkt-muted hover:text-nkt-text'
              }`}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* ── EXAMENS ── */}
        {tab === 'exams' && (
          <div className="space-y-3">
            {exams.length === 0 ? (
              <div className="text-center py-16 bg-nkt-card border border-nkt-border rounded-xl">
                <ClipboardList size={40} className="text-nkt-muted/20 mx-auto mb-3" />
                <p className="font-mono text-sm text-nkt-muted">Aucun examen disponible</p>
              </div>
            ) : exams.map(exam => (
              <div key={exam.id} className="bg-nkt-card border border-nkt-border rounded-xl p-5 hover:border-nkt-green/30 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                        exam.status === 'active' ? 'text-nkt-green border-nkt-green/30 bg-nkt-green/10' :
                        exam.status === 'finished' ? 'text-nkt-muted border-nkt-border' :
                        'text-nkt-cyan border-nkt-cyan/30 bg-nkt-cyan/10'
                      }`}>
                        {exam.status === 'active' ? '🟢 ACTIF' : exam.status === 'finished' ? '⛔ TERMINÉ' : '⏳ BIENTÔT'}
                      </span>
                      {exam.session_status && (
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          exam.session_status === 'finished' ? 'text-nkt-green border-nkt-green/30 bg-nkt-green/10' :
                          exam.session_status === 'in_progress' ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' :
                          'text-nkt-red border-nkt-red/30'
                        }`}>
                          {exam.session_status === 'finished' ? '✓ COMPLÉTÉ' : exam.session_status === 'in_progress' ? '▶ EN COURS' : '⏰ EXPIRÉ'}
                        </span>
                      )}
                    </div>
                    <h3 className="font-mono text-base font-bold text-nkt-text">{exam.title}</h3>
                    {exam.description && <p className="font-mono text-xs text-nkt-muted mt-1">{exam.description}</p>}
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      <span className="flex items-center gap-1 text-[11px] font-mono text-nkt-muted">
                        <Clock size={11} /> {exam.duration_minutes} min
                      </span>
                      {exam.start_date && (
                        <span className="text-[11px] font-mono text-nkt-muted">
                          📅 {formatDate(exam.start_date)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {exam.session_status === 'finished' ? (
                      <div>
                        <p className="font-display text-2xl font-bold text-nkt-green">{exam.score}</p>
                        <p className="text-[10px] font-mono text-nkt-muted">pts</p>
                      </div>
                    ) : exam.status === 'active' && !exam.session_status ? (
                      <button onClick={() => { setExamCode(''); navigate(`/exam/${exam.id}/live`); }}
                        className="nkt-btn nkt-btn-solid px-5 py-2.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2">
                        COMMENCER <ArrowRight size={13} />
                      </button>
                    ) : exam.session_status === 'in_progress' ? (
                      <button onClick={() => navigate(`/exam/${exam.id}/live`)}
                        className="px-5 py-2.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 border border-yellow-400/30 bg-yellow-400/10 text-yellow-400">
                        CONTINUER <ArrowRight size={13} />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── DEVOIRS ── */}
        {tab === 'assignments' && (
          <div className="space-y-3">
            {assignments.length === 0 ? (
              <div className="text-center py-16 bg-nkt-card border border-nkt-border rounded-xl">
                <BookOpen size={40} className="text-nkt-muted/20 mx-auto mb-3" />
                <p className="font-mono text-sm text-nkt-muted">Aucun devoir disponible</p>
              </div>
            ) : assignments.map(a => (
              <div key={a.id} className={`bg-nkt-card border rounded-xl p-5 transition-all ${
                isExpired(a.due_date) && !a.submitted ? 'border-nkt-red/30' :
                isUrgent(a.due_date) ? 'border-yellow-400/30' :
                'border-nkt-border hover:border-purple-500/30'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {a.submitted ? (
                        <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border text-nkt-green border-nkt-green/30 bg-nkt-green/10">
                          <CheckCircle size={10} /> RENDU
                        </span>
                      ) : isExpired(a.due_date) ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded border text-nkt-red border-nkt-red/30 bg-nkt-red/10">
                          ⛔ EXPIRÉ
                        </span>
                      ) : isUrgent(a.due_date) ? (
                        <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border text-yellow-400 border-yellow-400/30 bg-yellow-400/10">
                          <AlertCircle size={10} /> URGENT
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded border text-nkt-cyan border-nkt-cyan/30 bg-nkt-cyan/10">
                          EN ATTENTE
                        </span>
                      )}
                    </div>
                    <h3 className="font-mono text-base font-bold text-nkt-text">{a.title}</h3>
                    {a.description && <p className="font-mono text-xs text-nkt-muted mt-1 line-clamp-2">{a.description}</p>}
                    <p className="text-[11px] font-mono text-nkt-muted mt-2">
                      📅 Date limite : <span className={isUrgent(a.due_date) ? 'text-yellow-400 font-bold' : ''}>{formatDate(a.due_date)}</span>
                    </p>
                    {a.submitted && a.grade !== null && (
                      <div className="mt-3 p-3 bg-nkt-green/5 border border-nkt-green/20 rounded-lg">
                        <p className="font-mono text-sm font-bold text-nkt-green">Note : {a.grade}/100</p>
                        {a.feedback && <p className="font-mono text-xs text-nkt-muted mt-1">💬 {a.feedback}</p>}
                      </div>
                    )}
                  </div>
                  {!a.submitted && !isExpired(a.due_date) && (
                    <button onClick={() => setSelectedAssignment(a)}
                      className="flex-shrink-0 px-5 py-2.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2"
                      style={{ background: '#a855f7', color: '#080d14' }}>
                      RENDRE <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── RÉSULTATS ── */}
        {tab === 'results' && (
          <div className="space-y-3">
            {exams.filter(e => e.session_status === 'finished').length === 0 ? (
              <div className="text-center py-16 bg-nkt-card border border-nkt-border rounded-xl">
                <Trophy size={40} className="text-nkt-muted/20 mx-auto mb-3" />
                <p className="font-mono text-sm text-nkt-muted">Aucun résultat pour l'instant</p>
              </div>
            ) : exams.filter(e => e.session_status === 'finished').map(exam => (
              <div key={exam.id} className="bg-nkt-card border border-nkt-border rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-mono text-base font-bold text-nkt-text">{exam.title}</h3>
                    <p className="text-[11px] font-mono text-nkt-muted mt-1">
                      Complété le {formatDate(exam.finished_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-3xl font-bold text-nkt-green">{exam.score}</p>
                    <p className="text-[10px] font-mono text-nkt-muted">points</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Modal rendre devoir ── */}
        {selectedAssignment && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-nkt-card border-2 rounded-xl p-6 w-full max-w-lg relative overflow-hidden" style={{ borderColor: 'rgba(168,85,247,0.4)' }}>
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-mono text-sm font-bold" style={{ color: '#a855f7' }}>RENDRE — {selectedAssignment.title}</h2>
                <button onClick={() => { setSelectedAssignment(null); setSubmitContent(''); setSubmitFile(null); }}
                  className="text-nkt-muted hover:text-nkt-text"><X size={18} /></button>
              </div>
              {selectedAssignment.description && (
                <div className="bg-nkt-bg border border-nkt-border rounded-lg p-3 mb-4">
                  <p className="font-mono text-xs text-nkt-muted">{selectedAssignment.description}</p>
                </div>
              )}
              <form onSubmit={handleSubmitAssignment} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">TA RÉPONSE</label>
                  <textarea className="nkt-input w-full px-4 py-3 rounded-lg text-sm h-32 resize-none font-mono"
                    placeholder="Écris ta réponse ici..." value={submitContent}
                    onChange={e => setSubmitContent(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">FICHIER (optionnel)</label>
                  <label className="flex items-center gap-3 nkt-input px-4 py-2.5 rounded-lg text-sm cursor-pointer hover:border-purple-500/50 transition-all">
                    <span className="text-nkt-muted text-xs truncate">
                      {submitFile ? `📎 ${submitFile.name}` : 'Choisir un fichier...'}
                    </span>
                    <input type="file" className="hidden" onChange={e => setSubmitFile(e.target.files[0])} />
                  </label>
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={submitting || (!submitContent && !submitFile)}
                    className="flex-1 py-3 rounded-lg text-sm font-mono font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: '#a855f7', color: '#080d14' }}>
                    {submitting ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      : <><CheckCircle size={14} /> SOUMETTRE</>}
                  </button>
                  <button type="button" onClick={() => { setSelectedAssignment(null); setSubmitContent(''); setSubmitFile(null); }}
                    className="nkt-btn px-5 py-3 rounded-lg text-sm">ANNULER</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}