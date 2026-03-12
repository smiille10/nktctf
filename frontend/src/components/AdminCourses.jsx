import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronRight,
  BookOpen, Video, FileText, Eye, EyeOff
} from 'lucide-react';
import api from '../api';

const DIFF = ['beginner', 'intermediate', 'advanced'];
const CATS = ['FORENSICS', 'CRYPTO', 'OSINT', 'WEB', 'MISC'];
const LESSON_TYPES = ['text', 'video'];

const EMPTY_COURSE = { title: '', description: '', category: 'FORENSICS', difficulty: 'beginner', thumbnail: '' };
const EMPTY_CHAPTER = { title: '' };
const EMPTY_LESSON = { title: '', content: '', type: 'text', video_url: '', duration_minutes: 5 };

const DIFF_COLORS = {
  beginner:     'text-nkt-green border-nkt-green/30 bg-nkt-green/10',
  intermediate: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  advanced:     'text-nkt-red border-nkt-red/30 bg-nkt-red/10',
};

export default function AdminCourses({ setMsg }) {
  const [courses,        setCourses]        = useState([]);
  const [loading,        setLoading]        = useState(false);

  // ── Course form ──
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse,  setEditingCourse]  = useState(null);
  const [courseForm,     setCourseForm]     = useState(EMPTY_COURSE);

  // ── Selected course (pour voir chapitres/leçons) ──
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseDetail,   setCourseDetail]   = useState(null);
  const [openChapters,   setOpenChapters]   = useState({});

  // ── Chapter form ──
  const [showChapterForm, setShowChapterForm] = useState(false);
  const [chapterForm,     setChapterForm]     = useState(EMPTY_CHAPTER);

  // ── Lesson form ──
  const [showLessonForm,  setShowLessonForm]  = useState(false);
  const [editingLesson,   setEditingLesson]   = useState(null);
  const [lessonChapterId, setLessonChapterId] = useState(null);
  const [lessonForm,      setLessonForm]      = useState(EMPTY_LESSON);

  const refreshCourses = useCallback(async () => {
    try {
      // On fetch tous les cours (publiés ou non) via l'admin
      const r = await api.get('/courses');
      setCourses(r.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const refreshCourseDetail = useCallback(async (courseId) => {
    try {
      const r = await api.get(`/courses/${courseId}`);
      setCourseDetail(r.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { refreshCourses(); }, []);

  // ── COURSE ──

  const openCreateCourse = () => {
    setEditingCourse(null);
    setCourseForm(EMPTY_COURSE);
    setShowCourseForm(true);
  };

  const openEditCourse = (c) => {
    setEditingCourse(c);
    setCourseForm({
      title: c.title || '', description: c.description || '',
      category: c.category || 'FORENSICS', difficulty: c.difficulty || 'beginner',
      thumbnail: c.thumbnail || '',
    });
    setShowCourseForm(true);
  };

  const handleSubmitCourse = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (editingCourse) {
        await api.put(`/courses/${editingCourse.id}`, courseForm);
        setMsg('✅ Cours modifié !');
      } else {
        await api.post('/courses', courseForm);
        setMsg('✅ Cours créé !');
      }
      setShowCourseForm(false); setEditingCourse(null); setCourseForm(EMPTY_COURSE);
      await refreshCourses();
      if (selectedCourse) await refreshCourseDetail(selectedCourse.id);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Erreur'));
    } finally { setLoading(false); }
  };

  const handleDeleteCourse = async (id) => {
    if (!confirm('Supprimer ce cours et tout son contenu ?')) return;
    try {
      await api.delete(`/courses/${id}`);
      setMsg('✅ Cours supprimé');
      if (selectedCourse?.id === id) { setSelectedCourse(null); setCourseDetail(null); }
      await refreshCourses();
    } catch (err) { setMsg('❌ Erreur'); }
  };

  const handleTogglePublish = async (course) => {
    try {
      await api.put(`/courses/${course.id}`, { ...course, is_published: !course.is_published });
      setMsg(course.is_published ? '✅ Cours masqué' : '✅ Cours publié !');
      await refreshCourses();
    } catch (err) { setMsg('❌ Erreur'); }
  };

  const selectCourse = async (course) => {
    setSelectedCourse(course);
    setShowCourseForm(false);
    setShowChapterForm(false);
    setShowLessonForm(false);
    await refreshCourseDetail(course.id);
  };

  // ── CHAPTER ──

  const handleCreateChapter = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const orderIndex = courseDetail?.chapters?.length || 0;
      await api.post(`/courses/${selectedCourse.id}/chapters`, { ...chapterForm, order_index: orderIndex });
      setMsg('✅ Chapitre créé !');
      setChapterForm(EMPTY_CHAPTER); setShowChapterForm(false);
      await refreshCourseDetail(selectedCourse.id);
    } catch (err) { setMsg('❌ Erreur'); } finally { setLoading(false); }
  };

  const handleDeleteChapter = async (chapterId) => {
    if (!confirm('Supprimer ce chapitre et ses leçons ?')) return;
    try {
      // On supprime en cascade via le backend
      await api.delete(`/courses/${selectedCourse.id}/chapters/${chapterId}`);
      setMsg('✅ Chapitre supprimé');
      await refreshCourseDetail(selectedCourse.id);
    } catch (err) { setMsg('❌ Erreur'); }
  };

  // ── LESSON ──

  const openCreateLesson = (chapterId) => {
    setEditingLesson(null);
    setLessonChapterId(chapterId);
    setLessonForm(EMPTY_LESSON);
    setShowLessonForm(true);
    setOpenChapters(prev => ({ ...prev, [chapterId]: true }));
  };

  const openEditLesson = (lesson, chapterId) => {
    setEditingLesson(lesson);
    setLessonChapterId(chapterId);
    setLessonForm({
      title: lesson.title || '', content: lesson.content || '',
      type: lesson.type || 'text', video_url: lesson.video_url || '',
      duration_minutes: lesson.duration_minutes || 5,
    });
    setShowLessonForm(true);
  };

  const handleSubmitLesson = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (editingLesson) {
        await api.put(`/courses/${selectedCourse.id}/lessons/${editingLesson.id}`, lessonForm);
        setMsg('✅ Leçon modifiée !');
      } else {
        const chapter = courseDetail?.chapters?.find(c => c.id === lessonChapterId);
        const orderIndex = chapter?.lessons?.length || 0;
        await api.post(`/courses/${selectedCourse.id}/chapters/${lessonChapterId}/lessons`, { ...lessonForm, order_index: orderIndex });
        setMsg('✅ Leçon créée !');
      }
      setShowLessonForm(false); setEditingLesson(null); setLessonForm(EMPTY_LESSON);
      await refreshCourseDetail(selectedCourse.id);
    } catch (err) { setMsg('❌ ' + (err.response?.data?.error || 'Erreur')); } finally { setLoading(false); }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!confirm('Supprimer cette leçon ?')) return;
    try {
      await api.delete(`/courses/${selectedCourse.id}/lessons/${lessonId}`);
      setMsg('✅ Leçon supprimée');
      await refreshCourseDetail(selectedCourse.id);
    } catch (err) { setMsg('❌ Erreur'); }
  };

  // ══════════════ RENDER ══════════════

  return (
    <div className="space-y-4">

      {/* ── Liste des cours ── */}
      <div className="flex items-center justify-between">
        <p className="text-nkt-muted font-mono text-xs">{courses.length} cours</p>
        <button onClick={() => { setSelectedCourse(null); setCourseDetail(null); openCreateCourse(); }}
          className="nkt-btn nkt-btn-solid px-5 py-2.5 rounded flex items-center gap-2 text-sm">
          <Plus size={14} /> NEW COURSE
        </button>
      </div>

      {/* ── Formulaire cours ── */}
      {showCourseForm && (
        <div className="bg-nkt-card border-2 border-nkt-green/40 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            {editingCourse ? <Edit2 size={16} className="text-nkt-cyan" /> : <BookOpen size={16} className="text-nkt-green" />}
            <h2 className={`font-mono text-sm font-bold tracking-wider ${editingCourse ? 'text-nkt-cyan' : 'text-nkt-green'}`}>
              {editingCourse ? `MODIFIER — ${editingCourse.title}` : 'CRÉER UN COURS'}
            </h2>
            <button onClick={() => { setShowCourseForm(false); setEditingCourse(null); }} className="ml-auto text-nkt-muted hover:text-nkt-text">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmitCourse} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">TITRE *</label>
              <input className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={courseForm.title}
                onChange={e => setCourseForm({ ...courseForm, title: e.target.value })} placeholder="Ex: Introduction à la Cryptographie" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">DESCRIPTION</label>
              <textarea className="nkt-input w-full px-4 py-2.5 rounded text-sm h-20 resize-none" value={courseForm.description}
                onChange={e => setCourseForm({ ...courseForm, description: e.target.value })} placeholder="Description du cours..." />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">CATÉGORIE</label>
              <select className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={courseForm.category}
                onChange={e => setCourseForm({ ...courseForm, category: e.target.value })}>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">NIVEAU</label>
              <div className="flex gap-2">
                {DIFF.map(d => (
                  <button key={d} type="button" onClick={() => setCourseForm({ ...courseForm, difficulty: d })}
                    className={`flex-1 py-2.5 rounded text-xs font-mono font-bold border transition-all capitalize ${
                      courseForm.difficulty === d ? DIFF_COLORS[d] : 'border-nkt-border text-nkt-muted'
                    }`}>{d}</button>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">URL THUMBNAIL (optionnel)</label>
              <input className="nkt-input w-full px-4 py-2.5 rounded text-sm" value={courseForm.thumbnail}
                onChange={e => setCourseForm({ ...courseForm, thumbnail: e.target.value })} placeholder="https://..." />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={loading}
                className={`px-8 py-3 rounded text-sm font-mono font-bold flex items-center gap-2 ${editingCourse ? 'bg-nkt-cyan text-nkt-bg' : 'nkt-btn nkt-btn-solid'}`}>
                {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : editingCourse ? <><Save size={14} /> SAUVEGARDER</> : <><Plus size={14} /> CRÉER</>}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Grille cours ── */}
        <div className="space-y-2">
          {courses.length === 0 ? (
            <div className="text-center py-16 bg-nkt-card border border-nkt-border rounded-xl">
              <BookOpen size={40} className="text-nkt-muted/20 mx-auto mb-3" />
              <p className="text-nkt-muted font-mono text-sm">Aucun cours créé</p>
            </div>
          ) : courses.map(c => (
            <div key={c.id}
              onClick={() => selectCourse(c)}
              className={`bg-nkt-card border rounded-xl p-4 cursor-pointer transition-all ${
                selectedCourse?.id === c.id ? 'border-nkt-green/50 bg-nkt-green/5 border-l-4 border-l-nkt-green' : 'border-nkt-border hover:border-nkt-green/30'
              }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-mono font-bold text-nkt-muted">{c.category}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border capitalize ${DIFF_COLORS[c.difficulty]}`}>
                      {c.difficulty}
                    </span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      c.is_published ? 'text-nkt-green border-nkt-green/30 bg-nkt-green/10' : 'text-nkt-muted border-nkt-border'
                    }`}>{c.is_published ? '✓ PUBLIÉ' : 'BROUILLON'}</span>
                  </div>
                  <p className="font-mono text-sm font-bold text-nkt-text truncate">{c.title}</p>
                  <p className="text-[10px] font-mono text-nkt-muted mt-0.5">{c.lesson_count || 0} leçons · {c.chapter_count || 0} chapitres</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleTogglePublish(c)} title={c.is_published ? 'Masquer' : 'Publier'}
                    className={`p-1.5 rounded border transition-all ${
                      c.is_published ? 'border-nkt-green/30 text-nkt-green hover:bg-nkt-green/10' : 'border-nkt-border text-nkt-muted hover:text-nkt-green hover:border-nkt-green/30'
                    }`}>{c.is_published ? <Eye size={13} /> : <EyeOff size={13} />}</button>
                  <button onClick={() => openEditCourse(c)}
                    className="p-1.5 rounded border border-nkt-border text-nkt-muted hover:border-nkt-cyan hover:text-nkt-cyan transition-all">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => handleDeleteCourse(c.id)}
                    className="p-1.5 rounded border border-transparent text-nkt-muted hover:border-nkt-red/30 hover:text-nkt-red hover:bg-nkt-red/10 transition-all">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Éditeur chapitres/leçons ── */}
        {selectedCourse && courseDetail && (
          <div className="bg-nkt-card border border-nkt-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-nkt-border flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-nkt-muted tracking-widest">CONTENU DU COURS</p>
                <p className="font-mono text-sm font-bold text-nkt-text">{selectedCourse.title}</p>
              </div>
              <button onClick={() => { setShowChapterForm(!showChapterForm); setShowLessonForm(false); }}
                className="nkt-btn nkt-btn-solid px-4 py-2 rounded text-xs flex items-center gap-1">
                <Plus size={12} /> CHAPITRE
              </button>
            </div>

            {/* Form nouveau chapitre */}
            {showChapterForm && (
              <form onSubmit={handleCreateChapter} className="px-5 py-3 border-b border-nkt-border bg-nkt-green/5 flex gap-2">
                <input className="nkt-input flex-1 px-3 py-2 rounded text-sm font-mono" placeholder="Titre du chapitre..."
                  value={chapterForm.title} onChange={e => setChapterForm({ title: e.target.value })} required autoFocus />
                <button type="submit" disabled={loading}
                  className="nkt-btn nkt-btn-solid px-4 py-2 rounded text-xs font-mono font-bold">
                  {loading ? '...' : 'CRÉER'}
                </button>
                <button type="button" onClick={() => setShowChapterForm(false)} className="p-2 text-nkt-muted hover:text-nkt-text">
                  <X size={14} />
                </button>
              </form>
            )}

            {/* Form leçon */}
            {showLessonForm && (
              <div className="px-5 py-4 border-b border-nkt-border" style={{ background: 'rgba(0,212,255,0.03)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <FileText size={14} className="text-nkt-cyan" />
                  <p className="font-mono text-xs font-bold text-nkt-cyan tracking-wider">
                    {editingLesson ? 'MODIFIER LA LEÇON' : 'NOUVELLE LEÇON'}
                  </p>
                  <button onClick={() => { setShowLessonForm(false); setEditingLesson(null); }} className="ml-auto text-nkt-muted hover:text-nkt-text">
                    <X size={14} />
                  </button>
                </div>
                <form onSubmit={handleSubmitLesson} className="space-y-3">
                  <input className="nkt-input w-full px-3 py-2 rounded text-sm font-mono" placeholder="Titre de la leçon *"
                    value={lessonForm.title} onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })} required />
                  <div className="flex gap-2">
                    {LESSON_TYPES.map(t => (
                      <button key={t} type="button" onClick={() => setLessonForm({ ...lessonForm, type: t })}
                        className={`flex-1 py-2 rounded text-xs font-mono font-bold border transition-all flex items-center justify-center gap-1 ${
                          lessonForm.type === t ? 'border-nkt-cyan bg-nkt-cyan/10 text-nkt-cyan' : 'border-nkt-border text-nkt-muted'
                        }`}>
                        {t === 'video' ? <Video size={11} /> : <FileText size={11} />} {t.toUpperCase()}
                      </button>
                    ))}
                    <input type="number" className="nkt-input w-20 px-3 py-2 rounded text-sm text-center font-mono"
                      value={lessonForm.duration_minutes} onChange={e => setLessonForm({ ...lessonForm, duration_minutes: parseInt(e.target.value) })}
                      min="1" max="180" title="Durée en minutes" />
                  </div>
                  {lessonForm.type === 'video' && (
                    <input className="nkt-input w-full px-3 py-2 rounded text-sm font-mono" placeholder="URL de la vidéo (YouTube embed, etc.)"
                      value={lessonForm.video_url} onChange={e => setLessonForm({ ...lessonForm, video_url: e.target.value })} />
                  )}
                  <textarea className="nkt-input w-full px-3 py-2 rounded text-sm font-mono h-32 resize-none"
                    placeholder="Contenu de la leçon (texte, markdown...)"
                    value={lessonForm.content} onChange={e => setLessonForm({ ...lessonForm, content: e.target.value })} />
                  <div className="flex gap-2">
                    <button type="submit" disabled={loading}
                      className="flex-1 py-2 rounded text-xs font-mono font-bold bg-nkt-cyan text-nkt-bg flex items-center justify-center gap-1">
                      {loading ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        : editingLesson ? <><Save size={12} /> SAUVEGARDER</> : <><Plus size={12} /> CRÉER</>}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Chapitres et leçons */}
            <div className="overflow-y-auto max-h-[60vh]">
              {!courseDetail.chapters || courseDetail.chapters.length === 0 ? (
                <div className="text-center py-10">
                  <p className="font-mono text-xs text-nkt-muted">Aucun chapitre — clique sur "+ CHAPITRE"</p>
                </div>
              ) : courseDetail.chapters.map((ch, ci) => (
                <div key={ch.id} className="border-b border-nkt-border/40">
                  {/* Header chapitre */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-nkt-bg/30">
                    <button onClick={() => setOpenChapters(prev => ({ ...prev, [ch.id]: !prev[ch.id] }))}
                      className="flex items-center gap-2 flex-1 text-left">
                      {openChapters[ch.id] ? <ChevronDown size={13} className="text-nkt-muted flex-shrink-0" /> : <ChevronRight size={13} className="text-nkt-muted flex-shrink-0" />}
                      <span className="text-[10px] font-mono text-nkt-muted">CH{ci + 1}</span>
                      <span className="font-mono text-xs font-bold text-nkt-text">{ch.title}</span>
                      <span className="text-[10px] font-mono text-nkt-muted ml-1">({ch.lessons?.length || 0})</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openCreateLesson(ch.id)}
                        className="p-1 rounded border border-nkt-border text-nkt-muted hover:border-nkt-green hover:text-nkt-green transition-all text-[10px] font-mono px-2">
                        + leçon
                      </button>
                      <button onClick={() => handleDeleteChapter(ch.id)}
                        className="p-1 rounded border border-transparent text-nkt-muted hover:text-nkt-red hover:border-nkt-red/30 transition-all">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Leçons */}
                  {openChapters[ch.id] && (
                    <div>
                      {ch.lessons?.length === 0 ? (
                        <p className="px-10 py-2 text-[10px] font-mono text-nkt-muted italic">Aucune leçon</p>
                      ) : ch.lessons.map((lesson, li) => (
                        <div key={lesson.id} className="flex items-center gap-3 px-8 py-2.5 hover:bg-white/[0.02] border-t border-nkt-border/20 transition-all">
                          <span className="text-[10px] font-mono text-nkt-muted w-5 flex-shrink-0">{li + 1}.</span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {lesson.type === 'video'
                              ? <Video size={11} className="text-nkt-cyan" />
                              : <FileText size={11} className="text-nkt-muted" />}
                          </div>
                          <p className="font-mono text-xs text-nkt-text flex-1 truncate">{lesson.title}</p>
                          <span className="text-[9px] font-mono text-nkt-muted flex-shrink-0">{lesson.duration_minutes}min</span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => openEditLesson(lesson, ch.id)}
                              className="p-1 rounded border border-transparent text-nkt-muted hover:border-nkt-cyan hover:text-nkt-cyan transition-all">
                              <Edit2 size={11} />
                            </button>
                            <button onClick={() => handleDeleteLesson(lesson.id)}
                              className="p-1 rounded border border-transparent text-nkt-muted hover:border-nkt-red/30 hover:text-nkt-red transition-all">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}