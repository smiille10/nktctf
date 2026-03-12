import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, ChevronRight, Search } from 'lucide-react';
import api from '../api';

const DIFF_COLORS = {
  beginner:     'text-nkt-green border-nkt-green/30 bg-nkt-green/10',
  intermediate: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  advanced:     'text-nkt-red border-nkt-red/30 bg-nkt-red/10',
};

const CATS = ['Tous', 'FORENSICS', 'CRYPTO', 'OSINT', 'WEB', 'MISC'];

export default function Learn() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [cat,     setCat]     = useState('Tous');

  useEffect(() => {
    api.get('/courses')
      .then(r => setCourses(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = courses.filter(c => {
    const matchCat    = cat === 'Tous' || c.category === cat;
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
                        c.description?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  if (loading) return (
    <div className="min-h-screen bg-nkt-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-nkt-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-nkt-bg bg-grid pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={14} className="text-nkt-green" />
            <span className="text-[11px] font-mono text-nkt-muted tracking-widest">LEARNING_CENTER</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-nkt-text">Cours & Formations</h1>
          <p className="font-mono text-sm text-nkt-muted mt-2">Apprends la cybersécurité avec des cours pratiques</p>
        </div>

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nkt-muted" />
            <input className="nkt-input w-full pl-9 pr-4 py-2.5 rounded-lg text-sm font-mono"
              placeholder="Rechercher un cours..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATS.map(c => (
              <button key={c} onClick={() => setCat(c)}
                className={`px-3 py-2 rounded-lg text-xs font-mono font-bold border transition-all ${
                  cat === c ? 'border-nkt-green bg-nkt-green/10 text-nkt-green' : 'border-nkt-border text-nkt-muted hover:text-nkt-text'
                }`}>{c}</button>
            ))}
          </div>
        </div>

        {/* Grille */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen size={48} className="text-nkt-muted/20 mx-auto mb-4" />
            <p className="font-mono text-nkt-muted">Aucun cours disponible pour l'instant</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(course => (
              <div key={course.id}
                onClick={() => navigate(`/learn/${course.id}`)}
                className="bg-nkt-card border border-nkt-border rounded-xl overflow-hidden cursor-pointer hover:border-nkt-green/40 transition-all group">

                {/* Thumbnail ou placeholder */}
                <div className="h-40 bg-gradient-to-br from-nkt-bg to-nkt-card flex items-center justify-center border-b border-nkt-border relative overflow-hidden">
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <BookOpen size={40} className="text-nkt-green/20 mx-auto mb-2" />
                      <span className="font-mono text-xs text-nkt-muted">{course.category}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-nkt-card/60 to-transparent" />
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {course.category && (
                      <span className="text-[10px] font-mono font-bold text-nkt-muted border border-nkt-border px-2 py-0.5 rounded">
                        {course.category}
                      </span>
                    )}
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${DIFF_COLORS[course.difficulty] || DIFF_COLORS.beginner}`}>
                      {course.difficulty}
                    </span>
                  </div>

                  <h3 className="font-mono text-sm font-bold text-nkt-text group-hover:text-nkt-green transition-colors leading-tight">
                    {course.title}
                  </h3>

                  {course.description && (
                    <p className="font-mono text-xs text-nkt-muted mt-2 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-3 text-[11px] font-mono text-nkt-muted">
                      <span>{course.lesson_count || 0} leçons</span>
                      {course.started && <span className="text-nkt-green">▶ En cours</span>}
                    </div>
                    <ChevronRight size={14} className="text-nkt-muted group-hover:text-nkt-green transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}