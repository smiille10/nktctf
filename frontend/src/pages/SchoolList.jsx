import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { School, Users, MapPin, Search, ChevronRight, GraduationCap } from 'lucide-react';
import api from '../api';

const PLAN_COLORS = {
  starter:    { bg: 'bg-nkt-green/10',  border: 'border-nkt-green/30',  text: 'text-nkt-green',  label: 'STARTER'    },
  school:     { bg: 'bg-nkt-cyan/10',   border: 'border-nkt-cyan/30',   text: 'text-nkt-cyan',   label: 'SCHOOL'     },
  enterprise: { bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', text: 'text-yellow-400', label: 'ENTERPRISE' },
};

export default function SchoolList() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    api.get('/schools/public')
      .then(r => setSchools(r.data || []))
      .catch(() => setSchools([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = schools.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.city || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen bg-nkt-bg flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-nkt-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-nkt-bg bg-grid pt-20 pb-12">
      <div className="max-w-5xl mx-auto px-4">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl border border-purple-500/30 bg-purple-500/10 mb-4">
            <School size={28} className="text-purple-400" />
          </div>
          <h1 className="font-display text-3xl font-bold text-nkt-text mb-2">
            Espace <span style={{ color: '#a855f7' }}>Écoles</span>
          </h1>
          <p className="font-mono text-sm text-nkt-muted">
            Sélectionne ton école pour accéder à ton espace étudiant ou enseignant
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-md mx-auto">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-nkt-muted" />
          <input
            className="nkt-input w-full pl-11 pr-4 py-3 rounded-xl font-mono text-sm"
            placeholder="Rechercher une école..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Grid écoles */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <School size={48} className="text-nkt-muted/20 mx-auto mb-4" />
            <p className="font-mono text-sm text-nkt-muted">
              {search ? 'Aucune école trouvée' : 'Aucune école disponible'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(school => {
              const plan = PLAN_COLORS[school.plan] || PLAN_COLORS.starter;
              return (
                <button
                  key={school.id}
                  onClick={() => navigate(`/school/${school.id}`)}
                  className="bg-nkt-card border border-nkt-border rounded-xl p-5 text-left hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/5 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/0 to-transparent group-hover:via-purple-500/50 transition-all" />

                  {/* Top */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl border border-purple-500/30 bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-display text-lg font-bold text-purple-400">
                        {school.name[0].toUpperCase()}
                      </span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded border ${plan.bg} ${plan.border} ${plan.text}`}>
                      {plan.label}
                    </span>
                  </div>

                  {/* Infos */}
                  <h3 className="font-mono text-sm font-bold text-nkt-text mb-1 group-hover:text-purple-300 transition-colors">
                    {school.name}
                  </h3>

                  {school.city && (
                    <p className="font-mono text-xs text-nkt-muted flex items-center gap-1 mb-3">
                      <MapPin size={10} /> {school.city}, {school.country}
                    </p>
                  )}

                  {school.allowed_domain && (
                    <div className="flex items-center gap-1 mb-3">
                      <span className="text-[10px] font-mono text-nkt-muted border border-nkt-border px-2 py-0.5 rounded">
                        @{school.allowed_domain}
                      </span>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-nkt-border/50">
                    <div className="flex items-center gap-1.5">
                      <Users size={11} className="text-nkt-muted" />
                      <span className="font-mono text-xs text-nkt-muted">{school.student_count} étudiants</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <GraduationCap size={11} className="text-purple-400" />
                      <span className="font-mono text-xs text-nkt-muted">{school.teacher_count} profs</span>
                    </div>
                    <ChevronRight size={13} className="text-nkt-muted/30 group-hover:text-purple-400 ml-auto transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}