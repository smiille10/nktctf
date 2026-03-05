import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { teamAPI, adminAPI } from '../api';
import {
  Users, Plus, LogIn, Copy, Check,
  Crown, MessageSquare, Target,
  Trophy, Zap, UserMinus, LogOut,
  Send, RefreshCw, Shield, Eye,
  Trash2, ChevronRight, X
} from 'lucide-react';

const DIFF_STYLES = {
  Easy:   'text-nkt-green border-nkt-green/30 bg-nkt-green/10',
  Medium: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  Hard:   'text-nkt-red border-nkt-red/30 bg-nkt-red/10',
};

function formatTime(d) {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60)    return "à l'instant";
  if (diff < 3600)  return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

// ══════════════════════════════════════════════
//  VUE ADMIN — toutes les teams
// ══════════════════════════════════════════════
function AdminTeamsView() {
  const [teams,          setTeams]          = useState([]);
  const [selectedTeam,   setSelectedTeam]   = useState(null);
  const [teamMembers,    setTeamMembers]     = useState([]);
  const [teamMessages,   setTeamMessages]   = useState([]);
  const [teamSolves,     setTeamSolves]     = useState([]);
  const [detailView,     setDetailView]     = useState('members'); // members | chat | solves
  const [loading,        setLoading]        = useState(true);
  const [loadingDetail,  setLoadingDetail]  = useState(false);
  const [polling,        setPolling]        = useState(false);
  const pollRef = useRef(null);
  const chatRef = useRef(null);

  const loadTeams = async () => {
    try {
      const r = await adminAPI.getTeams();
      setTeams(r.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadTeams(); }, []);

  const openTeam = async (team) => {
    setSelectedTeam(team);
    setDetailView('members');
    setLoadingDetail(true);
    clearInterval(pollRef.current);
    try {
      const [mRes, msgRes] = await Promise.all([
        adminAPI.getTeamMembers(team.id),
        adminAPI.getTeamMessages(team.id),
      ]);
      setTeamMembers(mRes.data);
      setTeamMessages(msgRes.data);
      // solves via members
      setTeamSolves([]);
    } catch {}
    finally { setLoadingDetail(false); }
  };

  // polling chat toutes les 3s quand tab chat ouvert
  const loadMessages = async (teamId) => {
    try {
      const r = await adminAPI.getTeamMessages(teamId);
      setTeamMessages(r.data);
    } catch {}
  };

  useEffect(() => {
    if (selectedTeam && detailView === 'chat') {
      pollRef.current = setInterval(() => loadMessages(selectedTeam.id), 3000);
    } else {
      clearInterval(pollRef.current);
    }
    return () => clearInterval(pollRef.current);
  }, [selectedTeam, detailView]);

  useEffect(() => {
    if (detailView === 'chat') {
      setTimeout(() => {
        chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
      }, 50);
    }
  }, [teamMessages, detailView]);

  const handleDeleteTeam = async (id) => {
    if (!confirm('Supprimer cette team définitivement ?')) return;
    await adminAPI.deleteTeam(id);
    setSelectedTeam(null);
    loadTeams();
  };

  if (loading) return (
    <div className="min-h-screen bg-nkt-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-nkt-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-nkt-bg bg-grid pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={14} className="text-nkt-green" />
            <span className="text-[11px] font-mono text-nkt-muted tracking-widest">ADMIN_VIEW</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-nkt-green/40 bg-nkt-green/10 text-nkt-green ml-2">
              SUPERADMIN
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold text-nkt-text">Surveillance des Teams</h1>
          <p className="text-nkt-muted font-mono text-xs mt-1">
            Vue complète de toutes les teams — membres, chats, solves en temps réel
          </p>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'TEAMS ACTIVES',   value: teams.length,                                         color: '#00ff88' },
            { label: 'TOTAL MEMBRES',   value: teams.reduce((a, t) => a + parseInt(t.member_count || 0), 0), color: '#00d4ff' },
            { label: 'TEAMS COMPLÈTES', value: teams.filter(t => parseInt(t.member_count) >= 4).length, color: '#ffd700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-nkt-card border border-nkt-border rounded-xl p-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
              <p className="text-[10px] font-mono text-nkt-muted tracking-widest mb-1">{label}</p>
              <p className="font-display text-3xl font-bold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* ── Liste des teams ── */}
          <div className="lg:col-span-2 bg-nkt-card border border-nkt-border rounded-xl overflow-hidden">
            <div className="border-b border-nkt-border px-5 py-3 flex items-center justify-between bg-nkt-bg/30">
              <div className="flex items-center gap-2">
                <Users size={13} className="text-nkt-green" />
                <span className="font-mono text-xs text-nkt-muted tracking-widest">TOUTES LES TEAMS</span>
              </div>
              <button onClick={loadTeams}
                className="text-nkt-muted hover:text-nkt-green transition-colors" title="Rafraîchir">
                <RefreshCw size={13} />
              </button>
            </div>

            {teams.length === 0 ? (
              <div className="text-center py-16">
                <Users size={36} className="text-nkt-muted/20 mx-auto mb-3" />
                <p className="text-nkt-muted font-mono text-sm">Aucune team créée</p>
              </div>
            ) : (
              <div className="divide-y divide-nkt-border/40 max-h-[70vh] overflow-y-auto">
                {teams.map(team => (
                  <div key={team.id}
                    onClick={() => openTeam(team)}
                    className={`px-5 py-4 flex items-center gap-3 cursor-pointer transition-all hover:bg-white/[0.03] ${
                      selectedTeam?.id === team.id
                        ? 'bg-nkt-green/5 border-l-4 border-l-nkt-green'
                        : 'border-l-4 border-l-transparent'
                    }`}>

                    {/* Avatar team */}
                    <div className="w-10 h-10 rounded-xl border border-nkt-green/30 bg-nkt-green/10 flex items-center justify-center flex-shrink-0"
                      style={{ boxShadow: selectedTeam?.id === team.id ? '0 0 10px rgba(0,255,136,0.2)' : 'none' }}>
                      <span className="font-display font-bold text-nkt-green">
                        {team.name[0].toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-bold text-nkt-text truncate">{team.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Crown size={10} className="text-yellow-400 flex-shrink-0" />
                        <span className="text-[10px] font-mono text-nkt-muted truncate">{team.captain_name}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {/* Membres */}
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className={`w-3 h-3 rounded-sm ${
                            i < parseInt(team.member_count || 0)
                              ? 'bg-nkt-green'
                              : 'bg-nkt-border'
                          }`} />
                        ))}
                      </div>
                      <span className="text-[9px] font-mono text-nkt-muted">
                        {team.member_count}/4
                      </span>
                    </div>

                    <ChevronRight size={14} className={`flex-shrink-0 transition-colors ${
                      selectedTeam?.id === team.id ? 'text-nkt-green' : 'text-nkt-muted/30'
                    }`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Détail team ── */}
          <div className="lg:col-span-3">
            {!selectedTeam ? (
              <div className="bg-nkt-card border border-nkt-border rounded-xl h-full flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <Eye size={40} className="text-nkt-muted/20 mx-auto mb-3" />
                  <p className="text-nkt-muted font-mono text-sm">Clique sur une team pour voir les détails</p>
                </div>
              </div>
            ) : (
              <div className="bg-nkt-card border border-nkt-border rounded-xl overflow-hidden flex flex-col"
                style={{ minHeight: '500px' }}>

                {/* Header détail */}
                <div className="border-b border-nkt-border px-5 py-4 bg-nkt-bg/30 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-nkt-green to-transparent" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl border-2 border-nkt-green bg-nkt-green/10 flex items-center justify-center"
                        style={{ boxShadow: '0 0 12px rgba(0,255,136,0.2)' }}>
                        <span className="font-display text-lg font-bold text-nkt-green">
                          {selectedTeam.name[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h2 className="font-display font-bold text-nkt-text">{selectedTeam.name}</h2>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] font-mono text-nkt-muted flex items-center gap-1">
                            <Crown size={10} className="text-yellow-400" /> {selectedTeam.captain_name}
                          </span>
                          <span className="text-[10px] font-mono text-nkt-cyan tracking-widest font-bold">
                            {selectedTeam.invite_code}
                          </span>
                          <span className="text-[10px] font-mono text-nkt-muted">
                            {selectedTeam.member_count}/4 membres
                          </span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteTeam(selectedTeam.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-nkt-red/30 text-nkt-red bg-nkt-red/5 hover:bg-nkt-red/10 transition-all text-xs font-mono">
                      <Trash2 size={12} /> SUPPRIMER
                    </button>
                  </div>
                </div>

                {/* Sub-tabs */}
                <div className="flex border-b border-nkt-border">
                  {[
                    { id: 'members', label: 'MEMBRES',  icon: Users,          count: teamMembers.length },
                    { id: 'chat',    label: 'CHAT LIVE', icon: MessageSquare,  count: teamMessages.length },
                    { id: 'solves',  label: 'SOLVES',   icon: Trophy,         count: null },
                  ].map(({ id, label, icon: Icon, count }) => (
                    <button key={id} onClick={() => setDetailView(id)}
                      className={`flex items-center gap-2 px-5 py-3 text-xs font-mono font-semibold border-b-2 transition-all ${
                        detailView === id
                          ? 'border-nkt-green text-nkt-green'
                          : 'border-transparent text-nkt-muted hover:text-nkt-text'
                      }`}>
                      <Icon size={13} />
                      {label}
                      {count !== null && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          detailView === id
                            ? 'bg-nkt-green/20 text-nkt-green'
                            : 'bg-nkt-border/40 text-nkt-muted'
                        }`}>
                          {count}
                        </span>
                      )}
                      {id === 'chat' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-nkt-green animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Contenu détail */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  {loadingDetail ? (
                    <div className="flex items-center justify-center h-48">
                      <div className="w-6 h-6 border-2 border-nkt-green border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (

                    /* ────── MEMBRES ────── */
                    detailView === 'members' ? (
                      <div className="overflow-y-auto">
                        {teamMembers.length === 0 ? (
                          <div className="text-center py-12">
                            <Users size={32} className="text-nkt-muted/20 mx-auto mb-2" />
                            <p className="text-nkt-muted font-mono text-sm">Aucun membre</p>
                          </div>
                        ) : teamMembers.map((m, i) => (
                          <div key={m.id} className="px-5 py-4 flex items-center gap-3 border-b border-nkt-border/40 hover:bg-white/[0.02]">
                            <span className="text-[11px] font-mono text-nkt-muted w-5 flex-shrink-0">#{i + 1}</span>
                            <div className="w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0"
                              style={{
                                borderColor: m.is_captain ? '#ffd700' : '#1a2535',
                                background:  m.is_captain ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.03)',
                              }}>
                              <span className="font-bold" style={{ color: m.is_captain ? '#ffd700' : '#8899aa' }}>
                                {m.username[0].toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm text-nkt-text font-semibold">{m.username}</span>
                                {m.is_captain && (
                                  <span className="flex items-center gap-1 text-[9px] font-mono text-yellow-400 border border-yellow-400/30 bg-yellow-400/10 px-1.5 py-0.5 rounded">
                                    <Crown size={8} /> CAPTAIN
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] font-mono text-nkt-muted">{m.email}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-display font-bold text-sm text-nkt-green">{m.score || 0}</p>
                              <p className="text-[9px] font-mono text-nkt-muted">pts</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-[9px] font-mono text-nkt-muted">
                                {new Date(m.joined_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                              </p>
                              <p className="text-[9px] font-mono text-nkt-muted/50">rejoint</p>
                            </div>
                          </div>
                        ))}

                        {/* Slots vides */}
                        {Array.from({ length: 4 - teamMembers.length }).map((_, i) => (
                          <div key={`empty-${i}`} className="px-5 py-4 flex items-center gap-3 border-b border-nkt-border/40 opacity-20">
                            <span className="text-[11px] font-mono text-nkt-muted w-5">#{teamMembers.length + i + 1}</span>
                            <div className="w-10 h-10 rounded-xl border border-dashed border-nkt-border flex items-center justify-center">
                              <Plus size={14} className="text-nkt-muted" />
                            </div>
                            <span className="font-mono text-xs text-nkt-muted italic">Slot libre</span>
                          </div>
                        ))}
                      </div>
                    ) :

                    /* ────── CHAT ────── */
                    detailView === 'chat' ? (
                      <div className="flex flex-col flex-1 overflow-hidden" style={{ height: '400px' }}>

                        {/* Badge admin */}
                        <div className="px-5 py-2 bg-nkt-red/5 border-b border-nkt-red/20 flex items-center gap-2">
                          <Shield size={11} className="text-nkt-red" />
                          <span className="text-[10px] font-mono text-nkt-red">
                            MODE SURVEILLANCE — les membres ne savent pas que tu lis ce chat
                          </span>
                          <div className="ml-auto flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-nkt-green animate-pulse" />
                            <span className="text-[9px] font-mono text-nkt-green">LIVE</span>
                          </div>
                        </div>

                        {/* Messages */}
                        <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                          {teamMessages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                              <MessageSquare size={36} className="text-nkt-muted/20 mb-3" />
                              <p className="text-nkt-muted font-mono text-sm">Aucun message dans ce chat</p>
                              <p className="text-nkt-muted/50 font-mono text-xs mt-1">Le chat se rafraîchit automatiquement</p>
                            </div>
                          ) : teamMessages.map((msg, i) => {
                            const showName = i === 0 || teamMessages[i - 1].username !== msg.username;
                            return (
                              <div key={msg.id} className="flex items-start gap-3">
                                {showName ? (
                                  <div className="w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5"
                                    style={{
                                      borderColor: msg.is_captain ? '#ffd700' : '#1a2535',
                                      background:  msg.is_captain ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.03)',
                                    }}>
                                    <span className="font-bold text-xs"
                                      style={{ color: msg.is_captain ? '#ffd700' : '#8899aa' }}>
                                      {msg.username[0].toUpperCase()}
                                    </span>
                                  </div>
                                ) : <div className="w-8 flex-shrink-0" />}

                                <div className="flex-1 min-w-0">
                                  {showName && (
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`text-[11px] font-mono font-bold ${msg.is_captain ? 'text-yellow-400' : 'text-nkt-cyan'}`}>
                                        {msg.username}
                                      </span>
                                      {msg.is_captain && <Crown size={10} className="text-yellow-400" />}
                                      <span className="text-[9px] font-mono text-nkt-muted/50">
                                        {new Date(msg.created_at).toLocaleString('fr-FR', {
                                          day: '2-digit', month: 'short',
                                          hour: '2-digit', minute: '2-digit',
                                        })}
                                      </span>
                                    </div>
                                  )}
                                  <div className="bg-nkt-bg border border-nkt-border rounded-xl rounded-tl-sm px-3.5 py-2.5 font-mono text-sm text-nkt-text inline-block max-w-full break-words">
                                    {msg.message}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Footer chat */}
                        <div className="border-t border-nkt-border px-5 py-3 bg-nkt-bg/30">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-mono text-nkt-muted">
                              {teamMessages.length} message{teamMessages.length !== 1 ? 's' : ''} · rafraîchissement auto toutes les 3s
                            </p>
                            <button
                              onClick={() => loadMessages(selectedTeam.id)}
                              className="flex items-center gap-1.5 text-[10px] font-mono text-nkt-muted hover:text-nkt-green transition-colors">
                              <RefreshCw size={11} /> Rafraîchir
                            </button>
                          </div>
                        </div>
                      </div>
                    ) :

                    /* ────── SOLVES ────── */
                    detailView === 'solves' && (
                      <div className="overflow-y-auto">
                        <AdminTeamSolves teamId={selectedTeam.id} members={teamMembers} />
                      </div>
                    )
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

// Composant solves admin (charge dynamiquement)
function AdminTeamSolves({ teamId, members }) {
  const [solves,  setSolves]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // On reconstruit les solves depuis les membres via l'API mine
        // On utilise la route admin existante
        const r = await adminAPI.getTeamMembers(teamId);
        // Les solves sont dans la vue mine — on peut les fetcher via admin
        setSolves([]);
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, [teamId]);

  // On va utiliser une route dédiée — pour l'instant affiche les membres et leurs scores
  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <div className="w-5 h-5 border-2 border-nkt-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      {/* Classement membres */}
      <div className="px-5 py-3 border-b border-nkt-border bg-nkt-bg/30">
        <p className="text-[10px] font-mono text-nkt-muted tracking-widest">CLASSEMENT MEMBRES</p>
      </div>
      {members.sort((a, b) => (b.score || 0) - (a.score || 0)).map((m, i) => (
        <div key={m.id} className="px-5 py-3.5 flex items-center gap-3 border-b border-nkt-border/40">
          <span className={`text-sm font-display font-bold w-6 flex-shrink-0 ${
            i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-nkt-muted'
          }`}>#{i + 1}</span>
          <div className="w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0"
            style={{
              borderColor: m.is_captain ? '#ffd700' : '#1a2535',
              background:  m.is_captain ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.03)',
            }}>
            <span className="font-bold text-sm" style={{ color: m.is_captain ? '#ffd700' : '#8899aa' }}>
              {m.username[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-nkt-text font-semibold">{m.username}</span>
              {m.is_captain && <Crown size={11} className="text-yellow-400" />}
            </div>
            <div className="mt-1 h-1.5 bg-nkt-bg rounded-full overflow-hidden w-32">
              <div className="h-full bg-nkt-green rounded-full transition-all"
                style={{
                  width: `${Math.min(100, ((m.score || 0) / Math.max(...members.map(x => x.score || 1))) * 100)}%`
                }} />
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-display font-bold text-lg text-nkt-green">{m.score || 0}</p>
            <p className="text-[9px] font-mono text-nkt-muted">points</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════
//  PAGE : pas de team
// ══════════════════════════════════════════════
function NoTeamPage({ onCreated }) {
  const [formView,   setFormView]   = useState(null);
  const [teamName,   setTeamName]   = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [msg,        setMsg]        = useState('');
  const [loading,    setLoading]    = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setLoading(true); setMsg('');
    try {
      await teamAPI.create(teamName.trim());
      setMsg('✅ Team créée !');
      setTimeout(onCreated, 800);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Erreur'));
    } finally { setLoading(false); }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setLoading(true); setMsg('');
    try {
      await teamAPI.join(inviteCode.trim());
      setMsg('✅ Team rejointe !');
      setTimeout(onCreated, 800);
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Erreur'));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-nkt-bg bg-grid pt-20 pb-12">
      <div className="max-w-xl mx-auto px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl border-2 border-nkt-green/30 bg-nkt-green/10 mb-4"
            style={{ boxShadow: '0 0 30px rgba(0,255,136,0.1)' }}>
            <Users size={36} className="text-nkt-green" />
          </div>
          <h1 className="font-display text-3xl font-bold text-nkt-text mb-2">Teams</h1>
          <p className="text-nkt-muted font-mono text-sm">Crée ou rejoins une team pour jouer ensemble</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: Crown,         label: 'Captain',    desc: 'Gère ta team'           },
            { icon: MessageSquare, label: 'Chat Live',  desc: 'Discute en temps réel'  },
            { icon: Trophy,        label: 'Dashboard',  desc: 'Suivi des solves'       },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-nkt-card border border-nkt-border rounded-xl p-4 text-center">
              <Icon size={22} className="text-nkt-green mx-auto mb-2" />
              <p className="font-mono text-xs font-bold text-nkt-text">{label}</p>
              <p className="font-mono text-[10px] text-nkt-muted mt-0.5">{desc}</p>
            </div>
          ))}
        </div>

        {msg && (
          <div className={`mb-5 p-3 rounded border font-mono text-sm text-center ${
            msg.startsWith('✅') ? 'bg-nkt-green/10 border-nkt-green/30 text-nkt-green' : 'bg-nkt-red/10 border-nkt-red/30 text-nkt-red'
          }`}>{msg}</div>
        )}

        {!formView && (
          <div className="flex gap-4">
            <button onClick={() => setFormView('create')}
              className="flex-1 nkt-btn nkt-btn-solid py-4 rounded-xl flex items-center justify-center gap-3 text-sm font-mono font-bold">
              <Plus size={18} /> CRÉER UNE TEAM
            </button>
            <button onClick={() => setFormView('join')}
              className="flex-1 nkt-btn py-4 rounded-xl flex items-center justify-center gap-3 text-sm font-mono font-bold"
              style={{ borderColor: '#00d4ff', color: '#00d4ff' }}>
              <LogIn size={18} /> REJOINDRE
            </button>
          </div>
        )}

        {formView === 'create' && (
          <div className="bg-nkt-card border-2 border-nkt-green/40 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Plus size={16} className="text-nkt-green" />
              <h2 className="font-mono text-sm font-bold text-nkt-green tracking-wider">CRÉER UNE TEAM</h2>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">NOM *</label>
                <input className="nkt-input w-full px-4 py-3 rounded-lg text-sm font-mono"
                  placeholder="CyberWolves, HackMasters..."
                  value={teamName} onChange={e => setTeamName(e.target.value)}
                  minLength={3} maxLength={30} required autoFocus />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={loading}
                  className="flex-1 nkt-btn nkt-btn-solid py-3 rounded-lg text-sm flex items-center justify-center gap-2">
                  {loading ? <span className="w-4 h-4 border-2 border-nkt-bg border-t-transparent rounded-full animate-spin" />
                    : <><Plus size={14} /> CRÉER</>}
                </button>
                <button type="button" onClick={() => setFormView(null)} className="nkt-btn px-5 py-3 rounded-lg text-sm">
                  ANNULER
                </button>
              </div>
            </form>
          </div>
        )}

        {formView === 'join' && (
          <div className="bg-nkt-card border-2 rounded-xl p-6" style={{ borderColor: '#00d4ff40' }}>
            <div className="flex items-center gap-2 mb-5">
              <LogIn size={16} style={{ color: '#00d4ff' }} />
              <h2 className="font-mono text-sm font-bold tracking-wider" style={{ color: '#00d4ff' }}>
                REJOINDRE UNE TEAM
              </h2>
            </div>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">CODE D'INVITATION *</label>
                <input className="nkt-input w-full px-4 py-3 rounded-lg text-sm font-mono tracking-widest uppercase"
                  placeholder="EX: A1B2C3"
                  value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={10} required autoFocus />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={loading}
                  className="flex-1 py-3 rounded-lg text-sm font-mono font-bold flex items-center justify-center gap-2"
                  style={{ background: '#00d4ff', color: '#080d14' }}>
                  {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : <><LogIn size={14} /> REJOINDRE</>}
                </button>
                <button type="button" onClick={() => setFormView(null)} className="nkt-btn px-5 py-3 rounded-lg text-sm">
                  ANNULER
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  PAGE : dashboard team (membres normaux)
// ══════════════════════════════════════════════
function TeamDashboard({ team, currentUser, onLeave, onReload }) {
  const navigate   = useNavigate();
  const [view,     setView]     = useState('dashboard');
  const [messages, setMessages] = useState([]);
  const [newMsg,   setNewMsg]   = useState('');
  const [sending,  setSending]  = useState(false);
  const [copied,   setCopied]   = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const chatRef = useRef(null);
  const pollRef = useRef(null);
  const isCapt  = team.captain_id === currentUser?.id;

  const loadMessages = async () => {
    try {
      const r = await teamAPI.getMessages(team.id);
      setMessages(r.data);
    } catch {}
  };

  useEffect(() => {
    if (view === 'chat') {
      loadMessages();
      pollRef.current = setInterval(loadMessages, 3000);
    }
    return () => clearInterval(pollRef.current);
  }, [view, team.id]);

  useEffect(() => {
    if (view === 'chat') {
      setTimeout(() => {
        chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
      }, 50);
    }
  }, [messages, view]);

  const handleSendMsg = async (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setSending(true);
    try {
      await teamAPI.sendMessage(team.id, newMsg.trim());
      setNewMsg('');
      await loadMessages();
    } catch {} finally { setSending(false); }
  };

  const handleKick = async (memberId, memberName) => {
    if (!confirm(`Kicker ${memberName} ?`)) return;
    try {
      await teamAPI.kick(team.id, memberId);
      setActionMsg('✅ Membre kické');
      onReload();
    } catch (err) {
      setActionMsg('❌ ' + (err.response?.data?.error || 'Erreur'));
    }
  };

  const handleLeave = async () => {
    if (!confirm(isCapt ? 'Tu es le captain ! Quitter va DISSOUDRE la team. Confirmer ?' : 'Quitter la team ?')) return;
    try {
      await teamAPI.leave();
      onLeave();
    } catch (err) {
      setActionMsg('❌ ' + (err.response?.data?.error || 'Erreur'));
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(team.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const teamScore = team.total_score || 0;

  const TABS = [
    { id: 'dashboard', label: 'DASHBOARD', icon: Target        },
    { id: 'chat',      label: 'CHAT',      icon: MessageSquare },
    { id: 'solves',    label: 'SOLVES',    icon: Trophy        },
  ];

  return (
    <div className="min-h-screen bg-nkt-bg bg-grid pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4">

        {/* Header */}
        <div className="bg-nkt-card border border-nkt-border rounded-xl p-5 mb-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-nkt-green to-transparent" />
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl border-2 border-nkt-green bg-nkt-green/10 flex items-center justify-center"
                style={{ boxShadow: '0 0 15px rgba(0,255,136,0.2)' }}>
                <span className="font-display text-2xl font-bold text-nkt-green">{team.name[0].toUpperCase()}</span>
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-nkt-text">{team.name}</h1>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-[10px] font-mono text-nkt-muted flex items-center gap-1">
                    <Crown size={10} className="text-yellow-400" /> Captain : {team.captain_name}
                  </span>
                  <span className="text-[10px] font-mono text-nkt-muted flex items-center gap-1">
                    <Users size={10} /> {team.members?.length || 0}/4 membres
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-right bg-nkt-bg border border-nkt-border rounded-lg px-4 py-2">
                <p className="font-display text-xl font-bold text-nkt-green">{teamScore}</p>
                <p className="text-[9px] font-mono text-nkt-muted">SCORE TOTAL</p>
              </div>
              {isCapt && (
                <button onClick={copyCode}
                  className="flex items-center gap-2 bg-nkt-bg border border-nkt-border rounded-lg px-3 py-2 hover:border-nkt-green/40 transition-all">
                  <div>
                    <p className="text-[9px] font-mono text-nkt-muted">CODE INVITE</p>
                    <p className="font-mono text-sm font-bold text-nkt-green tracking-widest">{team.invite_code}</p>
                  </div>
                  {copied ? <Check size={14} className="text-nkt-green" /> : <Copy size={14} className="text-nkt-muted" />}
                </button>
              )}
              <button onClick={handleLeave}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-transparent text-nkt-muted hover:border-nkt-red/30 hover:text-nkt-red hover:bg-nkt-red/5 transition-all text-xs font-mono">
                <LogOut size={14} /> {isCapt ? 'DISSOUDRE' : 'QUITTER'}
              </button>
            </div>
          </div>
        </div>

        {actionMsg && (
          <div className={`mb-4 p-3 rounded border font-mono text-sm ${
            actionMsg.startsWith('✅') ? 'bg-nkt-green/10 border-nkt-green/30 text-nkt-green' : 'bg-nkt-red/10 border-nkt-red/30 text-nkt-red'
          }`}>{actionMsg}</div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-nkt-border">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setView(id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-mono font-semibold tracking-wider border-b-2 transition-all ${
                view === id ? 'border-nkt-green text-nkt-green' : 'border-transparent text-nkt-muted hover:text-nkt-text'
              }`}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* DASHBOARD */}
        {view === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-nkt-card border border-nkt-border rounded-xl overflow-hidden">
              <div className="border-b border-nkt-border px-5 py-3 flex items-center gap-2 bg-nkt-bg/30">
                <Users size={13} className="text-nkt-green" />
                <span className="font-mono text-xs text-nkt-muted tracking-widest">MEMBRES</span>
                <span className="ml-auto font-mono text-xs text-nkt-muted">{team.members?.length}/4</span>
              </div>
              <div className="divide-y divide-nkt-border/40">
                {team.members?.map((m, i) => (
                  <div key={m.id} className="px-5 py-3.5 flex items-center gap-3">
                    <span className="text-[11px] font-mono text-nkt-muted w-5 flex-shrink-0">#{i + 1}</span>
                    <div className="w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0"
                      style={{
                        borderColor: m.is_captain ? '#ffd700' : '#1a2535',
                        background:  m.is_captain ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.03)',
                      }}>
                      <span className="font-bold text-sm" style={{ color: m.is_captain ? '#ffd700' : '#8899aa' }}>
                        {m.username[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-nkt-text font-semibold truncate">{m.username}</span>
                        {m.is_captain && <Crown size={11} className="text-yellow-400 flex-shrink-0" />}
                        {m.id === currentUser?.id && (
                          <span className="text-[9px] font-mono text-nkt-green border border-nkt-green/30 bg-nkt-green/10 px-1.5 py-0.5 rounded flex-shrink-0">TOI</span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-nkt-muted">
                        {team.solves?.filter(s => s.username === m.username).length || 0} solves
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-display font-bold text-sm text-nkt-green">{m.score || 0}</p>
                      <p className="text-[9px] font-mono text-nkt-muted">pts</p>
                    </div>
                    {isCapt && m.id !== currentUser?.id && (
                      <button onClick={() => handleKick(m.id, m.username)}
                        className="ml-1 p-1.5 rounded border border-transparent text-nkt-muted hover:border-nkt-red/30 hover:text-nkt-red hover:bg-nkt-red/5 transition-all flex-shrink-0">
                        <UserMinus size={13} />
                      </button>
                    )}
                  </div>
                ))}
                {Array.from({ length: 4 - (team.members?.length || 0) }).map((_, i) => (
                  <div key={`empty-${i}`} className="px-5 py-3.5 flex items-center gap-3 opacity-25">
                    <span className="text-[11px] font-mono text-nkt-muted w-5">#{(team.members?.length || 0) + i + 1}</span>
                    <div className="w-9 h-9 rounded-lg border border-dashed border-nkt-border flex items-center justify-center">
                      <Plus size={12} className="text-nkt-muted" />
                    </div>
                    <div className="flex-1">
                      <span className="font-mono text-xs text-nkt-muted italic">Slot libre</span>
                      {isCapt && i === 0 && (
                        <p className="text-[10px] font-mono text-nkt-green mt-0.5">
                          Code : <strong className="tracking-widest">{team.invite_code}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-nkt-card border border-nkt-border rounded-xl p-5">
                <p className="text-[11px] font-mono text-nkt-muted tracking-widest mb-4">STATISTIQUES</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'SCORE',   value: teamScore,                 color: '#00ff88', icon: Trophy },
                    { label: 'SOLVES',  value: team.solves?.length || 0,  color: '#00d4ff', icon: Target },
                    { label: 'MEMBRES', value: team.members?.length || 0, color: '#ffd700', icon: Users  },
                  ].map(({ label, value, color, icon: Icon }) => (
                    <div key={label} className="bg-nkt-bg border border-nkt-border rounded-lg p-3 text-center">
                      <Icon size={16} style={{ color, opacity: 0.7 }} className="mx-auto mb-1" />
                      <p className="font-display font-bold text-lg" style={{ color }}>{value}</p>
                      <p className="text-[9px] font-mono text-nkt-muted">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-nkt-card border border-nkt-border rounded-xl overflow-hidden">
                <div className="border-b border-nkt-border px-5 py-3 flex items-center gap-2 bg-nkt-bg/30">
                  <Zap size={13} className="text-nkt-green" />
                  <span className="font-mono text-xs text-nkt-muted tracking-widest">DERNIERS SOLVES</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {!team.solves?.length ? (
                    <div className="text-center py-8">
                      <Target size={28} className="text-nkt-muted/20 mx-auto mb-2" />
                      <p className="text-nkt-muted font-mono text-xs">Aucun solve encore</p>
                    </div>
                  ) : team.solves.slice(0, 8).map((s, i) => (
                    <div key={i} className="px-5 py-2.5 border-b border-nkt-border/30 hover:bg-white/[0.02]">
                      <p className="font-mono text-xs text-nkt-text">
                        <span className="text-nkt-green font-bold">{s.username}</span>
                        <span className="text-nkt-muted"> → </span>
                        <span className="text-nkt-cyan">{s.title}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${DIFF_STYLES[s.difficulty] || DIFF_STYLES.Easy}`}>
                          {s.difficulty}
                        </span>
                        <span className="text-[9px] font-mono text-nkt-green font-bold">+{s.points} pts</span>
                        <span className="text-[9px] font-mono text-nkt-muted">{formatTime(s.solved_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CHAT */}
        {view === 'chat' && (
          <div className="bg-nkt-card border border-nkt-border rounded-xl overflow-hidden flex flex-col" style={{ height: '70vh' }}>
            <div className="border-b border-nkt-border px-5 py-3 flex items-center justify-between bg-nkt-bg/30">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-nkt-green" />
                <span className="font-mono text-xs text-nkt-muted tracking-widest">TEAM CHAT — {team.name}</span>
                <div className="w-2 h-2 rounded-full bg-nkt-green animate-pulse ml-1" />
              </div>
              <button onClick={loadMessages} className="text-nkt-muted hover:text-nkt-green transition-colors">
                <RefreshCw size={13} />
              </button>
            </div>
            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare size={40} className="text-nkt-muted/20 mb-3" />
                  <p className="text-nkt-muted font-mono text-sm">Personne n'a encore écrit...</p>
                </div>
              ) : messages.map((msg, i) => {
                const isMine   = msg.username === currentUser?.username;
                const showName = i === 0 || messages[i - 1].username !== msg.username;
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      {showName && (
                        <div className={`flex items-center gap-1.5 mb-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                          <span className={`text-[11px] font-mono font-bold ${isMine ? 'text-nkt-green' : 'text-nkt-cyan'}`}>
                            {msg.username}
                          </span>
                          {msg.is_captain && <Crown size={10} className="text-yellow-400" />}
                          <span className="text-[9px] font-mono text-nkt-muted/50">{formatTime(msg.created_at)}</span>
                        </div>
                      )}
                      <div className={`px-3.5 py-2.5 rounded-xl font-mono text-sm leading-relaxed ${
                        isMine
                          ? 'bg-nkt-green/15 border border-nkt-green/30 text-nkt-text rounded-br-sm'
                          : 'bg-nkt-bg border border-nkt-border text-nkt-text rounded-bl-sm'
                      }`}>{msg.message}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-nkt-border p-4">
              <form onSubmit={handleSendMsg} className="flex gap-3">
                <input className="nkt-input flex-1 px-4 py-2.5 rounded-lg text-sm font-mono"
                  placeholder="Écris un message..."
                  value={newMsg} onChange={e => setNewMsg(e.target.value)}
                  disabled={sending} maxLength={500} autoComplete="off" />
                <button type="submit" disabled={sending || !newMsg.trim()}
                  className="nkt-btn nkt-btn-solid px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm disabled:opacity-50">
                  {sending ? <span className="w-4 h-4 border-2 border-nkt-bg border-t-transparent rounded-full animate-spin" /> : <Send size={15} />}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* SOLVES */}
        {view === 'solves' && (
          <div className="bg-nkt-card border border-nkt-border rounded-xl overflow-hidden">
            <div className="border-b border-nkt-border px-5 py-3 grid grid-cols-12 gap-2 bg-nkt-bg/30">
              <span className="col-span-3 text-[10px] font-mono text-nkt-muted tracking-wider">JOUEUR</span>
              <span className="col-span-4 text-[10px] font-mono text-nkt-muted tracking-wider">CHALLENGE</span>
              <span className="col-span-2 text-[10px] font-mono text-nkt-muted tracking-wider">DIFF</span>
              <span className="col-span-1 text-[10px] font-mono text-nkt-muted tracking-wider">PTS</span>
              <span className="col-span-2 text-[10px] font-mono text-nkt-muted tracking-wider">QUAND</span>
            </div>
            {!team.solves?.length ? (
              <div className="text-center py-16">
                <Target size={40} className="text-nkt-muted/20 mx-auto mb-3" />
                <p className="text-nkt-muted font-mono text-sm">Aucun challenge résolu encore</p>
                <button onClick={() => navigate('/challenges')} className="mt-4 nkt-btn nkt-btn-solid px-5 py-2 rounded text-xs">
                  VOIR LES CHALLENGES
                </button>
              </div>
            ) : team.solves.map((s, i) => (
              <div key={i} className="px-5 py-3.5 grid grid-cols-12 gap-2 items-center border-b border-nkt-border/40 hover:bg-white/[0.02]">
                <div className="col-span-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded border border-nkt-border bg-nkt-bg flex items-center justify-center text-[11px] font-bold text-nkt-muted flex-shrink-0">
                    {s.username[0].toUpperCase()}
                  </div>
                  <span className="font-mono text-sm text-nkt-green font-semibold truncate">{s.username}</span>
                </div>
                <div className="col-span-4">
                  <p className="font-mono text-sm text-nkt-text truncate">{s.title}</p>
                  <p className="text-[10px] font-mono text-nkt-muted">{s.category}</p>
                </div>
                <div className="col-span-2">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${DIFF_STYLES[s.difficulty] || DIFF_STYLES.Easy}`}>
                    {s.difficulty}
                  </span>
                </div>
                <div className="col-span-1">
                  <span className="font-display text-sm text-nkt-green font-bold">+{s.points}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] font-mono text-nkt-muted">{formatTime(s.solved_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  EXPORT PRINCIPAL
// ══════════════════════════════════════════════
export default function Teams() {
  const { user }  = useAuth();
  const [team,    setTeam]    = useState(undefined);
  const [loading, setLoading] = useState(true);

  // ── Si superadmin → vue surveillance directement ──
  if (user?.role === 'superadmin') {
    return <AdminTeamsView />;
  }

  const loadTeam = async () => {
    setLoading(true);
    try {
      const r = await teamAPI.getMine();
      setTeam(r.data);
    } catch {
      setTeam(null);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { loadTeam(); }, []);

  if (loading) return (
    <div className="min-h-screen bg-nkt-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-nkt-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!team) return <NoTeamPage onCreated={loadTeam} />;

  return (
    <TeamDashboard
      team={team}
      currentUser={user}
      onLeave={() => setTeam(null)}
      onReload={loadTeam}
    />
  );
}