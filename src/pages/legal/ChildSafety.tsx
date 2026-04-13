import { useNavigate } from 'react-router-dom';

export function ChildSafety() {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#12122A' }}>

      <header
        className="relative z-10 flex-none flex items-center justify-between px-4 pt-5 pb-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(18,18,42,0.97)' }}
      >
        <button
          type="button"
          onClick={() => navigate('/landing')}
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
          className="font-logo text-2xl leading-none"
          style={{
            background: 'linear-gradient(135deg, #FFE66D 0%, #FF9F1C 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 12px rgba(255,230,109,0.4))',
            fontFamily: '"JLS Data Gothic", system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          }}
        >
          DUEL
        </div>

        <div className="w-[62px]" aria-hidden />
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto px-4 pb-6 pt-2" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <div
          className="max-w-2xl mx-auto rounded-2xl px-4 py-4"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <h1
            className="font-display text-xl mb-4"
            style={{
              color: '#FFE66D',
              fontFamily: '"JLS Data Gothic", system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
              letterSpacing: '0.02em',
            }}
          >
            Child Safety Standards
          </h1>

          <p
            className="font-body text-ui-body leading-relaxed mb-4"
            style={{ color: 'rgba(255,255,255,0.82)', fontFamily: '"JLS Data Gothic", system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}
          >
            Noble Banana Ltd (&quot;Duel&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed to the safety and protection of children. This page outlines our standards and practices regarding child safety on our platform.
          </p>

          <Section title="Age Requirement">
            <p>
              Duel is intended exclusively for users aged <strong style={{ color: '#FFE66D' }}>18 years and older</strong>. All users must confirm they meet this minimum age requirement during account creation. We do not knowingly collect personal information from anyone under the age of 18.
            </p>
          </Section>

          <Section title="Minors Are Not Permitted">
            <p>
              Duel does not permit minors to create accounts, access the platform, or use any of our services. If we become aware that a user is under the age of 18, we will take immediate action to terminate their account and delete any associated personal data.
            </p>
          </Section>

          <Section title="Reporting Inappropriate Content or Behaviour">
            <p>
              We provide in-app tools that allow users to report inappropriate content or behaviour. Every user profile includes a <strong style={{ color: '#FFE66D' }}>block and report</strong> feature that can be used to flag concerns, including any content or conduct that may involve the safety of minors.
            </p>
            <p className="mt-2">
              All reports are reviewed by our team and acted upon promptly. We encourage our users to report anything that appears suspicious or harmful.
            </p>
          </Section>

          <Section title="Cooperation with Authorities">
            <p>
              Duel cooperates fully with relevant law enforcement and regulatory authorities regarding child safety concerns. Where we identify or are made aware of any potential risk to the safety of a child, we will report the matter to the appropriate authorities without delay.
            </p>
          </Section>

          <Section title="Contact Us">
            <p>
              If you have any concerns related to child safety on Duel, please contact us immediately at:
            </p>
            <p className="mt-2">
              <a
                href="mailto:ido@noblebanana.com"
                style={{ color: '#FFE66D', textDecoration: 'underline' }}
              >
                ido@noblebanana.com
              </a>
            </p>
            <div className="mt-3">
              <p>Noble Banana Ltd</p>
              <p>19 Lynbrook Grove</p>
              <p>London, SE15 6HN</p>
              <p>United Kingdom</p>
            </div>
          </Section>

          <p
            className="mt-6 text-sm"
            style={{ color: 'rgba(255,255,255,0.45)', fontFamily: '"JLS Data Gothic", system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}
          >
            Last updated April 13, 2026
          </p>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h2
        className="font-display text-sm mb-2"
        style={{
          color: '#FFE66D',
          fontFamily: '"JLS Data Gothic", system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </h2>
      <div
        className="font-body text-ui-body leading-relaxed"
        style={{ color: 'rgba(255,255,255,0.82)', fontFamily: '"JLS Data Gothic", system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}
      >
        {children}
      </div>
    </section>
  );
}
