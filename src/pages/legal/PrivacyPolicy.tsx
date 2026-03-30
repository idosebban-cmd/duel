import { useNavigate } from 'react-router-dom';

const TERMLY_PRIVACY_URL = 'https://app.termly.io/policy-viewer/policy.html?policyUUID=be32a95b-d7a8-40c9-adcb-710d4053a887';

export function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#0A1628' }}>
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.02]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,1) 3px, rgba(255,255,255,1) 4px)' }}
      />

      <header
        className="relative z-10 flex-none flex items-center justify-between px-4 pt-5 pb-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(10,22,40,0.97)' }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="h-9 px-3 rounded-xl font-body text-ui-body font-bold"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          Back
        </button>

        <div
          className="font-display text-2xl leading-none"
          style={{
            background: 'linear-gradient(135deg, #FFE66D 0%, #FF9F1C 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 12px rgba(255,230,109,0.4))',
          }}
        >
          DUEL
        </div>

        <div className="w-[62px]" aria-hidden />
      </header>

      <div className="relative z-10 flex-none px-4 py-3">
        <h1 className="font-display text-lg" style={{ color: 'rgba(255,255,255,0.9)' }}>
          Privacy Policy
        </h1>
      </div>

      <main className="relative z-10 flex-1 px-4 pb-4">
        <div
          className="h-full w-full rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <iframe
            title="Duel Privacy Policy"
            src={TERMLY_PRIVACY_URL}
            className="w-full h-full"
            style={{ border: 0, background: '#ffffff' }}
            loading="lazy"
          />
        </div>
      </main>
    </div>
  );
}

