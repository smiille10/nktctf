import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Calendar, Users, Trophy, Clock, Zap, CheckCircle, Lock } from 'lucide-react';

const TABS = ['All', 'Ongoing', 'Upcoming', 'Past'];

const STATUS_STYLES = {
  ongoing: 'text-nkt-green border-nkt-green/40 bg-nkt-green/10',
  upcoming: 'text-nkt-cyan border-nkt-cyan/40 bg-nkt-cyan/10',
  ended: 'text-nkt-muted border-nkt-border bg-transparent',
};

const STATUS_DOTS = {
  ongoing: 'bg-nkt-green animate-pulse',
  upcoming: 'bg-nkt-cyan',
  ended: 'bg-nkt-muted',
};

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('All');
  const [registering, setRegistering] = useState(null);
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/events')
      .then(r => setEvents(r.data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = events.filter(e => {
    if (tab === 'All') return true;
    if (tab === 'Ongoing') return e.status === 'ongoing';
    if (tab === 'Upcoming') return e.status === 'upcoming';
    if (tab === 'Past') return e.status === 'ended';
    return true;
  });

  const handleRegister = async (eventId) => {
    setRegistering(eventId);
    setMsg('');
    try {
      await api.post(`/events/${eventId}/register`);
      setMsg('✅ Inscription réussie !');
      api.get('/events').then(r => setEvents(r.data));
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Erreur'));
    } finally {
      setRegistering(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getDuration = (start, end) => {
    if (!start || !end) return '—';
    const diff = new Date(end) - new Date(start);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    return `${hours}h`;
  };

  return (
    <div className="min-h-screen bg-nkt-bg bg-grid pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={16} className="text-nkt-green" />
            <span className="text-[11px] font-mono text-nkt-muted tracking-widest">CTF_EVENTS</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-nkt-text">
            Events
            <span className="text-nkt-green neon-text-dim ml-3 text-lg font-mono">[{events.length}]</span>
          </h1>
          <p className="text-nkt-muted text-xs font-mono mt-1">Participe aux compétitions CTF organisées par NKTCTF</p>
        </div>

        {msg && (
          <div className={`mb-6 p-3 rounded border font-mono text-sm ${msg.startsWith('✅') ? 'bg-nkt-green/10 border-nkt-green/30 text-nkt-green' : 'bg-nkt-red/10 border-nkt-red/30 text-nkt-red'}`}>
            {msg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-nkt-border">
          {TABS.map(t => {
            const count = t === 'All' ? events.length :
              t === 'Ongoing' ? events.filter(e => e.status === 'ongoing').length :
              t === 'Upcoming' ? events.filter(e => e.status === 'upcoming').length :
              events.filter(e => e.status === 'ended').length;
            return (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-3 text-xs font-mono font-semibold tracking-wider border-b-2 transition-all ${
                  tab === t ? 'border-nkt-green text-nkt-green' : 'border-transparent text-nkt-muted hover:text-nkt-text'
                }`}>
                {t}
                <span className="ml-2 opacity-50">({count})</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-nkt-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-32">
            <Trophy size={48} className="text-nkt-muted/30 mx-auto mb-4" />
            <p className="text-nkt-muted font-mono text-sm">Aucun event dans cette catégorie</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Table header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-2">
              <span className="col-span-4 text-[10px] font-mono text-nkt-muted tracking-wider">EVENT NAME</span>
              <span className="col-span-2 text-[10px] font-mono text-nkt-muted tracking-wider">PARTICIPANTS</span>
              <span className="col-span-1 text-[10px] font-mono text-nkt-muted tracking-wider">PRICE</span>
              <span className="col-span-1 text-[10px] font-mono text-nkt-muted tracking-wider">MODE</span>
              <span className="col-span-2 text-[10px] font-mono text-nkt-muted tracking-wider">DURATION</span>
              <span className="col-span-2 text-[10px] font-mono text-nkt-muted tracking-wider">DATE</span>
            </div>

            {filtered.map(event => (
              <div key={event.id}
                className="bg-nkt-card border border-nkt-border rounded-lg px-5 py-4 hover:border-nkt-green/30 transition-all group">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">

                  {/* Name + status */}
                  <div className="col-span-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${STATUS_DOTS[event.status]}`} />
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${STATUS_STYLES[event.status]}`}>
                        {event.status === 'ongoing' ? 'LIVE' :
                         event.status === 'upcoming' ? 'UPCOMING' : 'ENDED'}
                      </span>
                      {!event.is_free && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded border text-yellow-400 border-yellow-400/30 bg-yellow-400/10">
                          PAID
                        </span>
                      )}
                    </div>
                    <h3 className="font-mono font-bold text-nkt-text group-hover:text-nkt-green transition-colors">
                      {event.title}
                    </h3>
                    {event.description && (
                      <p className="text-nkt-muted text-xs font-mono mt-1 line-clamp-1">{event.description}</p>
                    )}
                  </div>

                  {/* Participants */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <Users size={13} className="text-nkt-muted" />
                      <span className="font-mono text-sm text-nkt-text">
                        {event.participants || 0}/{event.max_participants}
                      </span>
                    </div>
                    <div className="mt-1 h-1 bg-nkt-bg rounded-full overflow-hidden w-20">
                      <div className="h-full bg-nkt-green/60 rounded-full"
                        style={{ width: `${Math.min(100, ((event.participants || 0) / event.max_participants) * 100)}%` }} />
                    </div>
                  </div>

                  {/* Price */}
                  <div className="col-span-1">
                    <span className={`font-mono text-sm font-bold ${event.is_free ? 'text-nkt-green' : 'text-yellow-400'}`}>
                      {event.is_free ? 'Free' : `$${event.price}`}
                    </span>
                  </div>

                  {/* Mode */}
                  <div className="col-span-1">
                    <div className="flex items-center gap-1">
                      {event.mode === 'team' ? <Users size={12} className="text-nkt-cyan" /> : <Zap size={12} className="text-nkt-green" />}
                      <span className="font-mono text-xs text-nkt-muted capitalize">{event.mode}</span>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-nkt-muted" />
                      <span className="font-mono text-xs text-nkt-muted">
                        {getDuration(event.start_date, event.end_date)}
                      </span>
                    </div>
                  </div>

                  {/* Date + action */}
                  <div className="col-span-2 flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1">
                        <Calendar size={11} className="text-nkt-muted" />
                        <span className="font-mono text-[10px] text-nkt-muted">
                          {formatDate(event.start_date)}
                        </span>
                      </div>
                    </div>

                    {event.status !== 'ended' && (
                      event.is_registered ? (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-nkt-green">
                          <CheckCircle size={12} /> REGISTERED
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRegister(event.id)}
                          disabled={registering === event.id}
                          className="nkt-btn nkt-btn-solid px-3 py-1.5 rounded text-[10px] flex items-center gap-1 whitespace-nowrap">
                          {registering === event.id
                            ? <span className="w-3 h-3 border border-nkt-bg border-t-transparent rounded-full animate-spin" />
                            : '+ REGISTER'
                          }
                        </button>
                      )
                    )}
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