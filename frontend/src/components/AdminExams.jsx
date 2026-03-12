import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, Save, X, ClipboardList, Trophy, Users, Clock, Eye } from 'lucide-react';
import api from '../api';

const EMPTY_EXAM = { title: '', description: '', school_id: '', duration_minutes: 60, challenge_ids: [] };

export default function AdminExams({ setMsg }) {
  const [exams,       setExams]       = useState([]);
  const [schools,     setSchools]     = useState([]);
  const [challenges,  setChallenges]  = useState([]);
  const [showForm,    setShowForm]    = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [form,        setForm]        = useState(EMPTY_EXAM);
  const [loading,     setLoading]     = useState(false);
  const [results,     setResults]     = useState(null); // résultats d'un examen
  const [viewExam,    setViewExam]    = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [examsRes, schoolsRes, chalRes] = await Promise.all([
        api.get('/exams'),
        api.get('/schools'),
        api.get('/admin/challenges'),
      ]);
      setExams(examsRes.data || []);
      setSchools(schoolsRes.data || []);
      setChallenges(chalRes.data || []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { refresh(); }, []);

  const openCreate = () => { setEditingExam(null); setForm(EMPTY_EXAM); setShowForm(true); setResults(null); setViewExam(null); };
  const openEdit   = (e) => {
    setEditingExam(e);
    setForm({
      title: e.title, description: e.description || '',
      school_id: e.school_id, duration_minutes: e.duration_minutes,
      challenge_ids: e.challenge_ids || [],
    });
    setShowForm(true); setResults(null); setViewExam(null);
  };

  const toggleChallenge = (id) => {
    setForm(prev => ({
      ...prev,
      challenge_ids: prev.challenge_ids.includes(id)
        ? prev.challenge_ids.filter(c => c !== id)
        : [...prev.challenge_ids, id],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (editingExam) {
        await api.put(`/exams/${editingExam.id}`, form);
        setMsg('✅ Examen modifié !');
      } else {
        await api.post('/exams', form);
        setMsg('✅ Examen créé !');
      }
      setShowForm(false); setEditingExam(null); setForm(EMPTY_EXAM);
      await refresh();
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Erreur')); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cet examen ?')) return;
    try { await api.delete(`/exams/${id}`); setMsg('✅ Examen supprimé'); await refresh(); }
    catch { setMsg('❌ Erreur'); }
  };

  const handleToggleStatus = async (exam) => {
    const newStatus = exam.status === 'active' ? 'draft' : 'active';
    try {
      await api.patch(`/exams/${exam.id}/status`, { status: newStatus });
      setMsg(`✅ Examen ${newStatus === 'active' ? 'activé' : 'désactivé'}`);
      await refresh();
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Erreur')); }
  };

  const viewResults = async (exam) => {
    setViewExam(exam); setShowForm(false);
    try {
      const r = await api.get(`/exams/${exam.id}/results`);
      setResults(r.data);
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Erreur résultats')); }
  };

  const STATUS_COLORS = {
    draft:    'text-nkt-muted border-nkt-border',
    active:   'text-nkt-green border-nkt-green/30 bg-nkt-green/10',
    finished: 'text-nkt-red border-nkt-red/30 bg-nkt-red/10',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-nkt-muted font-mono text-xs">{exams.length} examen{exams.length !== 1 ? 's' : ''}</p>
        <button onClick={showForm ? () => { setShowForm(false); setEditingExam(null); } : openCreate}
          className="nkt-btn nkt-btn-solid px-5 py-2.5 rounded flex items-center gap-2 text-sm">
          {showForm ? <><X size={14} /> ANNULER</> : <><Plus size={14} /> NEW EXAM</>}
        </button>
      </div>

      {/* ── Formulaire ── */}
      {showForm && (
        <div className="bg-nkt-card border-2 border-nkt-green/40 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <ClipboardList size={16} className="text-nkt-green" />
            <h2 className="font-mono text-sm font-bold text-nkt-green tracking-wider">
              {editingExam ? `MODIFIER — ${editingExam.title}` : 'CRÉER UN EXAMEN'}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">TITRE *</label>
                <input className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Examen Final S1" required />
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
                <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">DURÉE (minutes)</label>
                <input type="number" className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={form.duration_minutes}
                  onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) })} min="10" max="480" />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">DESCRIPTION</label>
                <input className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optionnel..." />
              </div>
            </div>

            {/* Sélection challenges */}
            <div>
              <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">
                CHALLENGES ({form.challenge_ids.length} sélectionnés)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-nkt-border rounded-lg p-3">
                {challenges.filter(c => c.is_active).map(c => (
                  <button key={c.id} type="button" onClick={() => toggleChallenge(c.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded border text-left transition-all ${
                      form.challenge_ids.includes(c.id)
                        ? 'border-nkt-green bg-nkt-green/10 text-nkt-green'
                        : 'border-nkt-border text-nkt-muted hover:border-nkt-green/30'
                    }`}>
                    <div>
                      <p className="font-mono text-xs font-bold">{c.title}</p>
                      <p className="text-[10px] font-mono opacity-70">{c.category} · {c.difficulty}</p>
                    </div>
                    <span className="font-display text-sm font-bold ml-2">{c.points}pts</span>
                  </button>
                ))}
                {challenges.filter(c => c.is_active).length === 0 && (
                  <p className="text-nkt-muted font-mono text-xs col-span-2 text-center py-4">
                    Aucun challenge actif — crée des challenges d'abord
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={loading || form.challenge_ids.length === 0}
                className="nkt-btn nkt-btn-solid px-8 py-3 rounded text-sm font-mono font-bold flex items-center gap-2 disabled:opacity-50">
                {loading ? <span className="w-4 h-4 border-2 border-nkt-bg border-t-transparent rounded-full animate-spin" />
                  : editingExam ? <><Save size={14} /> SAUVEGARDER</> : <><Plus size={14} /> CRÉER</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Résultats ── */}
      {viewExam && results && (
        <div className="bg-nkt-card border border-nkt-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-nkt-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-yellow-400" />
              <span className="font-mono text-sm font-bold text-nkt-text">RÉSULTATS — {viewExam.title}</span>
            </div>
            <button onClick={() => { setViewExam(null); setResults(null); }} className="text-nkt-muted hover:text-nkt-text"><X size={16} /></button>
          </div>
          {results.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-mono text-sm text-nkt-muted">Aucun étudiant n'a encore passé cet examen</p>
            </div>
          ) : (
            <div>
              <div className="px-5 py-2 grid grid-cols-12 gap-2 bg-nkt-bg/30 border-b border-nkt-border">
                <span className="col-span-1 text-[10px] font-mono text-nkt-muted">#</span>
                <span className="col-span-4 text-[10px] font-mono text-nkt-muted">ÉTUDIANT</span>
                <span className="col-span-2 text-[10px] font-mono text-nkt-muted">SCORE</span>
                <span className="col-span-2 text-[10px] font-mono text-nkt-muted">%</span>
                <span className="col-span-2 text-[10px] font-mono text-nkt-muted">STATUS</span>
                <span className="col-span-1 text-[10px] font-mono text-nkt-muted">CERT</span>
              </div>
              {results.sort((a, b) => (b.score || 0) - (a.score || 0)).map((r, i) => (
                <div key={r.user_id} className="px-5 py-3 grid grid-cols-12 gap-2 items-center border-b border-nkt-border/30 hover:bg-white/[0.02]">
                  <span className="col-span-1 font-mono text-sm text-nkt-muted">#{i + 1}</span>
                  <div className="col-span-4">
                    <p className="font-mono text-sm font-bold text-nkt-text">{r.username}</p>
                    <p className="text-[10px] font-mono text-nkt-muted">{r.email}</p>
                  </div>
                  <span className="col-span-2 font-display text-lg font-bold text-nkt-green">{r.score || 0}</span>
                  <span className="col-span-2 font-mono text-sm text-nkt-text">{r.percentage || 0}%</span>
                  <span className={`col-span-2 text-[10px] font-mono px-2 py-0.5 rounded border w-fit ${
                    r.status === 'finished' ? 'text-nkt-green border-nkt-green/30 bg-nkt-green/10' :
                    r.status === 'in_progress' ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' :
                    'text-nkt-muted border-nkt-border'
                  }`}>{r.status === 'finished' ? '✓ FIN' : r.status === 'in_progress' ? '▶ EN COURS' : r.status}</span>
                  <span className="col-span-1 text-center">{r.certificate ? '🏅' : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Liste examens ── */}
      <div className="space-y-2">
        {exams.length === 0 ? (
          <div className="text-center py-16 bg-nkt-card border border-nkt-border rounded-xl">
            <ClipboardList size={40} className="text-nkt-muted/20 mx-auto mb-3" />
            <p className="font-mono text-sm text-nkt-muted">Aucun examen créé</p>
          </div>
        ) : exams.map(exam => (
          <div key={exam.id} className="bg-nkt-card border border-nkt-border rounded-xl p-4 hover:border-nkt-green/20 transition-all">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${STATUS_COLORS[exam.status]}`}>
                    {exam.status?.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-mono text-nkt-muted border border-nkt-border px-2 py-0.5 rounded">
                    {schools.find(s => s.id == exam.school_id)?.name || 'École inconnue'}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-mono text-nkt-muted">
                    <Clock size={10} /> {exam.duration_minutes} min
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-mono text-nkt-muted">
                    <ClipboardList size={10} /> {exam.challenge_count || 0} challenges
                  </span>
                </div>
                <p className="font-mono text-sm font-bold text-nkt-text">{exam.title}</p>
                {exam.description && <p className="text-[11px] font-mono text-nkt-muted mt-1">{exam.description}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => viewResults(exam)}
                  className="p-1.5 rounded border border-nkt-border text-nkt-muted hover:border-yellow-400 hover:text-yellow-400 transition-all" title="Voir résultats">
                  <Trophy size={13} />
                </button>
                <button onClick={() => handleToggleStatus(exam)}
                  className={`px-3 py-1.5 rounded border text-[10px] font-mono font-bold transition-all ${
                    exam.status === 'active'
                      ? 'border-nkt-red/30 text-nkt-red hover:bg-nkt-red/10'
                      : 'border-nkt-green/30 text-nkt-green hover:bg-nkt-green/10'
                  }`}>
                  {exam.status === 'active' ? '⏸ DÉSACTIVER' : '▶ ACTIVER'}
                </button>
                <button onClick={() => openEdit(exam)}
                  className="p-1.5 rounded border border-nkt-border text-nkt-muted hover:border-nkt-cyan hover:text-nkt-cyan transition-all">
                  <Edit2 size={13} />
                </button>
                <button onClick={() => handleDelete(exam.id)}
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