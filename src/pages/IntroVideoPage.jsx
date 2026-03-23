import GlassLoadingScreen from "../components/ui/GlassLoadingScreen";

export default function IntroVideoPage({ onFinish }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        playsInline
        onEnded={onFinish}
      >
        <source src="/intro-video.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.08),rgba(2,6,23,0.60))]" />
      <GlassLoadingScreen />
      <button
        type="button"
        onClick={onFinish}
        className="absolute bottom-8 right-8 z-20 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/15"
      >
        Skip
      </button>
    </div>
  );
}
