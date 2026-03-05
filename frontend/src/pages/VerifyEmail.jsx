import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../api';
import { Shield, Loader } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    authAPI.verifyEmail(token)
      .then(() => {
        navigate('/login');
      })
      .catch(() => {
        navigate('/login');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-nkt-bg bg-grid flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <Shield size={56} className="text-nkt-green"
            style={{ filter: 'drop-shadow(0 0 20px rgba(0,255,136,0.6))' }} />
        </div>
        <h1 className="font-display text-2xl font-bold neon-text mb-2">NKTCTF</h1>
        <p className="text-nkt-muted text-xs font-mono tracking-widest mb-8">EMAIL VERIFICATION</p>

        <div className="bg-nkt-card border border-nkt-border rounded-lg p-8 relative">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-nkt-green to-transparent" />
          <div className="flex flex-col items-center gap-4">
            <Loader size={48} className="text-nkt-green animate-spin" />
            <p className="font-mono text-sm text-nkt-muted">Vérification en cours...</p>
            <p className="font-mono text-xs text-nkt-muted/50">Redirection automatique...</p>
          </div>
        </div>
      </div>
    </div>
  );
}