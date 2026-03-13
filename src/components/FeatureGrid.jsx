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
    <section aria-label="Features" className="py-8">
      <div className="mx-auto max-w-[1800px]">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, idx) => (
            <div
              key={f.title}
              className="rounded-xl border border-zinc-900 bg-zinc-950 p-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-zinc-200 ring-1 ring-zinc-800">
                  {renderIcon(f.icon)}
                </div>
                <h3 className="text-xl font-semibold text-zinc-100">{f.title}</h3>
              </div>
              {f.desc ? (
                <p className="mt-2 text-base text-zinc-400">{f.desc}</p>
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


