import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, Save, X, BookOpen, Star, MessageSquare, Download } from 'lucide-react';
import api from '../api';

const EMPTY_FORM = { title: '', description: '', school_id: '', due_date: '' };

export default function AdminAssignments({ setMsg }) {
  const [assignments, setAssignments] = useState([]);
  const [schools,     setSchools]     = useState([]);
  const [showForm,    setShowForm]    = useState(false);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [loading,     setLoading]     = useState(false);
  const [viewSubs,    setViewSubs]    = useState(null); // devoir dont on voit les rendus
  const [subs,        setSubs]        = useState([]);
  const [grading,     setGrading]     = useState({}); // userId → { grade, feedback }

  const refresh = useCallback(async () => {
    try {
      const [aRes, sRes] = await Promise.all([
        api.get('/assignments/school/all'),
        api.get('/schools'),
      ]);
      setAssignments(aRes.data || []);
      setSchools(sRes.data || []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { refresh(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('/assignments', form);
      setMsg('✅ Devoir créé !');
      setShowForm(false); setForm(EMPTY_FORM);
      await refresh();
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Erreur')); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce devoir ?')) return;
    try { await api.delete(`/assignments/${id}`); setMsg('✅ Devoir supprimé'); await refresh(); }
    catch { setMsg('❌ Erreur'); }
  };

  const openSubmissions = async (assignment) => {
    setViewSubs(assignment); setShowForm(false);
    try {
      const r = await api.get(`/assignments/${assignment.id}/submissions`);
      setSubs(r.data || []);
      const g = {};
      r.data.forEach(s => { g[s.user_id] = { grade: s.grade ?? '', feedback: s.feedback ?? '' }; });
      setGrading(g);
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Erreur')); }
  };

  const handleGrade = async (assignmentId, userId) => {
    const { grade, feedback } = grading[userId] || {};
    if (grade === '' || grade === null || grade === undefined) return setMsg('❌ Entre une note');
    try {
      await api.post(`/assignments/${assignmentId}/submissions/${userId}/grade`, { grade: parseInt(grade), feedback });
      setMsg('✅ Note enregistrée !');
      await openSubmissions(viewSubs);
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Erreur')); }
  };

  const isExpired = (d) => d && new Date(d) < new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-nkt-muted font-mono text-xs">{assignments.length} devoir{assignments.length !== 1 ? 's' : ''}</p>
        <button onClick={showForm ? () => { setShowForm(false); setForm(EMPTY_FORM); } : () => { setShowForm(true); setViewSubs(null); }}
          className="nkt-btn px-5 py-2.5 rounded flex items-center gap-2 text-sm font-mono font-bold border transition-all"
          style={{ background: showForm ? 'transparent' : '#a855f7', borderColor: '#a855f7', color: showForm ? '#a855f7' : '#080d14' }}>
          {showForm ? <><X size={14} /> ANNULER</> : <><Plus size={14} /> NEW DEVOIR</>}
        </button>
      </div>

      {/* ── Formulaire ── */}
      {showForm && (
        <div className="bg-nkt-card border-2 rounded-xl p-6" style={{ borderColor: 'rgba(168,85,247,0.4)' }}>
          <div className="flex items-center gap-2 mb-5">
            <BookOpen size={16} style={{ color: '#a855f7' }} />
            <h2 className="font-mono text-sm font-bold tracking-wider" style={{ color: '#a855f7' }}>CRÉER UN DEVOIR</h2>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">TITRE *</label>
              <input className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Rapport TP Forensics" required />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">ÉCOLE *</label>
              <select className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={form.school_id}
                onChange={e => setForm({ ...form, school_id: e.target.value })} required>
                <option value="">-- Choisir une école --</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">DATE LIMITE *</label>
              <input type="datetime-local" className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={form.due_date}
                onChange={e => setForm({ ...form, due_date: e.target.value })} required />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">DESCRIPTION</label>
              <input className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Consignes..." />
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={loading}
                className="px-8 py-3 rounded text-sm font-mono font-bold flex items-center gap-2"
                style={{ background: '#a855f7', color: '#080d14' }}>
                {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <><Plus size={14} /> CRÉER</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Rendus / Corrections ── */}
      {viewSubs && (
        <div className="bg-nkt-card border border-nkt-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-nkt-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star size={14} className="text-yellow-400" />
              <span className="font-mono text-sm font-bold text-nkt-text">RENDUS — {viewSubs.title}</span>
              <span className="text-[10px] font-mono text-nkt-muted">({subs.length} rendu{subs.length !== 1 ? 's' : ''})</span>
            </div>
            <button onClick={() => { setViewSubs(null); setSubs([]); }} className="text-nkt-muted hover:text-nkt-text"><X size={16} /></button>
          </div>

          {subs.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-mono text-sm text-nkt-muted">Aucun rendu pour l'instant</p>
            </div>
          ) : subs.map(sub => (
            <div key={sub.user_id} className="border-b border-nkt-border/30 p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="font-mono text-sm font-bold text-nkt-text">{sub.username}</p>
                  <p className="text-[10px] font-mono text-nkt-muted">{sub.email}</p>
                  <p className="text-[10px] font-mono text-nkt-muted mt-1">
                    Rendu le {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString('fr-FR') : '—'}
                  </p>
                </div>
                {sub.grade !== null && (
                  <div className="text-right">
                    <p className="font-display text-2xl font-bold text-nkt-green">{sub.grade}<span className="text-sm text-nkt-muted">/100</span></p>
                    {sub.feedback && <p className="text-[10px] font-mono text-nkt-muted mt-1 max-w-xs">{sub.feedback}</p>}
                  </div>
                )}
              </div>

              {/* Contenu du rendu */}
              {sub.content && (
                <div className="bg-nkt-bg border border-nkt-border rounded-lg p-3 mb-3">
                  <p className="text-[10px] font-mono text-nkt-muted mb-1 tracking-widest">RÉPONSE</p>
                  <p className="font-mono text-sm text-nkt-text whitespace-pre-wrap">{sub.content}</p>
                </div>
              )}

              {/* Fichier joint */}
              {sub.file_name && (
                <div className="flex items-center gap-2 mb-3">
                  <Download size={12} className="text-nkt-cyan" />
                  <span className="font-mono text-xs text-nkt-cyan">{sub.file_name}</span>
                </div>
              )}

              {/* Zone de notation */}
              <div className="flex items-end gap-3 mt-3 pt-3 border-t border-nkt-border/30 flex-wrap">
                <div>
                  <label className="block text-[10px] font-mono text-nkt-muted mb-1 tracking-widest">NOTE /100</label>
                  <input type="number" min="0" max="100"
                    className="nkt-input px-3 py-2 rounded text-sm w-24 text-center font-mono font-bold"
                    value={grading[sub.user_id]?.grade ?? ''}
                    onChange={e => setGrading(prev => ({ ...prev, [sub.user_id]: { ...prev[sub.user_id], grade: e.target.value } }))}
                    placeholder="—"
                    style={{ color: grading[sub.user_id]?.grade >= 70 ? '#00ff88' : grading[sub.user_id]?.grade ? '#ff4560' : '' }}
                  />
                </div>
                <div className="flex-1 min-w-48">
                  <label className="block text-[10px] font-mono text-nkt-muted mb-1 tracking-widest">COMMENTAIRE</label>
                  <input className="nkt-input w-full px-3 py-2 rounded text-sm font-mono"
                    value={grading[sub.user_id]?.feedback ?? ''}
                    onChange={e => setGrading(prev => ({ ...prev, [sub.user_id]: { ...prev[sub.user_id], feedback: e.target.value } }))}
                    placeholder="Feedback optionnel..." />
                </div>
                <button onClick={() => handleGrade(viewSubs.id, sub.user_id)}
                  className="flex items-center gap-2 px-5 py-2 rounded text-xs font-mono font-bold nkt-btn nkt-btn-solid">
                  <Save size={12} /> NOTER
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Liste devoirs ── */}
      <div className="space-y-2">
        {assignments.length === 0 ? (
          <div className="text-center py-16 bg-nkt-card border border-nkt-border rounded-xl">
            <BookOpen size={40} className="text-nkt-muted/20 mx-auto mb-3" />
            <p className="font-mono text-sm text-nkt-muted">Aucun devoir créé</p>
          </div>
        ) : assignments.map(a => (
          <div key={a.id} className="bg-nkt-card border border-nkt-border rounded-xl p-4 hover:border-purple-500/20 transition-all">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] font-mono text-nkt-muted border border-nkt-border px-2 py-0.5 rounded">
                    {schools.find(s => s.id == a.school_id)?.name || 'École inconnue'}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    isExpired(a.due_date) ? 'text-nkt-red border-nkt-red/30 bg-nkt-red/10' : 'text-nkt-green border-nkt-green/30 bg-nkt-green/10'
                  }`}>
                    {isExpired(a.due_date) ? '⛔ EXPIRÉ' : '✓ ACTIF'}
                  </span>
                  <span className="text-[10px] font-mono text-nkt-muted">
                    📅 {a.due_date ? new Date(a.due_date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                </div>
                <p className="font-mono text-sm font-bold text-nkt-text">{a.title}</p>
                {a.description && <p className="text-[11px] font-mono text-nkt-muted mt-1">{a.description}</p>}
                <p className="text-[10px] font-mono text-nkt-muted mt-1">{a.submission_count || 0} rendu{(a.submission_count || 0) !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => openSubmissions(a)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded border text-[10px] font-mono font-bold border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10 transition-all">
                  <Star size={11} /> CORRIGER ({a.submission_count || 0})
                </button>
                <button onClick={() => handleDelete(a.id)}
                  className="p-1.5 rounded border border-transparent text-nkt-muted hover:border-nkt-red/30 hover:text-nkt-red hover:bg-nkt-red/10 transition-all">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}