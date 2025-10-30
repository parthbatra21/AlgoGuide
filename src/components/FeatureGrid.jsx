function IconSpark() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2l2.2 6.5H21l-5.6 4.1 2.1 6.4L12 15.4 6.5 19l2-6.4L3 8.5h6.8L12 2z" fill="currentColor" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l7 3v6c0 5-3.8 7.7-7 9-3.2-1.3-7-4-7-9V6l7-3z" fill="currentColor" />
    </svg>
  );
}

function IconFlow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h8a4 4 0 010 8H8" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="4" cy="6" r="2" fill="currentColor" />
      <circle cx="8" cy="14" r="2" fill="currentColor" />
      <circle cx="16" cy="10" r="2" fill="currentColor" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5h16v10H7l-3 3V5z" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

function IconReport() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 7h8M8 11h8M8 15h5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function FeatureGrid({ features }) {
  return (
    <section aria-label="Features" className="py-14 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, idx) => (
            <div
              key={f.title}
              className="group rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 shadow-sm ring-1 ring-white/10 transition-transform transition-shadow duration-200 hover:-translate-y-1 hover:shadow-[0_12px_28px_-10px_rgba(34,211,238,0.35)] motion-safe:animate-fade-in-up"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-300/15 text-cyan-300 ring-1 ring-cyan-300/30">
                  {renderIcon(f.icon)}
                </div>
                <h3 className="font-semibold text-[color:var(--text-primary)]">{f.title}</h3>
              </div>
              {f.desc ? (
                <p className="mt-2 text-sm text-[color:var(--muted)]">{f.desc}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function renderIcon(name) {
  switch (name) {
    case 'spark':
      return <IconSpark />;
    case 'shield':
      return <IconShield />;
    case 'flow':
      return <IconFlow />;
    case 'search':
      return <IconSearch />;
    case 'chat':
      return <IconChat />;
    case 'report':
      return <IconReport />;
    default:
      return <IconSpark />;
  }
}


