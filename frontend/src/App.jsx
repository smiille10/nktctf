import { useState, useEffect, useCallback } from 'react';
import { adminAPI, teamAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  Eye, EyeOff,
  Plus, Trash2, ToggleLeft, ToggleRight,
  Upload, X, Users, Database, Shield,
  Activity, Target, Zap, Calendar, Edit2, Save,
  MessageSquare, Crown, GraduationCap, RefreshCw, Copy, BookOpen,
  ChevronDown, ChevronRight, UserCheck, ClipboardList, ExternalLink
} from 'lucide-react';
import AdminCourses      from '../components/AdminCourses';
import AdminExams        from '../components/AdminExams';
import AdminAssignments  from '../components/AdminAssignments';

const CATEGORIES    = ['WEB', 'FORENSICS', 'CRYPTO', 'OSINT', 'MISC'];
const DIFFICULTIES  = ['Easy', 'Medium', 'Hard'];
const ROLES         = ['user', 'manager', 'superadmin'];
const EVENT_STATUSES = ['upcoming', 'ongoing', 'ended'];
const PLANS         = ['starter', 'school', 'enterprise'];
const PLAN_COLORS   = {
  starter:    'text-nkt-muted border-nkt-border bg-transparent',
  school:     'text-nkt-cyan border-nkt-cyan/40 bg-nkt-cyan/10',
  enterprise: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',
};
const PLAN_LIMITS   = { starter: 50, school: 200, enterprise: 99999 };

const ROLE_STYLES = {
  superadmin: 'text-nkt-green border-nkt-green/40 bg-nkt-green/10',
  manager:    'text-nkt-cyan border-nkt-cyan/40 bg-nkt-cyan/10',
  user:       'text-nkt-muted border-nkt-border bg-transparent',
};

const MEMBER_ROLE_COLORS = {
  teacher: 'text-nkt-cyan border-nkt-cyan/40 bg-nkt-cyan/10',
  student: 'text-nkt-muted border-nkt-border bg-transparent',
};

const STATUS_STYLES = {
  ongoing:  'text-nkt-green border-nkt-green/40 bg-nkt-green/10',
  upcoming: 'text-nkt-cyan border-nkt-cyan/40 bg-nkt-cyan/10',
  ended:    'text-nkt-muted border-nkt-border bg-transparent',
};

const TABS = [
  { id: 'overview',   label: 'OVERVIEW',   icon: Activity      },
  { id: 'challenges', label: 'CHALLENGES', icon: Target        },
  { id: 'events',     label: 'EVENTS',     icon: Calendar      },
  { id: 'schools',    label: 'SCHOOLS',    icon: GraduationCap },
  { id: 'courses',     label: 'COURSES',    icon: BookOpen      },
  { id: 'exams',       label: 'EXAMS',      icon: ClipboardList },
  { id: 'assignments', label: 'DEVOIRS',    icon: BookOpen      },
  { id: 'users',      label: 'USERS',      icon: Users         },
  { id: 'teams',      label: 'TEAMS',      icon: Shield        },
  { id: 'database',   label: 'DATABASE',   icon: Database      },
];

const EMPTY_CHALLENGE = {
  title: '', category: 'WEB', description: '',
  points: '', flag: '', hint: '', difficulty: 'Easy',
};

const EMPTY_EVENT = {
  title: '', description: '', mode: 'solo',
  is_free: true, price: 0, max_participants: 50,
  start_date: '', end_date: '', status: 'upcoming',
};

const EMPTY_SCHOOL = {
  name: '', email: '', phone: '', country: 'Mauritanie',
  city: '', plan: 'starter', expires_at: '', allowed_domain: '',
};

