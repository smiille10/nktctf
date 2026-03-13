import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  School, BookOpen, ClipboardList, Trophy, Users, Home,
  GraduationCap, BarChart2, Plus, Clock, CheckCircle,
  XCircle, Star, Medal, RefreshCw, ChevronRight, Flag,
  AlertTriangle, Play, FileText
} from 'lucide-react';
import api from '../api';

// ─── Helpers ───────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const timeAgo = (d) => {
  if (!d) return '';
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60)    return 'À l\'instant';
  if (diff < 3600)  return `Il y a ${Math.floor(diff/60)}min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff/3600)}h`;
  return `Il y a ${Math.floor(diff/86400)}j`;
};

const FEED_ICONS = {
  exam:        { icon: ClipboardList, color: '#00ff88', label: 'EXAMEN'      },
  assignment:  { icon: FileText,      color: '#00d4ff', label: 'DEVOIR'      },
  course:      { icon: BookOpen,      color: '#a855f7', label: 'COURS'       },
  certificate: { icon: Medal,         color: '#ffd700', label: 'CERTIFICAT'  },
};

// ─── Composants réutilisables ───────────────────────────
const StatCard = ({ icon: Icon, label, value, color = '#00ff88' }) => (
  <div className="bg-nkt-card border border-nkt-border rounded-xl p-4 flex items-center gap-4">
    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
      <Icon size={18} style={{ color }} />
    </div>
    <div>
      <p className="font-display text-xl font-bold text-nkt-text">{value}</p>
      <p className="font-mono text-[10px] text-nkt-muted tracking-widest">{label}</p>
    </div>
  </div>
);

const TabBtn = ({ active, onClick, icon: Icon, label, color }) => (
  <button onClick={onClick}
    className={`flex items-center gap-2 px-4 py-3 text-[11px] font-mono font-semibold tracking-wider border-b-2 transition-all whitespace-nowrap ${
      active ? 'border-b-2' : 'border-transparent text-nkt-muted hover:text-nkt-text'
    }`}
    style={active ? { borderColor: color || '#00ff88', color: color || '#00ff88' } : {}}>
    <Icon size={13} /> {label}
  </button>
);

