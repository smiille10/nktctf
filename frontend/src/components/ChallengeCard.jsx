import { CheckCircle, Download, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CATEGORY_ICONS = {
  web: '🌐', forensics: '🔍', crypto: '🔐', osint: '👁️', misc: '⚡',
};

const CATEGORY_STYLES = {
  web: 'cat-web', forensics: 'cat-forensics', crypto: 'cat-crypto', osint: 'cat-osint', misc: 'cat-misc',
};

export default function ChallengeCard({ challenge }) {
  const navigate = useNavigate();
  const cat = challenge.category.toLowerCase();

  return (
    <div
      className={`challenge-card ${challenge.solved ? 'solved' : ''} bg-nkt-card rounded-lg p-5 cursor-pointer relative overflow-hidden`}
      onClick={() => navigate(`/challenges/${challenge.id}`)}
    >
      {challenge.solved && (
        <div className="absolute top-3 right-3">
          <CheckCircle size={18} className="text-nkt-green" style={{ filter: 'drop-shadow(0 0 6px rgba(0,255,136,0.8))' }} />
        </div>
      )}

      <div className="absolute top-0 left-0 w-8 h-8 overflow-hidden">
        <div className="absolute top-0 left-0 w-px h-4 bg-nkt-green/40" />
        <div className="absolute top-0 left-0 h-px w-4 bg-nkt-green/40" />
      </div>

      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-mono font-semibold tracking-wider mb-3 ${CATEGORY_STYLES[cat] || 'cat-misc'}`}>
        <span>{CATEGORY_ICONS[cat] || '⚡'}</span>
        {challenge.category.toUpperCase()}
      </div>

      <h3 className="font-mono font-semibold text-nkt-text text-sm mb-2 leading-tight">
        {challenge.title}
      </h3>

      <p className="text-nkt-muted text-xs leading-relaxed mb-4 line-clamp-2">
        {challenge.description}
      </p>

      <div className="flex items-center justify-between">
        <span className={`font-display text-lg font-bold ${challenge.solved ? 'neon-text-dim' : 'text-nkt-green'}`}>
          {challenge.points}
          <span className="text-[10px] text-nkt-muted font-mono ml-1">pts</span>
        </span>

        <div className="flex items-center gap-3 text-nkt-muted">
          {challenge.file_name && (
            <div className="flex items-center gap-1 text-[10px]">
              <Download size={11} className="text-nkt-cyan" />
              <span className="text-nkt-cyan">FILE</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-[10px]">
            <Users size={11} />
            <span>{challenge.solves || 0}</span>
          </div>
        </div>
      </div>

      {challenge.solved && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-nkt-green/50 via-nkt-green to-nkt-green/50" />
      )}
    </div>
  );
}