export default function Admin() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';
  const [tab, setTab] = useState('overview');

  // ── data ──
  const [stats,      setStats]      = useState({});
  const [challenges, setChallenges] = useState([]);
  const [users,      setUsers]      = useState([]);
  const [events,     setEvents]     = useState([]);
  const [schools,    setSchools]    = useState([]);
  const [dbTable,    setDbTable]    = useState('users');
  const [dbData,     setDbData]     = useState([]);

  // ── challenge form ──
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [editingChallenge,  setEditingChallenge]  = useState(null);
  const [challengeForm,     setChallengeForm]     = useState(EMPTY_CHALLENGE);
  const [file,              setFile]              = useState(null);

  // ── user form ──
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm,     setUserForm]     = useState({ username: '', email: '', password: '', role: 'user' });
  const [editingUser,  setEditingUser]  = useState(null);
  const [editUserForm, setEditUserForm] = useState({});
  const [editUserMsg,  setEditUserMsg]  = useState('');
  const [showEditPw,   setShowEditPw]   = useState(false);

  // ── event form ──
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent,  setEditingEvent]  = useState(null);
  const [eventForm,     setEventForm]     = useState(EMPTY_EVENT);

  // ── school form ──
  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [editingSchool,  setEditingSchool]  = useState(null);
  const [schoolForm,     setSchoolForm]     = useState(EMPTY_SCHOOL);

  // ── school members ──
  const [expandedSchool,  setExpandedSchool]  = useState(null);
  const [schoolMembers,   setSchoolMembers]   = useState({});
  const [loadingMembers,  setLoadingMembers]  = useState(false);

  // ── teams admin ──
  const [adminTeams,        setAdminTeams]        = useState([]);
  const [selectedTeam,      setSelectedTeam]      = useState(null);
  const [teamMembers,       setTeamMembers]        = useState([]);
  const [teamMessages,      setTeamMessages]       = useState([]);
  const [teamView,          setTeamView]           = useState('members');
  const [loadingTeamDetail, setLoadingTeamDetail]  = useState(false);

  // ── global ──
  const [msg,     setMsg]     = useState('');
  const [loading, setLoading] = useState(false);

  // ── refresh helpers ──
  const refreshChallenges = useCallback(() =>
    adminAPI.getChallenges().then(r => setChallenges(r.data)), []);

  const refreshStats = useCallback(() =>
    adminAPI.getStats().then(r => setStats(r.data)), []);

  const refreshEvents = useCallback(() =>
    adminAPI.getEvents().then(r => setEvents(r.data)), []);

  const refreshUsers = useCallback(() =>
    adminAPI.getUsers().then(r => setUsers(r.data)), []);

  const refreshSchools = useCallback(async () => {
    try {
      const r = await api.get('/schools');
      setSchools(r.data);
    } catch (err) {
      console.error('Erreur chargement écoles:', err);
      setSchools([]);
    }
  }, []);

  const refreshAdminTeams = useCallback(async () => {
    try {
      const r = await adminAPI.getTeams();
      setAdminTeams(r.data);
    } catch (err) {
      console.error('Erreur chargement teams:', err);
      setAdminTeams([]);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          refreshStats(),
          refreshChallenges(),
          refreshEvents(),
        ]);
        if (isSuperAdmin) {
          await Promise.all([
            refreshUsers(),
            refreshAdminTeams(),
            refreshSchools(),
          ]);
        }
      } catch (err) {
        setMsg('❌ Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isSuperAdmin, refreshStats, refreshChallenges, refreshEvents, refreshUsers, refreshAdminTeams, refreshSchools]);

  // ── DATABASE VIEWER ──
  useEffect(() => {
    if (tab === 'database' && isSuperAdmin) {
      setDbData([]);
      setMsg('');
      adminAPI.getTable(dbTable)
        .then(r => { setDbData(r.data); setMsg(''); })
        .catch(err => {
          setDbData([]);
          setMsg(`❌ Erreur chargement table ${dbTable}: ${err.response?.data?.error || err.message}`);
        });
    }
  }, [tab, dbTable, isSuperAdmin]);

  // ══════════════ SCHOOL MEMBERS ══════════════

  const toggleSchoolMembers = async (schoolId) => {
    if (expandedSchool === schoolId) {
      setExpandedSchool(null);
      return;
    }
    setExpandedSchool(schoolId);
    if (schoolMembers[schoolId]) return; // déjà chargé
    setLoadingMembers(true);
    try {
      const r = await api.get(`/schools/${schoolId}/members`);
      setSchoolMembers(prev => ({ ...prev, [schoolId]: r.data }));
    } catch (err) {
      setMsg('❌ Erreur chargement membres');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleChangeMemberRole = async (schoolId, userId, newRole) => {
    try {
      await api.put(`/schools/${schoolId}/members/${userId}/role`, { role: newRole });
      // Refresh membres
      const r = await api.get(`/schools/${schoolId}/members`);
      setSchoolMembers(prev => ({ ...prev, [schoolId]: r.data }));
      setMsg(`✅ Rôle mis à jour → ${newRole}`);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Erreur'));
    }
  };

  const handleRemoveMember = async (schoolId, userId) => {
    if (!confirm('Retirer ce membre de l\'école ?')) return;
    try {
      await api.delete(`/schools/${schoolId}/members/${userId}`);
      const r = await api.get(`/schools/${schoolId}/members`);
      setSchoolMembers(prev => ({ ...prev, [schoolId]: r.data }));
      await refreshSchools();
      setMsg('✅ Membre retiré');
    } catch (err) {
      setMsg('❌ Erreur');
    }
  };

  // ══════════════ CHALLENGE HANDLERS ══════════════

  const openCreateChallenge = () => {
    setEditingChallenge(null);
    setChallengeForm(EMPTY_CHALLENGE);
    setFile(null);
    setShowChallengeForm(true);
  };

  const openEditChallenge = (ch) => {
    setEditingChallenge(ch);
    setChallengeForm({
      title: ch.title || '', category: ch.category || 'WEB',
      description: ch.description || '', points: ch.points || '',
      flag: ch.flag || '', hint: ch.hint || '', difficulty: ch.difficulty || 'Easy',
    });
    setFile(null);
    setShowChallengeForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitChallenge = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg('');
    try {
      const formData = new FormData();
      Object.entries(challengeForm).forEach(([k, v]) => formData.append(k, v));
      if (file) formData.append('file', file);
      if (editingChallenge) {
        await adminAPI.updateChallenge(editingChallenge.id, formData);
        setMsg('✅ Challenge modifié !');
      } else {
        await adminAPI.createChallenge(formData);
        setMsg('✅ Challenge créé !');
      }
      setChallengeForm(EMPTY_CHALLENGE); setFile(null);
      setShowChallengeForm(false); setEditingChallenge(null);
      await Promise.all([refreshChallenges(), refreshStats()]);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Erreur lors de la création'));
    } finally { setLoading(false); }
  };

  const handleDeleteChallenge = async (id) => {
    if (!confirm('Supprimer ce challenge ?')) return;
    try {
      await adminAPI.deleteChallenge(id);
      await Promise.all([refreshChallenges(), refreshStats()]);
      setMsg('✅ Challenge supprimé');
    } catch { setMsg('❌ Erreur lors de la suppression'); }
  };

  // ══════════════ EVENT HANDLERS ══════════════

  const openCreateEvent = () => { setEditingEvent(null); setEventForm(EMPTY_EVENT); setShowEventForm(true); };

  const openEditEvent = (ev) => {
    setEditingEvent(ev);
    setEventForm({
      title: ev.title || '', description: ev.description || '',
      mode: ev.mode || 'solo', is_free: ev.is_free, price: ev.price || 0,
      max_participants: ev.max_participants || 50,
      start_date: ev.start_date ? new Date(ev.start_date).toISOString().slice(0, 16) : '',
      end_date:   ev.end_date   ? new Date(ev.end_date).toISOString().slice(0, 16)   : '',
      status: ev.status || 'upcoming',
    });
    setShowEventForm(true);
  };

  const handleSubmitEvent = async (e) => {
    e.preventDefault(); setLoading(true); setMsg('');
    try {
      if (editingEvent) { await adminAPI.updateEvent(editingEvent.id, eventForm); setMsg('✅ Event modifié !'); }
      else              { await adminAPI.createEvent(eventForm); setMsg('✅ Event créé !'); }
      setEventForm(EMPTY_EVENT); setShowEventForm(false); setEditingEvent(null);
      await Promise.all([refreshEvents(), refreshStats()]);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Erreur lors de la création'));
    } finally { setLoading(false); }
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm('Supprimer cet event ?')) return;
    try { await adminAPI.deleteEvent(id); await refreshEvents(); setMsg('✅ Event supprimé'); }
    catch { setMsg('❌ Erreur lors de la suppression'); }
  };

  // ══════════════ SCHOOL HANDLERS ══════════════

  const openCreateSchool = () => { setEditingSchool(null); setSchoolForm(EMPTY_SCHOOL); setShowSchoolForm(true); };

  const openEditSchool = (s) => {
    setEditingSchool(s);
    setSchoolForm({
      name: s.name || '', email: s.email || '', phone: s.phone || '',
      country: s.country || 'Mauritanie', city: s.city || '',
      plan: s.plan || 'starter',
      expires_at: s.expires_at ? new Date(s.expires_at).toISOString().slice(0, 10) : '',
      is_active: s.is_active,
    });
    setShowSchoolForm(true);
  };

  const handleSubmitSchool = async (e) => {
    e.preventDefault(); setLoading(true); setMsg('');
    try {
      if (editingSchool) {
        await api.put(`/schools/${editingSchool.id}`, schoolForm);
        setMsg('✅ École modifiée !');
      } else {
        await api.post('/schools', schoolForm);
        setMsg('✅ École créée !');
      }
      setSchoolForm(EMPTY_SCHOOL); setShowSchoolForm(false); setEditingSchool(null);
      await refreshSchools();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Erreur'));
    } finally { setLoading(false); }
  };

  const handleDeleteSchool = async (id) => {
    if (!confirm('Supprimer cette école ? Tous les membres et examens liés seront supprimés.')) return;
    try { await api.delete(`/schools/${id}`); await refreshSchools(); setMsg('✅ École supprimée'); }
    catch { setMsg('❌ Erreur lors de la suppression'); }
  };

  const handleRegenerateCode = async (id) => {
    try {
      const r = await api.post(`/schools/${id}/regenerate-code`);
      setMsg(`✅ Nouveau code : ${r.data.access_code}`);
      await refreshSchools();
    } catch { setMsg('❌ Erreur lors de la régénération'); }
  };

  // ══════════════ USER HANDLERS ══════════════

  const handleCreateUser = async (e) => {
    e.preventDefault(); setLoading(true); setMsg('');
    try {
      await adminAPI.createUser(userForm); setMsg('✅ Utilisateur créé !');
      setUserForm({ username: '', email: '', password: '', role: 'user' });
      setShowUserForm(false); await refreshUsers();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Erreur lors de la création'));
    } finally { setLoading(false); }
  };

  const openEditUser = (u) => {
    setEditingUser(u);
    setEditUserForm({ username: u.username, email: u.email, password: '' });
    setEditUserMsg(''); setShowEditPw(false);
  };

  const handleEditUser = async (e) => {
    e.preventDefault(); setLoading(true); setEditUserMsg('');
    try {
      const data = { username: editUserForm.username, email: editUserForm.email };
      if (editUserForm.password) data.password = editUserForm.password;
      await adminAPI.editUser(editingUser.id, data);
      setEditUserMsg('✅ Mis à jour !');
      setTimeout(() => { setEditingUser(null); setEditUserForm({}); setEditUserMsg(''); }, 1200);
      await refreshUsers();
    } catch (err) {
      setEditUserMsg('❌ ' + (err.response?.data?.error || 'Erreur lors de la mise à jour'));
    } finally { setLoading(false); }
  };

  const handleRoleChange = async (id, role) => {
    try { await adminAPI.updateUserRole(id, role); await refreshUsers(); setMsg('✅ Rôle mis à jour'); }
    catch { setMsg('❌ Erreur lors du changement de rôle'); }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    try { await adminAPI.deleteUser(id); await refreshUsers(); setMsg('✅ Utilisateur supprimé'); }
    catch { setMsg('❌ Erreur lors de la suppression'); }
  };

  // ══════════════ TEAM HANDLERS ══════════════

  const openTeamDetail = async (team) => {
    setSelectedTeam(team); setTeamView('members'); setLoadingTeamDetail(true);
    try {
      let membersRes;
      try { membersRes = await api.get(`/admin/teams/${team.id}/members`); }
      catch { try { membersRes = await api.get(`/teams/${team.id}/members`); } catch { membersRes = { data: [] }; } }
      let messagesRes;
      try { messagesRes = await teamAPI.getMessages(team.id); }
      catch { try { messagesRes = await api.get(`/teams/${team.id}/messages`); } catch { messagesRes = { data: [] }; } }
      setTeamMembers(membersRes.data); setTeamMessages(messagesRes.data);
    } catch (err) {
      setMsg('❌ Erreur chargement des détails de la team');
    } finally { setLoadingTeamDetail(false); }
  };

  const handleDeleteTeam = async (id) => {
    if (!confirm('Supprimer cette team définitivement ?')) return;
    try {
      try { await api.delete(`/admin/teams/${id}`); } catch { await api.delete(`/teams/${id}`); }
      setSelectedTeam(null); await refreshAdminTeams(); setMsg('✅ Team supprimée');
    } catch { setMsg('❌ Erreur lors de la suppression'); }
  };

  // ══════════════ HELPERS ══════════════

  const formatDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return '—'; }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setMsg(`✅ Code copié : ${text}`);
  };

  const visibleTabs = TABS.filter(t =>
    (t.id !== 'users' && t.id !== 'database' && t.id !== 'teams' && t.id !== 'schools' && t.id !== 'courses' && t.id !== 'exams' && t.id !== 'assignments') || isSuperAdmin
  );

  return (
    <div className="min-h-screen bg-nkt-bg bg-grid pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={14} className="text-nkt-green" />
            <span className="text-[11px] font-mono text-nkt-muted tracking-widest">ADMIN_PANEL</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ml-2 ${ROLE_STYLES[user?.role] || ''}`}>
              {user?.role?.toUpperCase()}
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold text-nkt-text">Control Center</h1>
        </div>

        {msg && (
          <div className={`mb-4 p-3 rounded border font-mono text-sm ${
            msg.startsWith('✅') ? 'bg-nkt-green/10 border-nkt-green/30 text-nkt-green' : 'bg-nkt-red/10 border-nkt-red/30 text-nkt-red'
          }`}>
            <div className="flex items-center justify-between">
              <span>{msg}</span>
              <button onClick={() => setMsg('')} className="ml-4 opacity-60 hover:opacity-100"><X size={14} /></button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-nkt-border overflow-x-auto">
          {visibleTabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setTab(id); setMsg(''); }}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-mono font-semibold tracking-wider border-b-2 transition-all whitespace-nowrap ${
                tab === id ? 'border-nkt-green text-nkt-green' : 'border-transparent text-nkt-muted hover:text-nkt-text'
              }`}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* ══════════════ OVERVIEW ══════════════ */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'TOTAL USERS',  value: stats.users      || 0, icon: Users,          color: '#00ff88' },
                { label: 'CHALLENGES',   value: stats.challenges || 0, icon: Target,          color: '#00d4ff' },
                { label: 'TOTAL SOLVES', value: stats.solves     || 0, icon: Zap,             color: '#ffd700' },
                { label: 'SCHOOLS',      value: schools.length,         icon: GraduationCap,  color: '#a855f7' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-nkt-card border border-nkt-border rounded-lg p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-mono text-nkt-muted tracking-widest mb-2">{label}</p>
                      <p className="font-display text-3xl font-bold" style={{ color }}>{value}</p>
                    </div>
                    <Icon size={20} style={{ color, opacity: 0.4 }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-nkt-card border border-nkt-border rounded-lg p-5">
              <p className="text-xs font-mono text-nkt-muted mb-4 tracking-widest">QUICK ACTIONS</p>
              <div className="flex gap-3 flex-wrap">
                <button onClick={() => { setTab('challenges'); openCreateChallenge(); }}
                  className="nkt-btn nkt-btn-solid px-5 py-2.5 rounded text-xs flex items-center gap-2">
                  <Plus size={14} /> NEW CHALLENGE
                </button>
                <button onClick={() => { setTab('events'); openCreateEvent(); }}
                  className="nkt-btn px-5 py-2.5 rounded text-xs flex items-center gap-2"
                  style={{ borderColor: '#ff4560', color: '#ff4560' }}>
                  <Plus size={14} /> NEW EVENT
                </button>
                {isSuperAdmin && (
                  <>
                    <button onClick={() => { setTab('schools'); openCreateSchool(); }}
                      className="nkt-btn px-5 py-2.5 rounded text-xs flex items-center gap-2"
                      style={{ borderColor: '#a855f7', color: '#a855f7' }}>
                      <Plus size={14} /> NEW SCHOOL
                    </button>
                    <button onClick={() => { setTab('users'); setShowUserForm(true); }}
                      className="nkt-btn px-5 py-2.5 rounded text-xs flex items-center gap-2">
                      <Plus size={14} /> NEW USER
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ CHALLENGES ══════════════ */}
        {tab === 'challenges' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-nkt-muted font-mono text-xs">
                {challenges.length} challenge{challenges.length !== 1 ? 's' : ''}
                {editingChallenge && <span className="ml-3 text-nkt-cyan">✏️ {editingChallenge.title}</span>}
              </p>
              <button
                onClick={() => {
                  if (showChallengeForm) { setShowChallengeForm(false); setEditingChallenge(null); setChallengeForm(EMPTY_CHALLENGE); }
                  else openCreateChallenge();
                }}
                className="nkt-btn nkt-btn-solid px-5 py-2.5 rounded flex items-center gap-2 text-sm">
                {showChallengeForm ? <><X size={14} /> ANNULER</> : <><Plus size={14} /> NEW CHALLENGE</>}
              </button>
            </div>

            {showChallengeForm && (
              <div className={`bg-nkt-card rounded-lg p-6 border-2 ${editingChallenge ? 'border-nkt-cyan/60' : 'border-nkt-green/40'}`}>
                <div className="flex items-center gap-3 mb-6">
                  {editingChallenge ? <Edit2 size={18} className="text-nkt-cyan" /> : <Plus size={18} className="text-nkt-green" />}
                  <h2 className={`font-mono text-sm font-bold tracking-wider ${editingChallenge ? 'text-nkt-cyan' : 'text-nkt-green'}`}>
                    {editingChallenge ? `MODIFIER — ${editingChallenge.title}` : 'CRÉER UN NOUVEAU CHALLENGE'}
                  </h2>
                </div>
                <form onSubmit={handleSubmitChallenge} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">TITLE *</label>
                    <input className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={challengeForm.title}
                      onChange={e => setChallengeForm({ ...challengeForm, title: e.target.value })} placeholder="Challenge title" required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">CATEGORY *</label>
                    <select className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={challengeForm.category}
                      onChange={e => setChallengeForm({ ...challengeForm, category: e.target.value })}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">DIFFICULTY *</label>
                    <select className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={challengeForm.difficulty}
                      onChange={e => setChallengeForm({ ...challengeForm, difficulty: e.target.value })}>
                      {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">POINTS *</label>
                    <input type="number" className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={challengeForm.points}
                      onChange={e => setChallengeForm({ ...challengeForm, points: e.target.value })} placeholder="100" required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">FLAG *</label>
                    <input className="nkt-input w-full px-4 py-2.5 rounded text-sm font-mono" value={challengeForm.flag}
                      onChange={e => setChallengeForm({ ...challengeForm, flag: e.target.value })} placeholder="NKTCTF{flag_here}" required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">HINT</label>
                    <input className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={challengeForm.hint}
                      onChange={e => setChallengeForm({ ...challengeForm, hint: e.target.value })} placeholder="Optionnel..." />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">DESCRIPTION *</label>
                    <textarea className="nkt-input w-full px-4 py-2.5 rounded text-sm h-28 resize-none" value={challengeForm.description}
                      onChange={e => setChallengeForm({ ...challengeForm, description: e.target.value })} placeholder="Challenge description..." required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">
                      FILE {editingChallenge?.file_name && <span className="ml-2 text-nkt-cyan font-normal normal-case">(actuel : {editingChallenge.file_name})</span>}
                    </label>
                    <label className="flex items-center gap-3 nkt-input px-4 py-2.5 rounded text-sm cursor-pointer hover:border-nkt-green/50 transition-all">
                      <Upload size={14} className="text-nkt-cyan flex-shrink-0" />
                      <span className="text-nkt-muted text-xs truncate">
                        {file ? `📎 ${file.name}` : editingChallenge ? 'Remplacer (optionnel)' : 'Choisir un fichier...'}
                      </span>
                      <input type="file" className="hidden" onChange={e => setFile(e.target.files[0])} />
                    </label>
                  </div>
                  <div className="md:col-span-2 flex gap-3 pt-2">
                    <button type="submit" disabled={loading}
                      className={`px-8 py-3 rounded text-sm font-mono font-bold flex items-center gap-2 transition-all ${
                        editingChallenge ? 'bg-nkt-cyan text-nkt-bg hover:opacity-90' : 'nkt-btn nkt-btn-solid'
                      }`}>
                      {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        : editingChallenge ? <><Save size={14} /> SAUVEGARDER</> : <><Plus size={14} /> CRÉER</>}
                    </button>
                    <button type="button"
                      onClick={() => { setShowChallengeForm(false); setEditingChallenge(null); setChallengeForm(EMPTY_CHALLENGE); setFile(null); }}
                      className="nkt-btn px-5 py-3 rounded text-sm">ANNULER</button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-nkt-card border border-nkt-border rounded-lg overflow-hidden">
              <div className="border-b border-nkt-border px-5 py-3 grid grid-cols-12 gap-2 bg-nkt-bg/30">
                <span className="col-span-3 text-[10px] font-mono text-nkt-muted tracking-wider">CHALLENGE</span>
                <span className="col-span-2 text-[10px] font-mono text-nkt-muted tracking-wider">CATEGORY</span>
                <span className="col-span-2 text-[10px] font-mono text-nkt-muted tracking-wider">DIFFICULTY</span>
                <span className="col-span-1 text-[10px] font-mono text-nkt-muted tracking-wider">POINTS</span>
                <span className="col-span-1 text-[10px] font-mono text-nkt-muted tracking-wider">FILE</span>
                <span className="col-span-1 text-[10px] font-mono text-nkt-muted tracking-wider">STATUS</span>
                <span className="col-span-2 text-[10px] font-mono text-nkt-muted tracking-wider text-right">ACTIONS</span>
              </div>
              {challenges.length === 0 ? (
                <div className="text-center py-16"><Target size={40} className="text-nkt-muted/20 mx-auto mb-3" /><p className="text-nkt-muted font-mono text-sm">Aucun challenge</p></div>
              ) : challenges.map(ch => (
                <div key={ch.id} className={`px-5 py-4 grid grid-cols-12 gap-2 items-center border-b border-nkt-border/40 transition-all ${
                  editingChallenge?.id === ch.id ? 'bg-nkt-cyan/5 border-l-4 border-l-nkt-cyan' : 'hover:bg-white/[0.02]'
                }`}>
                  <div className="col-span-3">
                    <p className="font-mono text-sm text-nkt-text font-semibold">{ch.title}</p>
                    <p className="text-[10px] text-nkt-muted font-mono mt-0.5 line-clamp-1 opacity-60">{ch.description}</p>
                  </div>
                  <div className="col-span-2"><span className="text-[11px] font-mono font-bold text-nkt-muted">{ch.category}</span></div>
                  <div className="col-span-2">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                      ch.difficulty === 'Hard' ? 'text-nkt-red border-nkt-red/30 bg-nkt-red/10' :
                      ch.difficulty === 'Medium' ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' :
                      'text-nkt-green border-nkt-green/30 bg-nkt-green/10'
                    }`}>{ch.difficulty || 'Easy'}</span>
                  </div>
                  <div className="col-span-1"><span className="font-display text-base text-nkt-green font-bold">{ch.points}</span></div>
                  <div className="col-span-1">
                    {ch.file_name ? <span title={ch.file_name} className="text-nkt-cyan cursor-help">📎</span>
                      : <span className="text-nkt-muted/30 text-[10px] font-mono">—</span>}
                  </div>
                  <div className="col-span-1">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      ch.is_active ? 'text-nkt-green border-nkt-green/30 bg-nkt-green/10' : 'text-nkt-muted border-nkt-border'
                    }`}>{ch.is_active ? 'ON' : 'OFF'}</span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-3">
                    <button onClick={() => openEditChallenge(ch)} className={`p-1.5 rounded border transition-all ${
                      editingChallenge?.id === ch.id ? 'border-nkt-cyan bg-nkt-cyan/20 text-nkt-cyan'
                        : 'border-nkt-border text-nkt-muted hover:border-nkt-cyan hover:text-nkt-cyan hover:bg-nkt-cyan/10'
                    }`}><Edit2 size={14} /></button>
                    <button onClick={() => adminAPI.toggleChallenge(ch.id).then(refreshChallenges)} className="text-nkt-muted hover:text-nkt-green transition-colors">
                      {ch.is_active ? <ToggleRight size={20} className="text-nkt-green" /> : <ToggleLeft size={20} />}
                    </button>
                    <button onClick={() => handleDeleteChallenge(ch.id)}
                      className="text-nkt-muted hover:text-nkt-red transition-colors p-1.5 rounded border border-transparent hover:border-nkt-red/30 hover:bg-nkt-red/10">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════ EVENTS ══════════════ */}
        {tab === 'events' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => { if (showEventForm) { setShowEventForm(false); setEditingEvent(null); setEventForm(EMPTY_EVENT); } else openCreateEvent(); }}
                className="nkt-btn nkt-btn-solid px-5 py-2.5 rounded flex items-center gap-2 text-sm"
                style={{ background: showEventForm ? '' : '#ff4560', borderColor: '#ff4560', color: showEventForm ? '#ff4560' : '#080d14' }}>
                {showEventForm ? <><X size={14} /> ANNULER</> : <><Plus size={14} /> NEW EVENT</>}
              </button>
            </div>
            {showEventForm && (
              <div className="bg-nkt-card border-2 border-red-500/40 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                  {editingEvent ? <Edit2 size={18} style={{ color: '#ff4560' }} /> : <Plus size={18} style={{ color: '#ff4560' }} />}
                  <h2 className="font-mono text-sm font-bold tracking-wider" style={{ color: '#ff4560' }}>
                    {editingEvent ? `MODIFIER — ${editingEvent.title}` : 'CRÉER UN NOUVEL EVENT'}
                  </h2>
                </div>
                <form onSubmit={handleSubmitEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">TITRE *</label>
                    <input className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={eventForm.title}
                      onChange={e => setEventForm({ ...eventForm, title: e.target.value })} placeholder="Ex: NKTCTF Summer 2025" required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">DESCRIPTION</label>
                    <textarea className="nkt-input w-full px-4 py-2.5 rounded text-sm h-24 resize-none" value={eventForm.description}
                      onChange={e => setEventForm({ ...eventForm, description: e.target.value })} placeholder="Description, règles..." />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">DATE DÉBUT *</label>
                    <input type="datetime-local" className="nkt-input w-full px-4 py-2.5 rounded text-sm"
                      value={eventForm.start_date} onChange={e => setEventForm({ ...eventForm, start_date: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">DATE FIN *</label>
                    <input type="datetime-local" className="nkt-input w-full px-4 py-2.5 rounded text-sm"
                      value={eventForm.end_date} onChange={e => setEventForm({ ...eventForm, end_date: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">MODE</label>
                    <div className="flex gap-3">
                      {['solo', 'team'].map(m => (
                        <button key={m} type="button" onClick={() => setEventForm({ ...eventForm, mode: m })}
                          className={`flex-1 py-2.5 rounded text-xs font-mono font-bold border transition-all ${
                            eventForm.mode === m ? 'border-nkt-green bg-nkt-green/10 text-nkt-green' : 'border-nkt-border text-nkt-muted'
                          }`}>{m === 'solo' ? '⚡ SOLO' : '👥 TEAM'}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">MAX PARTICIPANTS</label>
                    <input type="number" className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={eventForm.max_participants}
                      onChange={e => setEventForm({ ...eventForm, max_participants: parseInt(e.target.value) })} min="1" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">PRIX</label>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setEventForm({ ...eventForm, is_free: true, price: 0 })}
                        className={`flex-1 py-2.5 rounded text-xs font-mono font-bold border transition-all ${
                          eventForm.is_free ? 'border-nkt-green bg-nkt-green/10 text-nkt-green' : 'border-nkt-border text-nkt-muted'
                        }`}>🆓 FREE</button>
                      <button type="button" onClick={() => setEventForm({ ...eventForm, is_free: false })}
                        className={`flex-1 py-2.5 rounded text-xs font-mono font-bold border transition-all ${
                          !eventForm.is_free ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400' : 'border-nkt-border text-nkt-muted'
                        }`}>💰 PAYANT</button>
                    </div>
                  </div>
                  {!eventForm.is_free && (
                    <div>
                      <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">MONTANT ($)</label>
                      <input type="number" className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={eventForm.price}
                        onChange={e => setEventForm({ ...eventForm, price: parseFloat(e.target.value) })} min="0" step="0.01" />
                    </div>
                  )}
                  <div>
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">STATUS</label>
                    <select className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={eventForm.status}
                      onChange={e => setEventForm({ ...eventForm, status: e.target.value })}>
                      {EVENT_STATUSES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2 flex gap-3 pt-2">
                    <button type="submit" disabled={loading} className="px-8 py-3 rounded text-sm font-mono font-bold flex items-center gap-2"
                      style={{ background: '#ff4560', color: '#080d14' }}>
                      {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        : editingEvent ? <><Save size={14} /> SAUVEGARDER</> : <><Plus size={14} /> CRÉER</>}
                    </button>
                    <button type="button" onClick={() => { setShowEventForm(false); setEditingEvent(null); setEventForm(EMPTY_EVENT); }}
                      className="nkt-btn px-5 py-3 rounded text-sm">ANNULER</button>
                  </div>
                </form>
              </div>
            )}
            <div className="bg-nkt-card border border-nkt-border rounded-lg overflow-hidden">
              <div className="border-b border-nkt-border px-5 py-3 grid grid-cols-12 gap-2 bg-nkt-bg/30">
                <span className="col-span-3 text-[10px] font-mono text-nkt-muted tracking-wider">EVENT</span>
                <span className="col-span-2 text-[10px] font-mono text-nkt-muted tracking-wider">DATES</span>
                <span className="col-span-1 text-[10px] font-mono text-nkt-muted tracking-wider">MODE</span>
                <span className="col-span-2 text-[10px] font-mono text-nkt-muted tracking-wider">PARTICIPANTS</span>
                <span className="col-span-1 text-[10px] font-mono text-nkt-muted tracking-wider">PRIX</span>
                <span className="col-span-1 text-[10px] font-mono text-nkt-muted tracking-wider">STATUS</span>
                <span className="col-span-2 text-[10px] font-mono text-nkt-muted tracking-wider text-right">ACTIONS</span>
              </div>
              {events.length === 0 ? (
                <div className="text-center py-16"><Calendar size={40} className="text-nkt-muted/20 mx-auto mb-3" /><p className="text-nkt-muted font-mono text-sm">Aucun event</p></div>
              ) : events.map(ev => (
                <div key={ev.id} className={`px-5 py-4 grid grid-cols-12 gap-2 items-center border-b border-nkt-border/40 transition-all ${
                  editingEvent?.id === ev.id ? 'bg-red-500/5 border-l-4 border-l-red-500' : 'hover:bg-white/[0.02]'
                }`}>
                  <div className="col-span-3">
                    <p className="font-mono text-sm text-nkt-text font-semibold">{ev.title}</p>
                    {ev.description && <p className="text-[10px] text-nkt-muted font-mono mt-0.5 line-clamp-1">{ev.description}</p>}
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-mono text-nkt-muted">{formatDate(ev.start_date)}</p>
                    <p className="text-[10px] font-mono text-nkt-muted">→ {formatDate(ev.end_date)}</p>
                  </div>
                  <div className="col-span-1"><span className="text-[10px] font-mono text-nkt-muted">{ev.mode === 'team' ? '👥' : '⚡'} {ev.mode}</span></div>
                  <div className="col-span-2">
                    <span className="font-mono text-sm text-nkt-text">{ev.participants || 0}/{ev.max_participants}</span>
                    <div className="mt-1 h-1 bg-nkt-bg rounded-full overflow-hidden w-20">
                      <div className="h-full bg-nkt-green/60 rounded-full"
                        style={{ width: `${Math.min(100, ((ev.participants || 0) / ev.max_participants) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="col-span-1">
                    <span className={`font-mono text-xs font-bold ${ev.is_free ? 'text-nkt-green' : 'text-yellow-400'}`}>
                      {ev.is_free ? 'FREE' : `$${ev.price}`}
                    </span>
                  </div>
                  <div className="col-span-1">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${STATUS_STYLES[ev.status] || ''}`}>
                      {ev.status === 'ongoing' ? 'LIVE' : ev.status === 'upcoming' ? 'SOON' : 'ENDED'}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button onClick={() => openEditEvent(ev)} className={`p-1.5 rounded border transition-all ${
                      editingEvent?.id === ev.id ? 'border-red-400 bg-red-400/20 text-red-400'
                        : 'border-nkt-border text-nkt-muted hover:border-red-400 hover:text-red-400 hover:bg-red-400/10'
                    }`}><Edit2 size={14} /></button>
                    <button onClick={() => handleDeleteEvent(ev.id)}
                      className="p-1.5 rounded border border-transparent text-nkt-muted hover:border-nkt-red/30 hover:text-nkt-red hover:bg-nkt-red/10 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════ SCHOOLS ══════════════ */}
        {tab === 'schools' && isSuperAdmin && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-nkt-muted font-mono text-xs">{schools.length} école{schools.length !== 1 ? 's' : ''}</p>
              <button
                onClick={() => { if (showSchoolForm) { setShowSchoolForm(false); setEditingSchool(null); setSchoolForm(EMPTY_SCHOOL); } else openCreateSchool(); }}
                className="nkt-btn px-5 py-2.5 rounded flex items-center gap-2 text-sm font-mono font-bold border transition-all"
                style={{ background: showSchoolForm ? 'transparent' : '#a855f7', borderColor: '#a855f7', color: showSchoolForm ? '#a855f7' : '#080d14' }}>
                {showSchoolForm ? <><X size={14} /> ANNULER</> : <><Plus size={14} /> NEW SCHOOL</>}
              </button>
            </div>

            {showSchoolForm && (
              <div className="bg-nkt-card border-2 rounded-lg p-6" style={{ borderColor: 'rgba(168,85,247,0.4)' }}>
                <div className="flex items-center gap-3 mb-6">
                  {editingSchool ? <Edit2 size={18} style={{ color: '#a855f7' }} /> : <GraduationCap size={18} style={{ color: '#a855f7' }} />}
                  <h2 className="font-mono text-sm font-bold tracking-wider" style={{ color: '#a855f7' }}>
                    {editingSchool ? `MODIFIER — ${editingSchool.name}` : 'AJOUTER UNE ÉCOLE'}
                  </h2>
                </div>
                <form onSubmit={handleSubmitSchool} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">NOM ÉCOLE *</label>
                    <input className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={schoolForm.name}
                      onChange={e => setSchoolForm({ ...schoolForm, name: e.target.value })} placeholder="Ex: ENSI Nouakchott" required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">EMAIL *</label>
                    <input type="email" className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={schoolForm.email}
                      onChange={e => setSchoolForm({ ...schoolForm, email: e.target.value })} placeholder="contact@ecole.mr" required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">TÉLÉPHONE</label>
                    <input className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={schoolForm.phone}
                      onChange={e => setSchoolForm({ ...schoolForm, phone: e.target.value })} placeholder="+222 XX XX XX XX" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">VILLE</label>
                    <input className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={schoolForm.city}
                      onChange={e => setSchoolForm({ ...schoolForm, city: e.target.value })} placeholder="Nouakchott" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">PLAN</label>
                    <div className="flex gap-2">
                      {PLANS.map(p => (
                        <button key={p} type="button" onClick={() => setSchoolForm({ ...schoolForm, plan: p })}
                          className={`flex-1 py-2.5 rounded text-xs font-mono font-bold border transition-all capitalize ${
                            schoolForm.plan === p ? PLAN_COLORS[p] : 'border-nkt-border text-nkt-muted'
                          }`}>
                          {p}<br /><span className="text-[9px] font-normal opacity-70">{PLAN_LIMITS[p] === 99999 ? '∞' : PLAN_LIMITS[p]} étudiants</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">DATE EXPIRATION</label>
                    <input type="date" className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={schoolForm.expires_at}
                      onChange={e => setSchoolForm({ ...schoolForm, expires_at: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-nkt-muted mb-1 tracking-widest">DOMAINE EMAIL AUTORISÉ <span className="text-nkt-muted/50">(optionnel)</span></label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-nkt-muted text-sm">@</span>
                      <input className="nkt-input w-full pl-7 pr-4 py-2.5 rounded text-sm" value={schoolForm.allowed_domain}
                        onChange={e => setSchoolForm({ ...schoolForm, allowed_domain: e.target.value })}
                        placeholder="groupeisi.com" />
                    </div>
                    <p className="text-[10px] font-mono text-nkt-muted/60 mt-1">Si renseigné, seuls les emails @groupeisi.com pourront rejoindre</p>
                  </div>
                  <div className="md:col-span-2 flex gap-3 pt-2">
                    <button type="submit" disabled={loading}
                      className="px-8 py-3 rounded text-sm font-mono font-bold flex items-center gap-2"
                      style={{ background: '#a855f7', color: '#080d14' }}>
                      {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        : editingSchool ? <><Save size={14} /> SAUVEGARDER</> : <><Plus size={14} /> CRÉER</>}
                    </button>
                    <button type="button"
                      onClick={() => { setShowSchoolForm(false); setEditingSchool(null); setSchoolForm(EMPTY_SCHOOL); }}
                      className="nkt-btn px-5 py-3 rounded text-sm">ANNULER</button>
                  </div>
                </form>
              </div>
            )}

            {/* ── Liste écoles + membres ── */}
            <div className="space-y-3">
              {schools.length === 0 ? (
                <div className="text-center py-16 bg-nkt-card border border-nkt-border rounded-lg">
                  <GraduationCap size={40} className="text-nkt-muted/20 mx-auto mb-3" />
                  <p className="text-nkt-muted font-mono text-sm">Aucune école</p>
                </div>
              ) : schools.map(s => (
                <div key={s.id} className="bg-nkt-card border border-nkt-border rounded-xl overflow-hidden">

                  {/* ── Ligne école ── */}
                  <div className={`px-5 py-4 grid grid-cols-12 gap-2 items-center transition-all ${
                    editingSchool?.id === s.id ? 'border-l-4 bg-purple-500/5' : 'hover:bg-white/[0.02]'
                  }`} style={editingSchool?.id === s.id ? { borderLeftColor: '#a855f7' } : {}}>
                    <div className="col-span-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', color: '#a855f7' }}>
                          {s.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-mono text-sm text-nkt-text font-semibold">{s.name}</p>
                          <p className="text-[10px] font-mono text-nkt-muted">{s.city || s.country}</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-mono text-nkt-muted truncate">{s.email}</p>
                      {s.allowed_domain
                        ? <p className="text-[10px] font-mono text-purple-400 mt-0.5">@{s.allowed_domain}</p>
                        : <p className="text-[10px] font-mono text-nkt-muted/40 mt-0.5">tout domaine</p>
                      }
                    </div>
                    <div className="col-span-2">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold capitalize ${PLAN_COLORS[s.plan]}`}>
                        {s.plan}
                      </span>
                      {s.expires_at && (
                        <p className="text-[9px] font-mono text-nkt-muted mt-1">
                          exp: {new Date(s.expires_at).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2 flex items-center gap-1">
                      <span className="font-mono text-xs text-nkt-cyan tracking-widest font-bold">{s.access_code}</span>
                      <button onClick={() => copyToClipboard(s.access_code)} className="text-nkt-muted hover:text-nkt-cyan transition-colors p-1">
                        <Copy size={11} />
                      </button>
                      <button onClick={() => handleRegenerateCode(s.id)} className="text-nkt-muted hover:text-yellow-400 transition-colors p-1" title="Régénérer">
                        <RefreshCw size={11} />
                      </button>
                    </div>
                    <div className="col-span-1">
                      <button onClick={() => toggleSchoolMembers(s.id)}
                        className="flex items-center gap-1 text-[11px] font-mono font-bold hover:text-nkt-cyan transition-colors"
                        style={{ color: expandedSchool === s.id ? '#00d4ff' : '#8899aa' }}>
                        <Users size={12} />
                        <span>{s.member_count || 0}</span>
                        {expandedSchool === s.id ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                      </button>
                    </div>
                    <div className="col-span-1">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        s.is_active ? 'text-nkt-green border-nkt-green/30 bg-nkt-green/10' : 'text-nkt-red border-nkt-red/30 bg-nkt-red/10'
                      }`}>{s.is_active ? 'ON' : 'OFF'}</span>
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-1">
                      <button onClick={() => window.open(`/school/${s.id}`, '_blank')}
                        className="p-1.5 rounded border border-transparent text-nkt-muted hover:border-purple-400/30 hover:text-purple-400 hover:bg-purple-400/10 transition-all" title="Voir portail">
                        <ExternalLink size={13} />
                      </button>
                      <button onClick={() => openEditSchool(s)} className={`p-1.5 rounded border transition-all ${
                        editingSchool?.id === s.id ? 'border-purple-400 bg-purple-400/20 text-purple-400'
                          : 'border-nkt-border text-nkt-muted hover:border-purple-400 hover:text-purple-400 hover:bg-purple-400/10'
                      }`}><Edit2 size={13} /></button>
                      <button onClick={() => handleDeleteSchool(s.id)}
                        className="p-1.5 rounded border border-transparent text-nkt-muted hover:border-nkt-red/30 hover:text-nkt-red hover:bg-nkt-red/10 transition-all">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* ── Panel membres (expandable) ── */}
                  {expandedSchool === s.id && (
                    <div className="border-t border-nkt-border bg-nkt-bg/30">
                      <div className="px-5 py-2 flex items-center gap-2 border-b border-nkt-border/40">
                        <UserCheck size={12} style={{ color: '#a855f7' }} />
                        <span className="text-[10px] font-mono font-bold tracking-widest" style={{ color: '#a855f7' }}>MEMBRES DE L'ÉCOLE</span>
                      </div>

                      {loadingMembers ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-5 h-5 border-2 border-nkt-green border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : !schoolMembers[s.id] || schoolMembers[s.id].length === 0 ? (
                        <div className="text-center py-8">
                          <p className="font-mono text-xs text-nkt-muted">Aucun membre pour l'instant</p>
                          <p className="font-mono text-[10px] text-nkt-muted/50 mt-1">Code : <span className="text-nkt-cyan font-bold">{s.access_code}</span></p>
                        </div>
                      ) : (
                        <div className="divide-y divide-nkt-border/20">
                          {/* Header */}
                          <div className="px-5 py-2 grid grid-cols-12 gap-2 bg-nkt-bg/20">
                            <span className="col-span-4 text-[10px] font-mono text-nkt-muted tracking-wider">UTILISATEUR</span>
                            <span className="col-span-3 text-[10px] font-mono text-nkt-muted tracking-wider">EMAIL</span>
                            <span className="col-span-2 text-[10px] font-mono text-nkt-muted tracking-wider">REJOINT LE</span>
                            <span className="col-span-2 text-[10px] font-mono text-nkt-muted tracking-wider">RÔLE</span>
                            <span className="col-span-1 text-[10px] font-mono text-nkt-muted tracking-wider text-right">ACTION</span>
                          </div>
                          {schoolMembers[s.id].map(m => (
                            <div key={m.id} className="px-5 py-3 grid grid-cols-12 gap-2 items-center hover:bg-white/[0.02] transition-all">
                              <div className="col-span-4 flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                                  style={{ background: m.school_role === 'teacher' ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${m.school_role === 'teacher' ? 'rgba(0,212,255,0.3)' : '#1a2535'}`, color: m.school_role === 'teacher' ? '#00d4ff' : '#8899aa' }}>
                                  {m.username?.[0]?.toUpperCase()}
                                </div>
                                <span className="font-mono text-sm text-nkt-text font-semibold">{m.username}</span>
                              </div>
                              <div className="col-span-3">
                                <span className="font-mono text-xs text-nkt-muted truncate block">{m.email}</span>
                              </div>
                              <div className="col-span-2">
                                <span className="font-mono text-[10px] text-nkt-muted">
                                  {m.joined_at ? new Date(m.joined_at).toLocaleDateString('fr-FR') : '—'}
                                </span>
                              </div>
                              <div className="col-span-2">
                                {/* Dropdown rôle */}
                                <select
                                  value={m.school_role}
                                  onChange={e => handleChangeMemberRole(s.id, m.user_id, e.target.value)}
                                  className={`text-[10px] font-mono px-2 py-1.5 rounded border bg-transparent cursor-pointer transition-all ${
                                    m.school_role === 'teacher'
                                      ? 'text-nkt-cyan border-nkt-cyan/40 bg-nkt-cyan/10'
                                      : 'text-nkt-muted border-nkt-border'
                                  }`}>
                                  <option value="student" className="bg-nkt-bg text-nkt-text">STUDENT</option>
                                  <option value="teacher" className="bg-nkt-bg text-nkt-text">TEACHER</option>
                                </select>
                              </div>
                              <div className="col-span-1 flex justify-end">
                                <button onClick={() => handleRemoveMember(s.id, m.user_id)}
                                  className="p-1.5 rounded border border-transparent text-nkt-muted hover:border-nkt-red/30 hover:text-nkt-red hover:bg-nkt-red/10 transition-all">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════ COURSES ══════════════ */}
        {tab === 'courses' && isSuperAdmin && (
          <AdminCourses setMsg={setMsg} />
        )}

        {/* ══════════════ EXAMS ══════════════ */}
        {tab === 'exams' && isSuperAdmin && (
          <AdminExams setMsg={setMsg} />
        )}

        {/* ══════════════ ASSIGNMENTS ══════════════ */}
        {tab === 'assignments' && isSuperAdmin && (
          <AdminAssignments setMsg={setMsg} />
        )}

        {/* ══════════════ USERS ══════════════ */}
        {tab === 'users' && isSuperAdmin && (
          <div className="space-y-4">
            {editingUser && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-nkt-card border-2 border-nkt-cyan/40 rounded-xl p-6 w-full max-w-md relative">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-nkt-cyan to-transparent" />
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <Edit2 size={16} className="text-nkt-cyan" />
                      <h2 className="font-mono text-sm font-bold text-nkt-cyan">MODIFIER — {editingUser.username}</h2>
                    </div>
                    <button onClick={() => { setEditingUser(null); setEditUserForm({}); setEditUserMsg(''); }}
                      className="text-nkt-muted hover:text-nkt-text"><X size={18} /></button>
                  </div>
                  <form onSubmit={handleEditUser} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">USERNAME</label>
                      <input className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={editUserForm.username || ''}
                        onChange={e => setEditUserForm({ ...editUserForm, username: e.target.value })} required />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">EMAIL</label>
                      <input type="email" className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={editUserForm.email || ''}
                        onChange={e => setEditUserForm({ ...editUserForm, email: e.target.value })} required />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">
                        NOUVEAU MOT DE PASSE <span className="ml-2 text-nkt-muted/50 text-[10px] font-normal">(vide = pas de changement)</span>
                      </label>
                      <div className="relative">
                        <input type={showEditPw ? 'text' : 'password'} className="nkt-input w-full px-4 py-2.5 rounded text-sm pr-11"
                          placeholder="Nouveau mot de passe..." value={editUserForm.password || ''}
                          onChange={e => setEditUserForm({ ...editUserForm, password: e.target.value })} />
                        <button type="button" onClick={() => setShowEditPw(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-nkt-muted hover:text-nkt-text">
                          {showEditPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                    {editUserMsg && <p className={`text-xs font-mono ${editUserMsg.startsWith('✅') ? 'text-nkt-green' : 'text-nkt-red'}`}>{editUserMsg}</p>}
                    <div className="flex gap-3 pt-2">
                      <button type="submit" disabled={loading}
                        className="flex-1 py-3 rounded text-sm font-mono font-bold bg-nkt-cyan text-nkt-bg flex items-center justify-center gap-2">
                        {loading ? <span className="w-4 h-4 border-2 border-nkt-bg border-t-transparent rounded-full animate-spin" />
                          : <><Save size={14} /> SAUVEGARDER</>}
                      </button>
                      <button type="button" onClick={() => { setEditingUser(null); setEditUserForm({}); setEditUserMsg(''); }}
                        className="nkt-btn px-5 py-3 rounded text-sm">ANNULER</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={() => setShowUserForm(!showUserForm)}
                className="nkt-btn nkt-btn-solid px-5 py-2.5 rounded flex items-center gap-2 text-sm">
                {showUserForm ? <><X size={14} /> ANNULER</> : <><Plus size={14} /> NEW USER</>}
              </button>
            </div>
            {showUserForm && (
              <div className="bg-nkt-card border border-nkt-green/30 rounded-lg p-6">
                <h2 className="font-mono text-sm font-bold text-nkt-green mb-5 tracking-wider">CREATE USER</h2>
                <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">USERNAME *</label>
                    <input className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={userForm.username}
                      onChange={e => setUserForm({ ...userForm, username: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">EMAIL *</label>
                    <input type="email" className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={userForm.email}
                      onChange={e => setUserForm({ ...userForm, email: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">PASSWORD *</label>
                    <input type="password" className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={userForm.password}
                      onChange={e => setUserForm({ ...userForm, password: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">ROLE *</label>
                    <select className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={userForm.role}
                      onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                      {ROLES.map(r => <option key={r} value={r} className="bg-nkt-bg">{r.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <button type="submit" disabled={loading} className="nkt-btn nkt-btn-solid px-8 py-3 rounded text-sm">
                      {loading ? 'CREATING...' : '[ CREATE USER ]'}
                    </button>
                  </div>
                </form>
              </div>
            )}
            <div className="bg-nkt-card border border-nkt-border rounded-lg overflow-hidden">
              <div className="border-b border-nkt-border px-5 py-3 grid grid-cols-12 gap-2 bg-nkt-bg/30">
                <span className="col-span-3 text-[10px] font-mono text-nkt-muted tracking-wider">USER</span>
                <span className="col-span-3 text-[10px] font-mono text-nkt-muted tracking-wider">EMAIL</span>
                <span className="col-span-2 text-[10px] font-mono text-nkt-muted tracking-wider">ROLE</span>
                <span className="col-span-1 text-[10px] font-mono text-nkt-muted tracking-wider">SCORE</span>
                <span className="col-span-1 text-[10px] font-mono text-nkt-muted tracking-wider">VERIFIED</span>
                <span className="col-span-2 text-[10px] font-mono text-nkt-muted tracking-wider text-right">ACTIONS</span>
              </div>
              {users.length === 0 ? (
                <div className="text-center py-12 text-nkt-muted font-mono text-sm">Aucun utilisateur</div>
              ) : users.map(u => (
                <div key={u.id} className={`px-5 py-3.5 grid grid-cols-12 gap-2 items-center border-b border-nkt-border/40 hover:bg-white/[0.02] transition-all ${
                  editingUser?.id === u.id ? 'bg-nkt-cyan/5 border-l-4 border-l-nkt-cyan' : ''
                }`}>
                  <div className="col-span-3 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg border border-nkt-border bg-nkt-bg flex items-center justify-center text-xs font-bold text-nkt-muted flex-shrink-0">
                      {u.username[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="font-mono text-sm text-nkt-text truncate">{u.username}</span>
                  </div>
                  <div className="col-span-3"><span className="font-mono text-xs text-nkt-muted truncate block">{u.email}</span></div>
                  <div className="col-span-2">
                    <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)}
                      className={`text-[10px] font-mono px-2 py-1 rounded border bg-transparent cursor-pointer ${ROLE_STYLES[u.role]}`}>
                      {ROLES.map(r => <option key={r} value={r} className="bg-nkt-bg text-nkt-text">{r.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="col-span-1"><span className="font-mono text-xs text-nkt-green font-bold">{u.score || 0}</span></div>
                  <div className="col-span-1">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      u.email_verified ? 'text-nkt-green border-nkt-green/30 bg-nkt-green/10' : 'text-nkt-red border-nkt-red/30 bg-nkt-red/10'
                    }`}>{u.email_verified ? '✓' : '✗'}</span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button onClick={() => openEditUser(u)} className={`p-1.5 rounded border transition-all ${
                      editingUser?.id === u.id ? 'border-nkt-cyan bg-nkt-cyan/20 text-nkt-cyan'
                        : 'border-nkt-border text-nkt-muted hover:border-nkt-cyan hover:text-nkt-cyan hover:bg-nkt-cyan/10'
                    }`}><Edit2 size={13} /></button>
                    <button onClick={() => handleDeleteUser(u.id)}
                      className="p-1.5 rounded border border-transparent text-nkt-muted hover:border-nkt-red/30 hover:text-nkt-red hover:bg-nkt-red/10 transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════ TEAMS ══════════════ */}
        {tab === 'teams' && isSuperAdmin && (
          <div className="space-y-4">
            {selectedTeam && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-nkt-card border-2 border-nkt-green/40 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-nkt-green to-transparent" />
                  <div className="flex items-center justify-between px-5 py-4 border-b border-nkt-border flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg border border-nkt-green/30 bg-nkt-green/10 flex items-center justify-center">
                        <span className="font-display font-bold text-nkt-green text-lg">{selectedTeam.name?.[0]?.toUpperCase() || '?'}</span>
                      </div>
                      <div>
                        <h2 className="font-mono text-sm font-bold text-nkt-text">{selectedTeam.name}</h2>
                        <p className="text-[10px] font-mono text-nkt-muted">
                          Captain : <span className="text-nkt-green">{selectedTeam.captain_name}</span>
                          &nbsp;·&nbsp;Code : <span className="text-nkt-cyan tracking-widest font-bold">{selectedTeam.invite_code}</span>
                          &nbsp;·&nbsp;{selectedTeam.member_count || 0} membre{(selectedTeam.member_count || 0) > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedTeam(null)} className="text-nkt-muted hover:text-nkt-text transition-colors"><X size={18} /></button>
                  </div>
                  <div className="flex border-b border-nkt-border flex-shrink-0">
                    {[['members', Users, `MEMBRES (${teamMembers.length})`], ['chat', MessageSquare, `CHAT (${teamMessages.length})`]].map(([v, Icon, label]) => (
                      <button key={v} onClick={() => setTeamView(v)}
                        className={`flex items-center gap-2 px-5 py-3 text-xs font-mono font-semibold border-b-2 transition-all ${
                          teamView === v ? 'border-nkt-green text-nkt-green' : 'border-transparent text-nkt-muted hover:text-nkt-text'
                        }`}><Icon size={13} /> {label}</button>
                    ))}
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {loadingTeamDetail ? (
                      <div className="flex items-center justify-center h-40">
                        <div className="w-6 h-6 border-2 border-nkt-green border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : teamView === 'members' ? (
                      <div className="divide-y divide-nkt-border/40">
                        {teamMembers.length === 0 ? <p className="text-center py-10 text-nkt-muted font-mono text-sm">Aucun membre</p>
                          : teamMembers.map((m, i) => (
                            <div key={m.id || i} className="px-5 py-3.5 flex items-center gap-3">
                              <span className="text-[11px] font-mono text-nkt-muted w-5 flex-shrink-0">#{i + 1}</span>
                              <div className="w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0"
                                style={{ borderColor: m.is_captain ? '#ffd700' : '#1a2535', background: m.is_captain ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.03)' }}>
                                <span className="font-bold text-sm" style={{ color: m.is_captain ? '#ffd700' : '#8899aa' }}>
                                  {m.username?.[0]?.toUpperCase() || '?'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm text-nkt-text font-semibold">{m.username}</span>
                                  {m.is_captain && <Crown size={11} className="text-yellow-400" />}
                                </div>
                                <p className="text-[10px] font-mono text-nkt-muted">{m.email}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-display font-bold text-sm text-nkt-green">{m.score || 0}</p>
                                <p className="text-[9px] font-mono text-nkt-muted">pts</p>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="p-4 space-y-3">
                        {teamMessages.length === 0 ? (
                          <div className="text-center py-10">
                            <MessageSquare size={32} className="text-nkt-muted/20 mx-auto mb-2" />
                            <p className="text-nkt-muted font-mono text-sm">Aucun message dans ce chat</p>
                          </div>
                        ) : teamMessages.map((m, i) => {
                          const showName = i === 0 || teamMessages[i - 1]?.username !== m.username;
                          return (
                            <div key={m.id || i} className="flex items-start gap-3">
                              {showName ? (
                                <div className="w-8 h-8 rounded-lg border border-nkt-border bg-nkt-bg flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="font-bold text-xs text-nkt-muted">{m.username?.[0]?.toUpperCase() || '?'}</span>
                                </div>
                              ) : <div className="w-8 flex-shrink-0" />}
                              <div className="flex-1 min-w-0">
                                {showName && (
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[11px] font-mono font-bold ${m.is_captain ? 'text-yellow-400' : 'text-nkt-cyan'}`}>{m.username}</span>
                                    {m.is_captain && <Crown size={10} className="text-yellow-400" />}
                                    <span className="text-[9px] font-mono text-nkt-muted/50">
                                      {m.created_at ? new Date(m.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                  </div>
                                )}
                                <div className="bg-nkt-bg border border-nkt-border rounded-xl rounded-tl-sm px-3.5 py-2.5 font-mono text-sm text-nkt-text inline-block max-w-full break-words">
                                  {m.message}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="border-t border-nkt-border px-5 py-3 flex justify-between items-center flex-shrink-0 bg-nkt-bg/30">
                    <p className="text-[10px] font-mono text-nkt-muted">🔒 Accès admin uniquement</p>
                    <button onClick={() => handleDeleteTeam(selectedTeam.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded border border-nkt-red/30 text-nkt-red bg-nkt-red/5 hover:bg-nkt-red/10 transition-all text-xs font-mono font-bold">
                      <Trash2 size={13} /> SUPPRIMER LA TEAM
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-nkt-muted font-mono text-xs">{adminTeams.length} team{adminTeams.length !== 1 ? 's' : ''}</p>
              <button onClick={refreshAdminTeams} className="nkt-btn px-4 py-2 rounded text-xs flex items-center gap-2">↻ RAFRAÎCHIR</button>
            </div>
            <div className="bg-nkt-card border border-nkt-border rounded-lg overflow-hidden">
              <div className="border-b border-nkt-border px-5 py-3 grid grid-cols-12 gap-2 bg-nkt-bg/30">
                <span className="col-span-3 text-[10px] font-mono text-nkt-muted tracking-wider">TEAM</span>
                <span className="col-span-3 text-[10px] font-mono text-nkt-muted tracking-wider">CAPTAIN</span>
                <span className="col-span-2 text-[10px] font-mono text-nkt-muted tracking-wider">MEMBRES</span>
                <span className="col-span-2 text-[10px] font-mono text-nkt-muted tracking-wider">CODE INVITE</span>
                <span className="col-span-2 text-[10px] font-mono text-nkt-muted tracking-wider text-right">ACTIONS</span>
              </div>
              {adminTeams.length === 0 ? (
                <div className="text-center py-16"><Users size={40} className="text-nkt-muted/20 mx-auto mb-3" /><p className="text-nkt-muted font-mono text-sm">Aucune team créée</p></div>
              ) : adminTeams.map(team => (
                <div key={team.id} className={`px-5 py-3.5 grid grid-cols-12 gap-2 items-center border-b border-nkt-border/40 hover:bg-white/[0.02] transition-all cursor-pointer ${
                  selectedTeam?.id === team.id ? 'bg-nkt-green/5 border-l-4 border-l-nkt-green' : ''
                }`} onClick={() => openTeamDetail(team)}>
                  <div className="col-span-3 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg border border-nkt-green/20 bg-nkt-green/5 flex items-center justify-center text-xs font-bold text-nkt-green flex-shrink-0">
                      {team.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="font-mono text-sm text-nkt-text font-semibold truncate">{team.name}</span>
                  </div>
                  <div className="col-span-3 flex items-center gap-1">
                    <Crown size={11} className="text-yellow-400 flex-shrink-0" />
                    <span className="font-mono text-xs text-nkt-muted truncate">{team.captain_name}</span>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className={`w-4 h-4 rounded border flex items-center justify-center ${
                          i < (team.member_count || 0) ? 'border-nkt-green bg-nkt-green/20' : 'border-nkt-border/30'
                        }`}>{i < (team.member_count || 0) && <div className="w-1.5 h-1.5 rounded-full bg-nkt-green" />}</div>
                      ))}
                      <span className="text-[10px] font-mono text-nkt-muted ml-1">{team.member_count || 0}/4</span>
                    </div>
                  </div>
                  <div className="col-span-2"><span className="font-mono text-xs text-nkt-cyan tracking-widest font-bold">{team.invite_code}</span></div>
                  <div className="col-span-2 flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openTeamDetail(team)} className={`p-1.5 rounded border transition-all ${
                      selectedTeam?.id === team.id ? 'border-nkt-green bg-nkt-green/20 text-nkt-green'
                        : 'border-nkt-border text-nkt-muted hover:border-nkt-green hover:text-nkt-green hover:bg-nkt-green/10'
                    }`}><Eye size={13} /></button>
                    <button onClick={() => handleDeleteTeam(team.id)}
                      className="p-1.5 rounded border border-transparent text-nkt-muted hover:border-nkt-red/30 hover:text-nkt-red hover:bg-nkt-red/10 transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════ DATABASE ══════════════ */}
        {tab === 'database' && isSuperAdmin && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {['users', 'challenges', 'events', 'event_registrations', 'solves', 'submissions',
                'subscriptions', 'teams', 'team_members', 'team_messages',
                'schools', 'school_members', 'courses', 'exams', 'assignments'].map(t => (
                <button key={t} onClick={() => setDbTable(t)}
                  className={`px-4 py-2 rounded text-xs font-mono font-semibold border transition-all ${
                    dbTable === t ? 'border-nkt-cyan bg-nkt-cyan/10 text-nkt-cyan' : 'border-nkt-border text-nkt-muted hover:text-nkt-text'
                  }`}>{t.toUpperCase()}</button>
              ))}
            </div>
            <div className="bg-nkt-card border border-nkt-border rounded-lg overflow-hidden">
              <div className="border-b border-nkt-border px-5 py-3 flex items-center gap-2 bg-nkt-bg/30">
                <Database size={13} className="text-nkt-cyan" />
                <span className="font-mono text-xs text-nkt-cyan tracking-wider">TABLE: {dbTable.toUpperCase()}</span>
                <span className="ml-auto text-[10px] font-mono text-nkt-muted">{dbData.length} rows</span>
              </div>
              <div className="overflow-x-auto">
                {dbData.length > 0 ? (
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b border-nkt-border">
                        {Object.keys(dbData[0]).map(col => (
                          <th key={col} className="px-4 py-2 text-left text-nkt-muted text-[10px] tracking-wider whitespace-nowrap bg-nkt-bg/20">
                            {col.toUpperCase()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dbData.map((row, i) => (
                        <tr key={i} className="border-b border-nkt-border/30 hover:bg-white/[0.02]">
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="px-4 py-2.5 text-nkt-text whitespace-nowrap max-w-[200px] truncate">
                              {val === null ? <span className="text-nkt-muted italic">null</span> :
                               val === true ? <span className="text-nkt-green">true</span> :
                               val === false ? <span className="text-nkt-red">false</span> :
                               typeof val === 'string' && val.length > 40 ? val.substring(0, 40) + '...' : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12 text-nkt-muted font-mono text-sm">Table vide</div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}