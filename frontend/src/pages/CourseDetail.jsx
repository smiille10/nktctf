import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight, ChevronDown, CheckCircle, Clock, Play, ArrowLeft, Lock } from 'lucide-react';
import api from '../api';

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course,        setCourse]        = useState(null);
  const [activeLesson,  setActiveLesson]  = useState(null);
  const [lessonContent, setLessonContent] = useState(null);
  const [openChapters,  setOpenChapters]  = useState({});
  const [loading,       setLoading]       = useState(true);
  const [completing,    setCompleting]    = useState(false);

  useEffect(() => {
    api.get(`/courses/${id}`)
      .then(r => {
        setCourse(r.data);
        if (r.data.chapters?.[0]?.lessons?.[0]) {
          setOpenChapters({ [r.data.chapters[0].id]: true });
        }
      })
      .catch(() => navigate('/learn'))
      .finally(() => setLoading(false));
  }, [id]);

  const openLesson = async (lesson) => {
    setActiveLesson(lesson);
    try {
      const r = await api.get(`/courses/${id}/lessons/${lesson.id}`);
      setLessonContent(r.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleComplete = async () => {
    if (!activeLesson || activeLesson.completed) return;
    setCompleting(true);
    try {
      await api.post(`/courses/${id}/lessons/${activeLesson.id}/complete`);
      // Update local state
      setCourse(prev => ({
        ...prev,
        chapters: prev.chapters.map(ch => ({
          ...ch,
          lessons: ch.lessons.map(l =>
            l.id === activeLesson.id ? { ...l, completed: true } : l
          )
        }))
      }));
      setActiveLesson(prev => ({ ...prev, completed: true }));
    } catch (err) {
      console.error(err);
    } finally {
      setCompleting(false);
    }
  };

  const totalLessons    = course?.chapters?.reduce((acc, ch) => acc + ch.lessons.length, 0) || 0;
  const completedLessons = course?.chapters?.reduce((acc, ch) => acc + ch.lessons.filter(l => l.completed).length, 0) || 0;
  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  if (loading) return (
    <div className="min-h-screen bg-nkt-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-nkt-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!course) return null;

  return (
    <div className="min-h-screen bg-nkt-bg bg-grid pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4">

        <button onClick={() => navigate('/learn')}
          className="flex items-center gap-2 text-nkt-muted hover:text-nkt-green transition-colors font-mono text-xs mb-6">
          <ArrowLeft size={14} /> RETOUR AUX COURS
        </button>

        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Sidebar chapitres ── */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="bg-nkt-card border border-nkt-border rounded-xl overflow-hidden sticky top-6">
              <div className="p-4 border-b border-nkt-border">
                <h2 className="font-mono text-sm font-bold text-nkt-text">{course.title}</h2>
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] font-mono text-nkt-muted mb-1">
                    <span>Progression</span>
                    <span className="text-nkt-green">{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-nkt-bg rounded-full overflow-hidden">
                    <div className="h-full bg-nkt-green rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-[10px] font-mono text-nkt-muted mt-1">{completedLessons}/{totalLessons} leçons</p>
                </div>
              </div>

              <div className="overflow-y-auto max-h-[60vh]">
                {course.chapters?.map((ch, ci) => (
                  <div key={ch.id}>
                    <button
                      onClick={() => setOpenChapters(prev => ({ ...prev, [ch.id]: !prev[ch.id] }))}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-all border-b border-nkt-border/40">
                      <div className="flex items-center gap-2 text-left">
                        <span className="text-[10px] font-mono text-nkt-muted">CH{ci + 1}</span>
                        <span className="font-mono text-xs font-bold text-nkt-text">{ch.title}</span>
                      </div>
                      {openChapters[ch.id] ? <ChevronDown size={13} className="text-nkt-muted flex-shrink-0" /> : <ChevronRight size={13} className="text-nkt-muted flex-shrink-0" />}
                    </button>

                    {openChapters[ch.id] && ch.lessons?.map((lesson, li) => (
                      <button key={lesson.id}
                        onClick={() => openLesson(lesson)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.02] transition-all border-b border-nkt-border/20 ${
                          activeLesson?.id === lesson.id ? 'bg-nkt-green/5 border-l-2 border-l-nkt-green' : ''
                        }`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border ${
                          lesson.completed ? 'border-nkt-green bg-nkt-green/20' : 'border-nkt-border'
                        }`}>
                          {lesson.completed
                            ? <CheckCircle size={11} className="text-nkt-green" />
                            : <span className="text-[9px] font-mono text-nkt-muted">{li + 1}</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-mono text-xs truncate ${activeLesson?.id === lesson.id ? 'text-nkt-green font-bold' : 'text-nkt-text'}`}>
                            {lesson.title}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock size={9} className="text-nkt-muted" />
                            <span className="text-[9px] font-mono text-nkt-muted">{lesson.duration_minutes || 5} min</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Contenu leçon ── */}
          <div className="flex-1">
            {!activeLesson ? (
              <div className="bg-nkt-card border border-nkt-border rounded-xl p-8 text-center">
                <BookOpen size={48} className="text-nkt-muted/20 mx-auto mb-4" />
                <h3 className="font-display text-xl font-bold text-nkt-text mb-2">{course.title}</h3>
                {course.description && <p className="font-mono text-sm text-nkt-muted mb-6">{course.description}</p>}
                {course.chapters?.[0]?.lessons?.[0] && (
                  <button onClick={() => openLesson(course.chapters[0].lessons[0])}
                    className="nkt-btn nkt-btn-solid px-8 py-3 rounded-lg font-mono text-sm font-bold flex items-center gap-2 mx-auto">
                    <Play size={16} /> COMMENCER LE COURS
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-nkt-card border border-nkt-border rounded-xl overflow-hidden">
                <div className="p-5 border-b border-nkt-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-mono text-nkt-muted">{lessonContent?.type?.toUpperCase() || 'TEXT'}</span>
                    <span className="text-[10px] font-mono text-nkt-muted">·</span>
                    <Clock size={11} className="text-nkt-muted" />
                    <span className="text-[10px] font-mono text-nkt-muted">{activeLesson.duration_minutes || 5} min</span>
                    {activeLesson.completed && (
                      <span className="ml-auto flex items-center gap-1 text-[10px] font-mono text-nkt-green border border-nkt-green/30 bg-nkt-green/10 px-2 py-0.5 rounded">
                        <CheckCircle size={10} /> COMPLÉTÉ
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-xl font-bold text-nkt-text">{activeLesson.title}</h2>
                </div>

                <div className="p-6">
                  {/* Vidéo */}
                  {lessonContent?.video_url && (
                    <div className="mb-6 rounded-lg overflow-hidden border border-nkt-border">
                      <iframe src={lessonContent.video_url} className="w-full aspect-video" allowFullScreen
                        title={activeLesson.title} />
                    </div>
                  )}

                  {/* Contenu texte */}
                  {lessonContent?.content && (
                    <div className="prose prose-invert max-w-none font-mono text-sm text-nkt-text leading-relaxed whitespace-pre-wrap">
                      {lessonContent.content}
                    </div>
                  )}

                  {/* Bouton compléter */}
                  {!activeLesson.completed && (
                    <button onClick={handleComplete} disabled={completing}
                      className="mt-8 nkt-btn nkt-btn-solid px-8 py-3 rounded-lg font-mono text-sm font-bold flex items-center gap-2">
                      {completing
                        ? <span className="w-4 h-4 border-2 border-nkt-bg border-t-transparent rounded-full animate-spin" />
                        : <><CheckCircle size={16} /> MARQUER COMME COMPLÉTÉ</>
                      }
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}