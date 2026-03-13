import CTAButton from './CTAButton';

export default function Hero({ heroImageSrc = '/assets/hero-algo-guide.png' }) {
  return (
    <section
      aria-label="Hero"
      className="bg-black text-white"
    >
      <div className="mx-auto max-w-[1800px] px-8 py-10">
        <div className="rounded-2xl border border-zinc-900 bg-zinc-950 px-8 py-10">
          <h1 className="text-5xl font-semibold text-zinc-100 leading-tight">AlgoGuide</h1>
          <p className="mt-4 text-xl text-zinc-400 max-w-3xl">
            Track problems, stay consistent, and revise what matters. Built for productivity.
          </p>
          <div className="mt-8">
            <CTAButton href="/signin" className="rounded-xl bg-zinc-800 hover:bg-zinc-700 ring-1 ring-zinc-700 shadow-none px-8 py-4 text-lg" />
          </div>
        </div>
      </div>
    </section>
  );
}


