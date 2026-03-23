import GlassLoadingScreen from "./GlassLoadingScreen";

export default function FullscreenLoader({
  title = "Initializing System...",
}) {
  return (
    <div className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-hidden bg-[#020617]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.20),transparent_28%),radial-gradient(circle_at_center,rgba(168,85,247,0.14),transparent_34%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.92),rgba(2,6,23,0.84),rgba(2,6,23,0.96))]" />
      <GlassLoadingScreen title={title} />
    </div>
  );
}
