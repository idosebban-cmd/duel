import { useNavigate } from 'react-router-dom';

/** Muted legal line for signup flows; links use in-app routes (SPA navigation, works on mobile). */
export function SignupLegalConsent({ className = '' }: { className?: string }) {
  const navigate = useNavigate();
  return (
    <p
      className={`text-center font-body text-ui-caption ${className}`}
      style={{
        color: 'rgba(255,255,255,0.45)',
        lineHeight: 1.45,
        fontFamily: '"JLS Data Gothic", system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      }}
    >
      By creating an account you agree to our{' '}
      <button
        type="button"
        onClick={() => navigate('/terms')}
        className="font-bold underline underline-offset-4"
        style={{ color: '#FFE66D' }}
      >
        Terms & Conditions
      </button>
      {' '}and{' '}
      <button
        type="button"
        onClick={() => navigate('/privacy')}
        className="font-bold underline underline-offset-4"
        style={{ color: '#FFE66D' }}
      >
        Privacy Policy
      </button>
      .
    </p>
  );
}
