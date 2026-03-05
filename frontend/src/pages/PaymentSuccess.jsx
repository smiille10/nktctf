import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { CheckCircle, Loader, Crown } from 'lucide-react';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const navigate = useNavigate();

  useEffect(() => {
    const session_id = searchParams.get('session_id');
    const plan = searchParams.get('plan');
    const period = searchParams.get('period');

    if (!session_id) {
      navigate('/pricing');
      return;
    }

    api.post('/payments/stripe/verify', { session_id, plan, period })
      .then(() => {
        setStatus('success');
        setTimeout(() => navigate('/dashboard'), 4000);
      })
      .catch(() => {
        setStatus('error');
      });
  }, []);

  return (
    <div className="min-h-screen bg-nkt-bg bg-grid flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-nkt-card border border-nkt-border rounded-xl p-10">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-nkt-green to-transparent" />

          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4">
              <Loader size={48} className="text-nkt-green animate-spin" />
              <p className="font-mono text-sm text-nkt-muted">Vérification du paiement...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-5">
              <Crown size={64} className="text-yellow-400" style={{ filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.6))' }} />
              <div>
                <p className="font-display text-2xl font-bold text-nkt-green mb-2">PAIEMENT RÉUSSI !</p>
                <p className="font-mono text-sm text-nkt-muted">Ton abonnement est maintenant actif.</p>
                <p className="font-mono text-xs text-nkt-muted mt-3">Redirection vers le dashboard...</p>
              </div>
              <button onClick={() => navigate('/dashboard')}
                className="nkt-btn nkt-btn-solid px-8 py-3 rounded text-sm">
                ALLER AU DASHBOARD →
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <p className="font-display text-xl font-bold text-nkt-red">ERREUR</p>
              <p className="font-mono text-xs text-nkt-muted">Erreur lors de la vérification.</p>
              <button onClick={() => navigate('/pricing')}
                className="nkt-btn nkt-btn-solid px-6 py-2.5 rounded text-sm">
                RETOUR PRICING
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}