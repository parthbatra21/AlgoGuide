import CTAButton from './CTAButton';

export default function Hero({ heroImageSrc = '/assets/hero-algo-guide.png' }) {
  return (
    <section
      aria-label="Hero"
      className="relative isolate"
    >
      <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="max-w-[640px] motion-safe:animate-fade-in-left">
            <h1 className="font-bold tracking-tight text-6xl sm:text-7xl lg:text-8xl text-[color:var(--text-primary)] drop-shadow-[0_4px_24px_rgba(34,211,238,0.35)] ">
              AlgoGuide
            </h1>
            <p className="mt-4 text-2xl sm:text-3xl text-white/90">
              AI-Powered Job Preparation platform.
            </p>
            <p className="mt-6 text-xl sm:text-2xl leading-relaxed text-[color:var(--muted)]">
              Receive instant, personalized, and actionable support to prepare for coding interviews, system design interviews, and onsite rounds.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3">
              <CTAButton href="/signin" />
              
            </div>
          </div>

          <div className="w-full motion-safe:animate-fade-in-up">
            <div className="relative mx-auto w-full max-w-[860px] lg:max-w-[960px] xl:max-w-[1040px] aspect-[16/9] rounded-2xl border border-cyan-200/20 bg-white/5 backdrop-blur-md shadow-[0_20px_60px_-20px_rgba(34,211,238,0.5)] ring-1 ring-white/10 overflow-hidden">
              {/* Neon ring glow behind the mockup */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-[150%] w-[150%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[6px] border-cyan-300/70 blur-sm opacity-80"></div>
              <img
                src={heroImageSrc}
                alt="Hero illustration for Algo Guide"
                className="h-full w-full object-contain bg-[color:var(--image-bg,transparent)]"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-cyan-300/10 via-transparent to-transparent" />
            </div>
            
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-[color:var(--bg-gradient-start)] to-[color:var(--bg-gradient-end)]" />
    </section>
  );
}


