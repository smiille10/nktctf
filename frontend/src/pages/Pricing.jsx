import { useState, useEffect } from 'react';
import api from '../api';
import { Check, Zap, Shield, Crown, Smartphone } from 'lucide-react';

// ─── LOGOS ────────────────────────────────────────────

const BankilyLogo = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="12" fill="#00a651"/>
    <rect x="8" y="10" width="32" height="4" rx="2" fill="white" opacity="0.9"/>
    <rect x="8" y="17" width="22" height="4" rx="2" fill="white" opacity="0.6"/>
    <rect x="8" y="24" width="28" height="4" rx="2" fill="white" opacity="0.4"/>
    <text x="24" y="40" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="Arial, sans-serif">BANKILY</text>
  </svg>
);

const SedadLogo = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="12" fill="#1a3a6b"/>
    <rect x="0" y="33" width="48" height="15" rx="0" fill="#e8472a"/>
    <rect x="0" y="33" width="48" height="15" rx="12" fill="#e8472a"/>
    <rect x="0" y="33" width="48" height="6" fill="#e8472a"/>
    <text x="24" y="24" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="Arial, sans-serif" letterSpacing="1">SEDAD</text>
    <text x="24" y="44" textAnchor="middle" fill="white" fontSize="6" fontFamily="Arial, sans-serif" opacity="0.9">BMI</text>
  </svg>
);

const PayPalLogo = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="12" fill="#002f86"/>
    <text x="21" y="22" textAnchor="middle" fill="#009cde" fontSize="12" fontWeight="900" fontFamily="Arial, sans-serif">P</text>
    <text x="28" y="30" textAnchor="middle" fill="#012069" fontSize="12" fontWeight="900" fontFamily="Arial, sans-serif">P</text>
    <text x="24" y="42" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="Arial, sans-serif">PayPal</text>
  </svg>
);

// ─── CONFIG ───────────────────────────────────────────

const BANKILY_NUMBER = import.meta.env.VITE_BANKILY_NUMBER || '0022233222705';
const SEDAD_NUMBER   = import.meta.env.VITE_SEDAD_NUMBER   || '0022233222705';

const PLANS = [
  {
    id: 'free', label: 'FREE', icon: Shield,
    monthly: 0, yearly: 0,
    color: '#4a6070',
    features: [
      'Accès aux challenges publics',
      'Scoreboard global',
      'Events gratuits',
      'Support communauté',
    ],
    locked: ['Challenges exclusifs', 'Events premium', 'Badge spécial', 'Support prioritaire'],
  },
  {
    id: 'pro', label: 'PRO', icon: Zap,
    monthly: 5, yearly: 40,
    color: '#00d4ff',
    features: [
      'Tout du plan FREE',
      'Tous les challenges',
      'Accès events premium',
      'Badge PRO sur le profil',
      'Support Basic',
    ],
    locked: ['Challenges exclusifs', 'Support prioritaire'],
  },
  {
    id: 'elite', label: 'ELITE', icon: Crown,
    monthly: 15, yearly: 100,
    color: '#ffd700',
    popular: true,
    features: [
      'Tout du plan PRO',
      'Challenges exclusifs',
      'Events VIP',
      'Badge ELITE animé',
      'Certificat de complétion',
      'Support prioritaire',
    ],
    locked: [],
  },
];

const PAYMENT_METHODS = [
  {
    id: 'paypal',
    label: 'PayPal',
    Logo: PayPalLogo,
    desc: 'Paiement automatique',
    automatic: true,
    number: null,
  },
  {
    id: 'bankily',
    label: 'Bankily',
    Logo: BankilyLogo,
    desc: BANKILY_NUMBER,
    automatic: false,
    number: BANKILY_NUMBER,
  },
  {
    id: 'sedad',
    label: 'Sedad',
    Logo: SedadLogo,
    desc: SEDAD_NUMBER,
    automatic: false,
    number: SEDAD_NUMBER,
  },
];

// ─── COMPONENT ────────────────────────────────────────

