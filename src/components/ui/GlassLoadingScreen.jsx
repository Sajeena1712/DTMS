export default function GlassLoadingScreen({
  title = "Initializing System...",
}) {
  return (
    <div className="loader-fade-in relative z-10 mx-4 w-full max-w-3xl">
      <div className="absolute inset-0 -z-10 rounded-[36px] bg-[radial-gradient(circle,rgba(79,70,229,0.38)_0%,rgba(168,85,247,0.24)_30%,rgba(6,182,212,0.18)_58%,transparent_76%)] blur-3xl" />
      <div className="loader-orbit-wave absolute -left-12 top-10 -z-10 h-48 w-48 rounded-full bg-cyan-400/18 blur-3xl" />
      <div className="loader-orbit-wave absolute -right-10 bottom-8 -z-10 h-56 w-56 rounded-full bg-purple-500/16 blur-3xl [animation-delay:-2.2s]" />

      <section className="loader-card relative overflow-hidden rounded-[32px] border border-white/12 bg-white/[0.07] p-8 text-center text-white backdrop-blur-2xl sm:p-10">
        <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(79,70,229,0.10),rgba(6,182,212,0.05),rgba(168,85,247,0.08))]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
        <div className="loader-wave-grid absolute inset-0 opacity-40" />

        <div className="relative flex justify-center">
          <div className="loader-logo-glow flex h-28 w-28 items-center justify-center rounded-[30px] border border-white/16 bg-slate-950/35">
            <img
              src="/logo.png"
              alt="DTMS logo"
              className="loader-logo-pulse h-20 w-20 rounded-[24px] object-cover"
            />
          </div>
        </div>

        <div className="relative mt-7">
          <div className="mx-auto h-px w-32 bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-[0.04em] text-white sm:text-5xl">
            {title}
          </h1>
        </div>

        <div className="relative mt-10">
          <div className="mx-auto flex h-24 max-w-md items-end justify-center gap-2 rounded-[28px] border border-white/10 bg-slate-950/30 px-6 py-5 shadow-[inset_0_1px_18px_rgba(255,255,255,0.04)]">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((bar, index) => (
              <span
                key={bar}
                className="loader-bar block w-3 rounded-full bg-gradient-to-t from-indigo-500 via-cyan-400 to-purple-400"
                style={{ animationDelay: `${index * 0.12}s` }}
              />
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-full border border-white/10 bg-slate-950/45 p-1.5 shadow-[inset_0_1px_12px_rgba(255,255,255,0.04)]">
          <div className="relative h-2.5 overflow-hidden rounded-full bg-white/5">
            <div className="loader-progress absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 shadow-[0_0_28px_rgba(79,70,229,0.65)]" />
          </div>
        </div>
      </section>
    </div>
  );
}