// ═══════════════════════════════════════════════════════
export default function MySchool() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab]         = useState('home');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]         = useState('');
  const [schoolData, setSchoolData]   = useState(null);
  const [feed, setFeed]               = useState([]);
  const [exams, setExams]             = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses]         = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [certificates, setCertificates] = useState([]);

  // Teacher states
  const [newExam, setNewExam]         = useState({ title: '', duration_minutes: 60, challenge_ids: [] });
  const [newAssign, setNewAssign]     = useState({ title: '', description: '', due_date: '' });
  const [allChallenges, setAllChallenges] = useState([]);
  const [showExamForm, setShowExamForm]   = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [gradingMap, setGradingMap]   = useState({});
  const [selectedDevoir, setSelectedDevoir] = useState(null);
  const [devoirSubs, setDevoirSubs]   = useState([]);
  const [liveExam, setLiveExam]       = useState(null);
  const [liveSessions, setLiveSessions] = useState([]);
  const liveRef = useRef(null);

  const isTeacher = schoolData?.my_role === 'teacher';

  const loadAll = useCallback(async () => {
    try {
      const [schoolRes, feedRes] = await Promise.all([
        api.get('/schools/my/full'),
        api.get('/schools/my/feed'),
      ]);
      setSchoolData(schoolRes.data);
      setFeed(feedRes.data || []);
    } catch (err) {
      if (err.response?.status === 404) navigate('/join-school');
      else setMsg('❌ ' + (err.response?.data?.error || 'Erreur chargement'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTab = useCallback(async (t) => {
    try {
      if (t === 'exams') {
        const r = await api.get(isTeacher ? '/exams/my-school' : '/exams/my');
        setExams(r.data || []);
      } else if (t === 'assignments') {
        const r = await api.get(isTeacher ? '/assignments/my-school' : '/assignments/my');
        setAssignments(r.data || []);
      } else if (t === 'courses') {
        const r = await api.get('/courses/my-school');
        setCourses(r.data || []);
      } else if (t === 'leaderboard') {
        const r = await api.get('/schools/my/leaderboard');
        setLeaderboard(r.data || []);
      } else if (t === 'certificates') {
        const r = await api.get('/schools/my/certificates');
        setCertificates(r.data || []);
      } else if (t === 'exams_teacher' && isTeacher) {
        const [exRes, chalRes] = await Promise.all([
          api.get('/exams/my-school'),
          api.get('/challenges'),
        ]);
        setExams(exRes.data || []);
        setAllChallenges(chalRes.data || []);
      }
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Erreur'));
    }
  }, [isTeacher]);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (schoolData) loadTab(tab); }, [tab, schoolData]);

  // Live monitoring pour teacher
  const startLive = async (exam) => {
    setLiveExam(exam);
    const r = await api.get(`/exams/${exam.id}/sessions`);
    setLiveSessions(r.data || []);
    clearInterval(liveRef.current);
    liveRef.current = setInterval(async () => {
      const r2 = await api.get(`/exams/${exam.id}/sessions`);
      setLiveSessions(r2.data || []);
    }, 8000);
  };
  useEffect(() => () => clearInterval(liveRef.current), []);

  // Teacher: créer examen
  const createExam = async () => {
    if (!newExam.title) return setMsg('❌ Titre requis');
    try {
      await api.post('/exams', { ...newExam, school_id: schoolData.school.id });
      setMsg('✅ Examen créé !');
      setShowExamForm(false);
      setNewExam({ title: '', duration_minutes: 60, challenge_ids: [] });
      loadTab('exams_teacher');
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Erreur')); }
  };

  // Teacher: activer/désactiver examen
  const toggleExam = async (exam) => {
    const status = exam.status === 'active' ? 'draft' : 'active';
    try {
      await api.patch(`/exams/${exam.id}/status`, { status });
      setMsg(`✅ Examen ${status === 'active' ? 'activé' : 'désactivé'}`);
      loadTab('exams_teacher');
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Erreur')); }
  };

  // Teacher: créer devoir
  const createAssignment = async () => {
    if (!newAssign.title) return setMsg('❌ Titre requis');
    try {
      await api.post('/assignments', { ...newAssign, school_id: schoolData.school.id });
      setMsg('✅ Devoir créé !');
      setShowAssignForm(false);
      setNewAssign({ title: '', description: '', due_date: '' });
      loadTab('assignments');
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Erreur')); }
  };

  // Teacher: ouvrir corrections
  const openCorrections = async (a) => {
    setSelectedDevoir(a);
    const r = await api.get(`/assignments/${a.id}/submissions`);
    setDevoirSubs(r.data || []);
    const g = {};
    r.data.forEach(s => { g[s.user_id] = { grade: s.grade ?? '', feedback: s.feedback ?? '' }; });
    setGradingMap(g);
  };

  const submitGrade = async (assignId, userId) => {
    const { grade, feedback } = gradingMap[userId] || {};
    if (grade === '') return setMsg('❌ Note requise');
    try {
      await api.post(`/assignments/${assignId}/submissions/${userId}/grade`, { grade: parseInt(grade), feedback });
      setMsg('✅ Note enregistrée');
      openCorrections(selectedDevoir);
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Erreur')); }
  };

  if (loading) return (
    <div className="min-h-screen bg-nkt-bg flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-nkt-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!schoolData) return (
    <div className="min-h-screen bg-nkt-bg flex items-center justify-center p-4">
      <div className="text-center">
        <School size={48} className="text-nkt-muted/20 mx-auto mb-4" />
        <p className="font-mono text-sm text-nkt-muted mb-4">Tu n'es dans aucune école</p>
        <button onClick={() => navigate('/join-school')} className="nkt-btn nkt-btn-solid px-6 py-3 rounded font-mono text-sm">
          Rejoindre une école
        </button>
      </div>
    </div>
  );

  const { school, stats, members } = schoolData;
  const teachers = members.filter(m => m.school_role === 'teacher');
  const students = members.filter(m => m.school_role === 'student');

  // ─── Tabs selon rôle ───
  const studentTabs = [
    { id: 'home',        label: 'ACCUEIL',     icon: Home,          color: '#00ff88' },
    { id: 'courses',     label: 'COURS',       icon: BookOpen,      color: '#a855f7' },
    { id: 'exams',       label: 'EXAMENS',     icon: ClipboardList, color: '#00d4ff' },
    { id: 'assignments', label: 'DEVOIRS',     icon: FileText,      color: '#f59e0b' },
    { id: 'leaderboard', label: 'CLASSEMENT',  icon: Trophy,        color: '#ffd700' },
    { id: 'members',     label: 'MEMBRES',     icon: Users,         color: '#00ff88' },
  ];
  const teacherTabs = [
    { id: 'home',          label: 'ACCUEIL',      icon: Home,          color: '#00ff88' },
    { id: 'students',      label: 'ÉTUDIANTS',    icon: Users,         color: '#00d4ff' },
    { id: 'exams_teacher', label: 'EXAMENS',      icon: ClipboardList, color: '#00d4ff' },
    { id: 'assignments',   label: 'DEVOIRS',      icon: FileText,      color: '#f59e0b' },
    { id: 'courses',       label: 'COURS',        icon: BookOpen,      color: '#a855f7' },
    { id: 'leaderboard',   label: 'CLASSEMENT',   icon: Trophy,        color: '#ffd700' },
    { id: 'certificates',  label: 'CERTIFICATS',  icon: Medal,         color: '#ffd700' },
  ];
  const tabs = isTeacher ? teacherTabs : studentTabs;

  return (
    <div className="min-h-screen bg-nkt-bg bg-grid pb-12 pt-20">
      <div className="max-w-6xl mx-auto px-4">

        {/* ── Header école ── */}
        <div className="bg-nkt-card border border-nkt-border rounded-xl p-5 mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl border border-purple-500/30 bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <School size={22} className="text-purple-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-xl font-bold text-nkt-text">{school.name}</h1>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                    isTeacher ? 'text-purple-400 border-purple-500/30 bg-purple-500/10' : 'text-nkt-green border-nkt-green/30 bg-nkt-green/10'
                  }`}>{isTeacher ? '👨‍🏫 TEACHER' : '🎓 ÉTUDIANT'}</span>
                </div>
                <p className="font-mono text-xs text-nkt-muted mt-0.5">{school.description || 'Bienvenue dans votre espace école'}</p>
              </div>
            </div>
            <div className="flex gap-4 flex-wrap">
              {[
                { label: 'ÉTUDIANTS', value: stats.students, color: '#00ff88' },
                { label: 'PROFS',     value: stats.teachers, color: '#a855f7' },
                { label: 'COURS',     value: stats.courses,  color: '#00d4ff' },
                { label: 'EXAMENS',   value: stats.exams,    color: '#f59e0b' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className="font-display text-xl font-bold" style={{ color }}>{value}</p>
                  <p className="text-[10px] font-mono text-nkt-muted">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {msg && (
          <div className={`mb-4 p-3 rounded border font-mono text-sm ${msg.startsWith('✅') ? 'bg-nkt-green/10 border-nkt-green/30 text-nkt-green' : 'bg-nkt-red/10 border-nkt-red/30 text-nkt-red'}`}>
            {msg} <button onClick={() => setMsg('')} className="ml-2 opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-1 border-b border-nkt-border mb-6 overflow-x-auto">
          {tabs.map(t => (
            <TabBtn key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}
              icon={t.icon} label={t.label} color={t.color} />
          ))}
        </div>

        {/* ══════════════ ACCUEIL ══════════════ */}
        {tab === 'home' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Users}         label="ÉTUDIANTS"  value={stats.students} color="#00ff88" />
              <StatCard icon={ClipboardList} label="EXAMENS"    value={stats.exams}    color="#00d4ff" />
              <StatCard icon={FileText}      label="DEVOIRS"    value={stats.assignments} color="#f59e0b" />
              <StatCard icon={BookOpen}      label="COURS"      value={stats.courses}  color="#a855f7" />
            </div>

            {/* Feed */}
            <div className="bg-nkt-card border border-nkt-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-nkt-border flex items-center justify-between">
                <p className="font-mono text-xs text-nkt-muted tracking-widest">ACTIVITÉ RÉCENTE</p>
                <button onClick={loadAll} className="text-nkt-muted hover:text-nkt-text">
                  <RefreshCw size={13} />
                </button>
              </div>
              {feed.length === 0 ? (
                <div className="text-center py-12">
                  <p className="font-mono text-sm text-nkt-muted">Aucune activité pour l'instant</p>
                </div>
              ) : feed.map((item, i) => {
                const cfg = FEED_ICONS[item.type] || FEED_ICONS.exam;
                const Icon = cfg.icon;
                return (
                  <div key={i} className="flex items-start gap-4 px-5 py-4 border-b border-nkt-border/30 last:border-0 hover:bg-white/[0.02] transition-colors">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}>
                      <Icon size={15} style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                        {item.username && <span className="text-[10px] font-mono text-nkt-muted">par {item.username}</span>}
                      </div>
                      <p className="font-mono text-sm text-nkt-text font-bold mt-0.5">{item.title}</p>
                      <p className="font-mono text-xs text-nkt-muted">{item.subtitle}
                        {item.due_date ? ` · Limite : ${fmtDate(item.due_date)}` : ''}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] text-nkt-muted flex-shrink-0">{timeAgo(item.created_at)}</span>
                  </div>
                );
              })}
            </div>

            {/* Profs de l'école */}
            {teachers.length > 0 && (
              <div className="bg-nkt-card border border-nkt-border rounded-xl p-5">
                <p className="font-mono text-xs text-nkt-muted tracking-widest mb-4">ENSEIGNANTS</p>
                <div className="flex gap-3 flex-wrap">
                  {teachers.map(t => (
                    <div key={t.id} className="flex items-center gap-3 bg-nkt-bg border border-nkt-border rounded-lg px-4 py-3">
                      <div className="w-9 h-9 rounded-lg border border-purple-500/30 bg-purple-500/10 flex items-center justify-center">
                        <span className="font-bold text-sm text-purple-400">{t.username[0].toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-mono text-sm font-bold text-nkt-text">{t.username}</p>
                        <p className="text-[10px] font-mono text-purple-400">TEACHER</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════ COURS ══════════════ */}
        {tab === 'courses' && (
          <div className="space-y-4">
            {courses.length === 0 ? (
              <div className="text-center py-20 bg-nkt-card border border-nkt-border rounded-xl">
                <BookOpen size={40} className="text-nkt-muted/20 mx-auto mb-3" />
                <p className="font-mono text-sm text-nkt-muted">Aucun cours disponible</p>
              </div>
            ) : courses.map(c => (
              <div key={c.id} className="bg-nkt-card border border-nkt-border rounded-xl p-5 hover:border-purple-500/30 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg border border-purple-500/30 bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen size={18} className="text-purple-400" />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-bold text-nkt-text">{c.title}</p>
                      <p className="font-mono text-xs text-nkt-muted mt-1">{c.description || '—'}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] font-mono text-nkt-muted">{c.chapter_count || 0} chapitres</span>
                        {c.progress_percent > 0 && (
                          <span className="text-[10px] font-mono text-purple-400">{c.progress_percent}% complété</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => navigate(`/learn/${c.id}`)}
                    className="nkt-btn nkt-btn-solid px-4 py-2 rounded font-mono text-xs font-bold whitespace-nowrap flex-shrink-0">
                    <Play size={12} className="inline mr-1" /> CONTINUER
                  </button>
                </div>
                {c.progress_percent > 0 && (
                  <div className="mt-4">
                    <div className="h-1.5 bg-nkt-bg rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full transition-all"
                        style={{ width: `${c.progress_percent}%` }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ══════════════ EXAMENS ÉTUDIANT ══════════════ */}
        {tab === 'exams' && !isTeacher && (
          <div className="space-y-4">
            {exams.length === 0 ? (
              <div className="text-center py-20 bg-nkt-card border border-nkt-border rounded-xl">
                <ClipboardList size={40} className="text-nkt-muted/20 mx-auto mb-3" />
                <p className="font-mono text-sm text-nkt-muted">Aucun examen disponible</p>
              </div>
            ) : exams.map(e => {
              const done = e.session_status === 'finished' || e.session_status === 'timed_out';
              const inProgress = e.session_status === 'in_progress';
              return (
                <div key={e.id} className={`bg-nkt-card border rounded-xl p-5 transition-all ${
                  done ? 'border-nkt-border' : inProgress ? 'border-nkt-green/40' : 'border-nkt-border hover:border-nkt-green/20'
                }`}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                          done ? 'text-nkt-muted border-nkt-border' :
                          inProgress ? 'text-nkt-green border-nkt-green/30 bg-nkt-green/10' :
                          'text-nkt-cyan border-nkt-cyan/30 bg-nkt-cyan/10'
                        }`}>
                          {done ? '✓ TERMINÉ' : inProgress ? '▶ EN COURS' : '● DISPONIBLE'}
                        </span>
                        <span className="text-[10px] font-mono text-nkt-muted flex items-center gap-1">
                          <Clock size={10} /> {e.duration_minutes} min
                        </span>
                        <span className="text-[10px] font-mono text-nkt-muted">
                          {e.challenge_count || 0} challenges
                        </span>
                      </div>
                      <p className="font-mono text-sm font-bold text-nkt-text">{e.title}</p>
                      {done && e.score !== null && (
                        <div className="mt-2 flex items-center gap-3">
                          <span className="font-display text-lg font-bold text-nkt-green">{e.score} pts</span>
                          {e.session_status === 'timed_out' && (
                            <span className="text-[10px] font-mono text-nkt-red border border-nkt-red/30 px-2 py-0.5 rounded">TEMPS ÉCOULÉ</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {done ? (
                        <span className="font-mono text-xs text-nkt-muted">Terminé le {fmtDate(e.finished_at)}</span>
                      ) : (
                        <button onClick={() => navigate(`/exam/${e.id}/live`)}
                          className="nkt-btn nkt-btn-solid px-5 py-2.5 rounded font-mono text-sm font-bold">
                          {inProgress ? '▶ CONTINUER' : '▶ COMMENCER'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════ DEVOIRS ÉTUDIANT ══════════════ */}
        {tab === 'assignments' && !isTeacher && (
          <div className="space-y-4">
            {assignments.length === 0 ? (
              <div className="text-center py-20 bg-nkt-card border border-nkt-border rounded-xl">
                <FileText size={40} className="text-nkt-muted/20 mx-auto mb-3" />
                <p className="font-mono text-sm text-nkt-muted">Aucun devoir</p>
              </div>
            ) : assignments.map(a => {
              const expired = a.due_date && new Date(a.due_date) < new Date();
              return (
                <AssignmentCard key={a.id} a={a} expired={expired} onRefresh={() => loadTab('assignments')} setMsg={setMsg} />
              );
            })}
          </div>
        )}

        {/* ══════════════ CLASSEMENT ══════════════ */}
        {tab === 'leaderboard' && (
          <div className="bg-nkt-card border border-nkt-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-nkt-border">
              <p className="font-mono text-xs text-nkt-muted tracking-widest">CLASSEMENT DE LA CLASSE</p>
              <p className="font-mono text-sm font-bold text-nkt-text mt-0.5">{school.name}</p>
            </div>
            {leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <Trophy size={32} className="text-nkt-muted/20 mx-auto mb-3" />
                <p className="font-mono text-sm text-nkt-muted">Pas encore de données</p>
              </div>
            ) : leaderboard.map((s, i) => {
              const isMe = s.id === user?.id;
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
              return (
                <div key={s.id} className={`flex items-center gap-4 px-5 py-4 border-b border-nkt-border/30 last:border-0 transition-colors ${
                  isMe ? 'bg-nkt-green/5 border-l-2 border-l-nkt-green' : 'hover:bg-white/[0.02]'
                }`}>
                  <div className="w-8 text-center flex-shrink-0">
                    {medal ? (
                      <span className="text-lg">{medal}</span>
                    ) : (
                      <span className="font-mono text-sm text-nkt-muted">#{i+1}</span>
                    )}
                  </div>
                  <div className="w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: isMe ? '#00ff88' : '#1e2a1e', background: isMe ? '#00ff8815' : '#0d1117' }}>
                    <span className="font-bold text-sm" style={{ color: isMe ? '#00ff88' : '#6b7280' }}>
                      {s.username[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-mono text-sm font-bold ${isMe ? 'text-nkt-green' : 'text-nkt-text'}`}>
                      {s.username} {isMe && <span className="text-[10px] normal-case">(toi)</span>}
                    </p>
                    <div className="flex gap-3 mt-0.5">
                      <span className="text-[10px] font-mono text-nkt-muted">{s.exams_done} examens</span>
                      <span className="text-[10px] font-mono text-yellow-400">{s.certificates} certificats</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-display text-lg font-bold text-nkt-green">{s.exam_score}</p>
                    <p className="text-[10px] font-mono text-nkt-muted">pts exam</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════ MEMBRES ══════════════ */}
        {tab === 'members' && (
          <div className="space-y-6">
            {teachers.length > 0 && (
              <div>
                <p className="font-mono text-xs text-nkt-muted tracking-widest mb-3">ENSEIGNANTS ({teachers.length})</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {teachers.map(t => (
                    <div key={t.id} className="bg-nkt-card border border-nkt-border rounded-xl p-4 flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl border border-purple-500/30 bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-lg text-purple-400">{t.username[0].toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-mono text-sm font-bold text-nkt-text">{t.username}</p>
                        <p className="text-[10px] font-mono text-purple-400 mt-0.5">TEACHER · Depuis {fmtDate(t.joined_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="font-mono text-xs text-nkt-muted tracking-widest mb-3">ÉTUDIANTS ({students.length})</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {students.map(s => {
                  const isMe = s.id === user?.id;
                  return (
                    <div key={s.id} className={`bg-nkt-card border rounded-xl p-4 flex items-center gap-4 ${isMe ? 'border-nkt-green/30' : 'border-nkt-border'}`}>
                      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${isMe ? 'border-nkt-green/40 bg-nkt-green/10' : 'border-nkt-border bg-nkt-bg'}`}>
                        <span className={`font-bold text-lg ${isMe ? 'text-nkt-green' : 'text-nkt-muted'}`}>{s.username[0].toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-mono text-sm font-bold ${isMe ? 'text-nkt-green' : 'text-nkt-text'}`}>
                          {s.username} {isMe && <span className="text-[10px] text-nkt-muted">(toi)</span>}
                        </p>
                        <p className="text-[10px] font-mono text-nkt-muted mt-0.5">{s.score || 0} pts CTF</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ TEACHER: ÉTUDIANTS ══════════════ */}
        {tab === 'students' && isTeacher && (
          <div className="bg-nkt-card border border-nkt-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-nkt-border">
              <p className="font-mono text-xs text-nkt-muted tracking-widest">MES ÉTUDIANTS ({students.length})</p>
            </div>
            {students.map((s, i) => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-4 border-b border-nkt-border/30 last:border-0">
                <span className="font-mono text-xs text-nkt-muted w-6">#{i+1}</span>
                <div className="w-9 h-9 rounded-lg border border-nkt-border bg-nkt-bg flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-sm text-nkt-muted">{s.username[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-bold text-nkt-text">{s.username}</p>
                  <p className="font-mono text-xs text-nkt-muted">{s.email} · {s.score || 0} pts CTF</p>
                </div>
                <span className="font-mono text-[10px] text-nkt-muted">Depuis {fmtDate(s.joined_at)}</span>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════ TEACHER: EXAMENS ══════════════ */}
        {tab === 'exams_teacher' && isTeacher && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs text-nkt-muted tracking-widest">{exams.length} EXAMEN{exams.length !== 1 ? 'S' : ''}</p>
              <button onClick={() => setShowExamForm(v => !v)}
                className="flex items-center gap-2 nkt-btn nkt-btn-solid px-4 py-2 rounded font-mono text-xs font-bold">
                <Plus size={13} /> NOUVEL EXAMEN
              </button>
            </div>

            {showExamForm && (
              <div className="bg-nkt-card border border-nkt-green/30 rounded-xl p-5">
                <p className="font-mono text-xs text-nkt-muted tracking-widest mb-4">CRÉER UN EXAMEN</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-[10px] font-mono text-nkt-muted mb-1 tracking-widest">TITRE</label>
                    <input className="nkt-input w-full px-3 py-2.5 rounded font-mono text-sm"
                      value={newExam.title}
                      onChange={e => setNewExam(p => ({ ...p, title: e.target.value }))}
                      placeholder="Examen Final..." />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-nkt-muted mb-1 tracking-widest">DURÉE (MIN)</label>
                    <input type="number" className="nkt-input w-full px-3 py-2.5 rounded font-mono text-sm"
                      value={newExam.duration_minutes}
                      onChange={e => setNewExam(p => ({ ...p, duration_minutes: parseInt(e.target.value) }))} />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-[10px] font-mono text-nkt-muted mb-2 tracking-widest">CHALLENGES ({newExam.challenge_ids.length} sélectionnés)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-nkt-bg rounded-lg border border-nkt-border">
                    {allChallenges.map(c => {
                      const sel = newExam.challenge_ids.includes(c.id);
                      return (
                        <button key={c.id} type="button"
                          onClick={() => setNewExam(p => ({ ...p, challenge_ids: sel ? p.challenge_ids.filter(x => x !== c.id) : [...p.challenge_ids, c.id] }))}
                          className={`text-left px-3 py-2 rounded border text-xs font-mono transition-all ${sel ? 'border-nkt-green/50 bg-nkt-green/10 text-nkt-green' : 'border-nkt-border text-nkt-muted hover:border-nkt-green/20'}`}>
                          <p className="font-bold truncate">{c.title}</p>
                          <p className="text-[10px]">{c.category} · {c.points}pts</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={createExam} className="nkt-btn nkt-btn-solid px-5 py-2.5 rounded font-mono text-sm font-bold">CRÉER</button>
                  <button onClick={() => setShowExamForm(false)} className="px-5 py-2.5 rounded font-mono text-sm text-nkt-muted border border-nkt-border hover:border-nkt-text transition-all">ANNULER</button>
                </div>
              </div>
            )}

            {exams.map(exam => (
              <div key={exam.id} className="bg-nkt-card border border-nkt-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                        exam.status === 'active' ? 'text-nkt-green border-nkt-green/30 bg-nkt-green/10' : 'text-nkt-muted border-nkt-border'
                      }`}>{exam.status?.toUpperCase()}</span>
                      <span className="text-[10px] font-mono text-nkt-muted"><Clock size={10} className="inline mr-1" />{exam.duration_minutes} min</span>
                      <span className="text-[10px] font-mono text-nkt-muted">{exam.challenge_count || 0} challenges</span>
                      <span className="text-[10px] font-mono text-nkt-muted"><Users size={10} className="inline mr-1" />{exam.participant_count || 0} participants</span>
                    </div>
                    <p className="font-mono text-sm font-bold text-nkt-text">{exam.title}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => toggleExam(exam)}
                      className={`px-4 py-2 rounded border font-mono text-xs font-bold transition-all ${
                        exam.status === 'active'
                          ? 'border-nkt-red/40 text-nkt-red hover:bg-nkt-red/10'
                          : 'border-nkt-green/40 text-nkt-green hover:bg-nkt-green/10'
                      }`}>
                      {exam.status === 'active' ? '⏸ DÉSACTIVER' : '▶ ACTIVER'}
                    </button>
                    <button onClick={() => liveExam?.id === exam.id ? setLiveExam(null) : startLive(exam)}
                      className="px-4 py-2 rounded border border-nkt-cyan/30 text-nkt-cyan hover:bg-nkt-cyan/10 font-mono text-xs font-bold transition-all">
                      📡 LIVE
                    </button>
                  </div>
                </div>

                {liveExam?.id === exam.id && (
                  <LiveMonitor sessions={liveSessions} exam={exam} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ══════════════ TEACHER: DEVOIRS ══════════════ */}
        {tab === 'assignments' && isTeacher && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs text-nkt-muted tracking-widest">{assignments.length} DEVOIR{assignments.length !== 1 ? 'S' : ''}</p>
              <button onClick={() => setShowAssignForm(v => !v)}
                className="flex items-center gap-2 nkt-btn nkt-btn-solid px-4 py-2 rounded font-mono text-xs font-bold">
                <Plus size={13} /> NOUVEAU DEVOIR
              </button>
            </div>

            {showAssignForm && (
              <div className="bg-nkt-card border border-nkt-green/30 rounded-xl p-5">
                <p className="font-mono text-xs text-nkt-muted tracking-widest mb-4">CRÉER UN DEVOIR</p>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-[10px] font-mono text-nkt-muted mb-1">TITRE</label>
                    <input className="nkt-input w-full px-3 py-2.5 rounded font-mono text-sm"
                      value={newAssign.title}
                      onChange={e => setNewAssign(p => ({ ...p, title: e.target.value }))}
                      placeholder="TP Cryptographie..." />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-nkt-muted mb-1">DESCRIPTION</label>
                    <textarea className="nkt-input w-full px-3 py-2.5 rounded font-mono text-sm h-20 resize-none"
                      value={newAssign.description}
                      onChange={e => setNewAssign(p => ({ ...p, description: e.target.value }))}
                      placeholder="Consignes du devoir..." />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-nkt-muted mb-1">DATE LIMITE</label>
                    <input type="datetime-local" className="nkt-input w-full px-3 py-2.5 rounded font-mono text-sm"
                      value={newAssign.due_date}
                      onChange={e => setNewAssign(p => ({ ...p, due_date: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={createAssignment} className="nkt-btn nkt-btn-solid px-5 py-2.5 rounded font-mono text-sm font-bold">CRÉER</button>
                  <button onClick={() => setShowAssignForm(false)} className="px-5 py-2.5 rounded font-mono text-sm text-nkt-muted border border-nkt-border hover:border-nkt-text transition-all">ANNULER</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                {assignments.map(a => {
                  const expired = a.due_date && new Date(a.due_date) < new Date();
                  return (
                    <button key={a.id} onClick={() => openCorrections(a)}
                      className={`w-full text-left bg-nkt-card border rounded-xl p-4 transition-all hover:border-yellow-400/30 ${selectedDevoir?.id === a.id ? 'border-yellow-400/50 bg-yellow-400/5' : 'border-nkt-border'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${expired ? 'text-nkt-red border-nkt-red/30' : 'text-nkt-green border-nkt-green/30 bg-nkt-green/10'}`}>
                              {expired ? '⛔ EXPIRÉ' : '✓ ACTIF'}
                            </span>
                            <span className="text-[10px] font-mono text-nkt-muted">{a.submission_count || 0} rendu{(a.submission_count || 0) !== 1 ? 's' : ''}</span>
                          </div>
                          <p className="font-mono text-sm font-bold text-nkt-text">{a.title}</p>
                          {a.due_date && <p className="text-[10px] font-mono text-nkt-muted mt-0.5">Limite : {fmtDateTime(a.due_date)}</p>}
                        </div>
                        <Star size={14} className="text-yellow-400 flex-shrink-0 mt-1" />
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedDevoir && (
                <div className="bg-nkt-card border border-yellow-400/20 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-nkt-border">
                    <p className="font-mono text-xs text-nkt-muted tracking-widest">CORRECTIONS</p>
                    <p className="font-mono text-sm font-bold text-nkt-text">{selectedDevoir.title}</p>
                  </div>
                  {devoirSubs.length === 0 ? (
                    <div className="text-center py-10"><p className="font-mono text-sm text-nkt-muted">Aucun rendu</p></div>
                  ) : devoirSubs.map(sub => (
                    <div key={sub.user_id} className="p-5 border-b border-nkt-border/30 last:border-0">
                      <div className="flex justify-between mb-2">
                        <div>
                          <p className="font-mono text-sm font-bold text-nkt-text">{sub.username}</p>
                          <p className="text-[10px] font-mono text-nkt-muted">{fmtDateTime(sub.submitted_at)}</p>
                        </div>
                        {sub.grade !== null && <p className="font-display text-xl font-bold text-nkt-green">{sub.grade}<span className="text-xs text-nkt-muted">/100</span></p>}
                      </div>
                      {sub.content && (
                        <div className="bg-nkt-bg border border-nkt-border rounded-lg p-3 mb-3">
                          <p className="font-mono text-xs text-nkt-text whitespace-pre-wrap">{sub.content}</p>
                        </div>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        <input type="number" min="0" max="100"
                          className="nkt-input px-3 py-2 rounded text-sm w-20 text-center font-mono font-bold"
                          value={gradingMap[sub.user_id]?.grade ?? ''}
                          onChange={e => setGradingMap(p => ({ ...p, [sub.user_id]: { ...p[sub.user_id], grade: e.target.value } }))}
                          placeholder="—" />
                        <input className="nkt-input flex-1 px-3 py-2 rounded text-sm font-mono min-w-24"
                          value={gradingMap[sub.user_id]?.feedback ?? ''}
                          onChange={e => setGradingMap(p => ({ ...p, [sub.user_id]: { ...p[sub.user_id], feedback: e.target.value } }))}
                          placeholder="Feedback..." />
                        <button onClick={() => submitGrade(selectedDevoir.id, sub.user_id)}
                          className="nkt-btn nkt-btn-solid px-4 py-2 rounded font-mono text-xs font-bold">NOTER</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════ TEACHER: CERTIFICATS ══════════════ */}
        {tab === 'certificates' && isTeacher && (
          <div className="bg-nkt-card border border-nkt-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-nkt-border">
              <p className="font-mono text-xs text-nkt-muted tracking-widest">CERTIFICATS OBTENUS ({certificates.length})</p>
            </div>
            {certificates.length === 0 ? (
              <div className="text-center py-12">
                <Medal size={32} className="text-nkt-muted/20 mx-auto mb-3" />
                <p className="font-mono text-sm text-nkt-muted">Aucun certificat encore obtenu</p>
              </div>
            ) : certificates.map(cert => (
              <div key={cert.id} className="flex items-center gap-4 px-5 py-4 border-b border-nkt-border/30 last:border-0">
                <div className="w-10 h-10 rounded-lg border border-yellow-400/30 bg-yellow-400/10 flex items-center justify-center flex-shrink-0">
                  <Medal size={18} className="text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-bold text-nkt-text">{cert.username}</p>
                  <p className="font-mono text-xs text-nkt-muted">{cert.exam_title}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-base font-bold text-yellow-400">{cert.score} pts</p>
                  <p className="text-[10px] font-mono text-nkt-muted">{fmtDate(cert.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sous-composant : Devoir étudiant ──────────────────
function AssignmentCard({ a, expired, onRefresh, setMsg }) {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(!!a.submitted_at);

  const submit = async () => {
    if (!text.trim()) return setMsg('❌ Écris ta réponse');
    try {
      await api.post(`/assignments/${a.id}/submit`, { content: text });
      setSubmitted(true);
      setMsg('✅ Devoir rendu !');
      onRefresh();
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Erreur')); }
  };

  return (
    <div className={`bg-nkt-card border rounded-xl p-5 ${expired && !submitted ? 'border-nkt-red/20' : 'border-nkt-border'}`}>
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
              submitted ? 'text-nkt-green border-nkt-green/30 bg-nkt-green/10' :
              expired ? 'text-nkt-red border-nkt-red/30 bg-nkt-red/10' :
              'text-yellow-400 border-yellow-400/30 bg-yellow-400/10'
            }`}>
              {submitted ? '✓ RENDU' : expired ? '⛔ EXPIRÉ' : '⏳ À RENDRE'}
            </span>
            {a.due_date && <span className="text-[10px] font-mono text-nkt-muted">Limite : {new Date(a.due_date).toLocaleDateString('fr-FR')}</span>}
          </div>
          <p className="font-mono text-sm font-bold text-nkt-text">{a.title}</p>
          {a.description && <p className="font-mono text-xs text-nkt-muted mt-1">{a.description}</p>}
        </div>
        {a.grade !== null && a.grade !== undefined && (
          <div className="text-right">
            <p className="font-display text-2xl font-bold text-nkt-green">{a.grade}<span className="text-xs text-nkt-muted">/100</span></p>
            {a.feedback && <p className="font-mono text-xs text-nkt-muted mt-1 max-w-48">{a.feedback}</p>}
          </div>
        )}
      </div>

      {!submitted && !expired && (
        <div className="space-y-3 mt-4">
          <textarea className="nkt-input w-full px-3 py-2.5 rounded font-mono text-sm h-24 resize-none"
            placeholder="Écris ta réponse ici..."
            value={text}
            onChange={e => setText(e.target.value)} />
          <button onClick={submit} className="nkt-btn nkt-btn-solid px-5 py-2.5 rounded font-mono text-sm font-bold">
            RENDRE LE DEVOIR
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sous-composant : Monitoring live ─────────────────
function LiveMonitor({ sessions, exam }) {
  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  return (
    <div className="mt-4 border-t border-nkt-border/40 pt-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-nkt-green animate-pulse" />
        <span className="font-mono text-xs text-nkt-green">LIVE — {sessions.length} participant{sessions.length !== 1 ? 's' : ''}</span>
      </div>
      {sessions.length === 0 ? (
        <p className="font-mono text-xs text-nkt-muted">Aucun étudiant en cours</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {sessions.sort((a, b) => (b.score||0) - (a.score||0)).map((s, i) => {
            const elapsed = s.started_at ? Math.floor((Date.now() - new Date(s.started_at)) / 1000) : 0;
            const remaining = Math.max(0, exam.duration_minutes * 60 - elapsed);
            return (
              <div key={s.user_id} className="flex items-center gap-3 bg-nkt-bg border border-nkt-border rounded-lg px-3 py-2">
                <span className="font-mono text-xs text-nkt-muted w-4">#{i+1}</span>
                <span className="font-mono text-sm font-bold text-nkt-text flex-1">{s.username}</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  s.status === 'in_progress' ? 'text-nkt-green border-nkt-green/30' :
                  s.status === 'finished' ? 'text-nkt-muted border-nkt-border' :
                  'text-nkt-red border-nkt-red/30'
                }`}>{s.status === 'in_progress' ? `⏱ ${fmt(remaining)}` : s.status === 'finished' ? '✓ FIN' : '⏰ EXPIRÉ'}</span>
                <span className="font-display font-bold text-nkt-green text-sm">{s.score || 0}pts</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}