export default function Pricing() {
  const [period, setPeriod] = useState('monthly');
  const [currentPlan, setCurrentPlan] = useState('free');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('paypal');
  const [localForm, setLocalForm] = useState({ transaction_ref: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/payments/my-plan')
      .then(r => setCurrentPlan(r.data.plan))
      .catch(() => {});
  }, []);

  const selectedPlanData = PLANS.find(p => p.id === selectedPlan);
  const getPrice = (plan) => plan ? (period === 'yearly' ? plan.yearly : plan.monthly) : 0;

  const handlePayPal = async () => {
    setLoading(true);
    setMsg('');
    try {
      const res = await api.post('/payments/paypal/create-order', { plan: selectedPlan, period });
      sessionStorage.setItem('pending_plan', selectedPlan);
      sessionStorage.setItem('pending_period', period);
      sessionStorage.setItem('pending_order_id', res.data.order_id);
      window.location.href = res.data.approve_url;
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Erreur PayPal'));
      setLoading(false);
    }
  };

  const handleLocalPayment = async () => {
    if (!localForm.transaction_ref) {
      setMsg('❌ Entre la référence de transaction');
      return;
    }
    setLoading(true);
    setMsg('');
    try {
      const res = await api.post('/payments/local/submit', {
        plan: selectedPlan,
        period,
        method: paymentMethod,
        transaction_ref: localForm.transaction_ref,
        phone: localForm.phone,
      });
      setMsg('✅ ' + res.data.message);
      setSelectedPlan(null);
      setLocalForm({ transaction_ref: '', phone: '' });
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Erreur'));
    } finally {
      setLoading(false);
    }
  };

  const handlePay = () => {
    if (paymentMethod === 'paypal') handlePayPal();
    else handleLocalPayment();
  };

  return (
    <div className="min-h-screen bg-nkt-bg bg-grid pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4">

        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-nkt-muted text-xs font-mono tracking-widest mb-3">SUBSCRIPTION_PLANS</p>
          <h1 className="font-display text-4xl font-bold text-nkt-text mb-3">
            Choisis ton <span className="neon-text">Plan</span>
          </h1>
          <p className="text-nkt-muted text-sm font-mono">
            Accède à plus de challenges et d'events
          </p>

          {/* Toggle mensuel / annuel */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button onClick={() => setPeriod('monthly')}
              className={`px-5 py-2 rounded text-xs font-mono font-bold border transition-all ${
                period === 'monthly'
                  ? 'border-nkt-green bg-nkt-green/10 text-nkt-green'
                  : 'border-nkt-border text-nkt-muted hover:text-nkt-text'
              }`}>
              MENSUEL
            </button>
            <button onClick={() => setPeriod('yearly')}
              className={`px-5 py-2 rounded text-xs font-mono font-bold border transition-all relative ${
                period === 'yearly'
                  ? 'border-nkt-green bg-nkt-green/10 text-nkt-green'
                  : 'border-nkt-border text-nkt-muted hover:text-nkt-text'
              }`}>
              ANNUEL
              <span className="absolute -top-2.5 -right-2 text-[9px] font-bold bg-nkt-green text-nkt-bg px-1.5 py-0.5 rounded-full">
                -33%
              </span>
            </button>
          </div>
        </div>

        {/* Message */}
        {msg && (
          <div className={`mb-8 p-4 rounded border font-mono text-sm text-center max-w-2xl mx-auto ${
            msg.startsWith('✅')
              ? 'bg-nkt-green/10 border-nkt-green/30 text-nkt-green'
              : 'bg-nkt-red/10 border-nkt-red/30 text-nkt-red'
          }`}>
            {msg}
          </div>
        )}

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {PLANS.map(plan => {
            const Icon = plan.icon;
            const price = getPrice(plan);
            const isCurrent = currentPlan === plan.id;
            const isSelected = selectedPlan === plan.id;

            return (
              <div key={plan.id}
                className={`bg-nkt-card border rounded-xl p-6 relative overflow-hidden transition-all ${
                  plan.popular
                    ? 'border-yellow-400/50 shadow-lg shadow-yellow-400/10'
                    : isCurrent ? 'border-nkt-green/50'
                    : isSelected ? 'border-nkt-green/70'
                    : 'border-nkt-border hover:border-nkt-green/30'
                }`}>

                {/* Top gradient bar */}
                <div className="absolute top-0 left-0 right-0 h-[3px]"
                  style={{ background: `linear-gradient(90deg, transparent, ${plan.color}, transparent)` }} />

                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-yellow-400 text-nkt-bg text-[10px] font-bold px-3 py-1 font-mono">
                    POPULAR
                  </div>
                )}

                {/* Icon + label */}
                <div className="flex items-center gap-3 mb-5">
                  <Icon size={26} style={{ color: plan.color }} />
                  <div>
                    <h3 className="font-display text-xl font-bold" style={{ color: plan.color }}>
                      {plan.label}
                    </h3>
                    {isCurrent && (
                      <span className="text-[10px] font-mono text-nkt-green bg-nkt-green/10 px-2 py-0.5 rounded border border-nkt-green/30">
                        PLAN ACTUEL
                      </span>
                    )}
                  </div>
                </div>

                {/* Prix */}
                <div className="mb-6">
                  {price === 0 ? (
                    <p className="font-display text-4xl font-bold text-nkt-text">Gratuit</p>
                  ) : (
                    <div>
                      <p className="font-display text-4xl font-bold" style={{ color: plan.color }}>
                        ${price}
                        <span className="text-sm text-nkt-muted font-mono ml-1">
                          /{period === 'yearly' ? 'an' : 'mois'}
                        </span>
                      </p>
                      {period === 'yearly' && (
                        <p className="text-nkt-muted text-xs font-mono mt-1">
                          soit ${(price / 12).toFixed(2)}/mois
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-2 mb-6">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check size={13} style={{ color: plan.color }} />
                      <span className="text-xs font-mono text-nkt-text">{f}</span>
                    </div>
                  ))}
                  {plan.locked.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 opacity-30">
                      <div className="w-3 h-px bg-nkt-muted ml-0.5" />
                      <span className="text-xs font-mono text-nkt-muted line-through">{f}</span>
                    </div>
                  ))}
                </div>

                {/* Bouton */}
                {isCurrent ? (
                  <div className="w-full py-3 rounded text-sm font-mono font-bold border border-nkt-border text-nkt-muted text-center">
                    PLAN ACTUEL
                  </div>
                ) : price === 0 ? (
                  <div className="w-full py-3 rounded text-sm font-mono font-bold border border-nkt-border text-nkt-muted text-center">
                    GRATUIT
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedPlan(isSelected ? null : plan.id)}
                    className="w-full py-3 rounded text-sm font-mono font-bold border transition-all"
                    style={{
                      borderColor: plan.color,
                      color: isSelected ? '#080d14' : plan.color,
                      background: isSelected ? plan.color : `${plan.color}15`,
                    }}>
                    {isSelected ? '✓ SÉLECTIONNÉ' : `CHOISIR ${plan.label}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Section paiement */}
        {selectedPlan && selectedPlan !== 'free' && (
          <div className="bg-nkt-card border border-nkt-green/30 rounded-xl p-8 max-w-2xl mx-auto relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-nkt-green to-transparent" />

            <h2 className="font-display text-xl font-bold text-nkt-text mb-1">
              Paiement — <span className="neon-text">{selectedPlan.toUpperCase()}</span>
            </h2>
            <p className="text-nkt-muted text-xs font-mono mb-6">
              {period === 'yearly' ? 'Abonnement annuel' : 'Abonnement mensuel'} —{' '}
              <span className="text-nkt-green font-bold text-sm">${getPrice(selectedPlanData)}</span>
            </p>

            {/* Méthodes de paiement */}
            <p className="text-[11px] font-mono text-nkt-muted tracking-widest mb-3">
              MÉTHODE DE PAIEMENT
            </p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {PAYMENT_METHODS.map(method => {
                const LogoComp = method.Logo;
                return (
                  <button key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-4 rounded-lg border transition-all text-center ${
                      paymentMethod === method.id
                        ? 'border-nkt-green bg-nkt-green/10 shadow-md shadow-nkt-green/10'
                        : 'border-nkt-border hover:border-nkt-green/30'
                    }`}>
                    <div className="flex justify-center mb-2">
                      <LogoComp />
                    </div>
                    <p className="font-mono text-xs font-bold text-nkt-text">{method.label}</p>
                    <p className="font-mono text-[10px] text-nkt-muted mt-0.5 break-all">{method.desc}</p>
                    {method.automatic && (
                      <span className="text-[9px] font-mono text-nkt-green bg-nkt-green/10 px-1.5 py-0.5 rounded mt-1 inline-block">
                        AUTO
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Instructions Bankily / Sedad */}
            {(paymentMethod === 'bankily' || paymentMethod === 'sedad') && (
              <div className="space-y-4">
                <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-lg p-4">
                  <p className="text-yellow-400 text-xs font-mono font-bold mb-3">
                    📱 Instructions {paymentMethod === 'bankily' ? 'Bankily' : 'Sedad'}
                  </p>
                  <div className="space-y-1.5 text-nkt-muted text-xs font-mono">
                    <p>1. Ouvre l'app{' '}
                      <span className="text-nkt-text font-bold capitalize">{paymentMethod}</span>
                    </p>
                    <p>2. Fais un transfert de{' '}
                      <span className="text-nkt-green font-bold text-sm">${getPrice(selectedPlanData)}</span>
                    </p>
                    <p>3. Numéro destinataire :</p>
                    <p className="text-nkt-green font-bold text-2xl tracking-widest py-1">
                      {paymentMethod === 'bankily' ? BANKILY_NUMBER : SEDAD_NUMBER}
                    </p>
                    <p>4. Note le{' '}
                      <span className="text-nkt-text font-bold">numéro de transaction</span>{' '}
                      et entre-le ci-dessous
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">
                    RÉFÉRENCE DE TRANSACTION *
                  </label>
                  <input
                    className="nkt-input w-full px-4 py-2.5 rounded text-sm font-mono"
                    placeholder="Ex: TXN123456789"
                    value={localForm.transaction_ref}
                    onChange={e => setLocalForm({ ...localForm, transaction_ref: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-nkt-muted mb-2 tracking-widest">
                    TON NUMÉRO (optionnel)
                  </label>
                  <input
                    className="nkt-input w-full px-4 py-2.5 rounded text-sm font-mono"
                    placeholder="Ex: 0022233XXXXXX"
                    value={localForm.phone}
                    onChange={e => setLocalForm({ ...localForm, phone: e.target.value })}
                  />
                </div>

                <div className="bg-nkt-bg/50 border border-nkt-border rounded p-3">
                  <p className="text-nkt-muted text-[10px] font-mono">
                    ⏱️ Paiement vérifié par l'admin sous{' '}
                    <span className="text-nkt-text font-bold">24-48h</span>.
                    Ton plan sera activé dès confirmation.
                  </p>
                </div>
              </div>
            )}

            {/* Info PayPal */}
            {paymentMethod === 'paypal' && (
              <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-4 mb-4">
                <p className="text-blue-300 text-xs font-mono text-center">
                  🅿️ Tu seras redirigé vers PayPal pour finaliser le paiement de{' '}
                  <span className="font-bold text-white">${getPrice(selectedPlanData)}</span>
                </p>
              </div>
            )}

            {/* Boutons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setSelectedPlan(null); setMsg(''); }}
                className="nkt-btn px-5 py-3 rounded text-sm">
                ANNULER
              </button>
              <button
                onClick={handlePay}
                disabled={loading}
                className="nkt-btn nkt-btn-solid flex-1 py-3 rounded text-sm flex items-center justify-center gap-2">
                {loading ? (
                  <span className="w-4 h-4 border-2 border-nkt-bg border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {paymentMethod === 'paypal' && <span>🅿️</span>}
                    {(paymentMethod === 'bankily' || paymentMethod === 'sedad') && <Smartphone size={16} />}
                    {paymentMethod === 'paypal' ? 'PAYER AVEC PAYPAL' : 'SOUMETTRE LE PAIEMENT'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-nkt-muted/40 text-[10px] font-mono mt-10">
          NKTCTF © 2025 — Paiements sécurisés 🔐
        </p>
      </div>
    </div>
  );
}