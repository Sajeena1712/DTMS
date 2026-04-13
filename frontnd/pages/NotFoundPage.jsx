import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-6 text-white">
      <div className="glass-panel max-w-lg rounded-3xl p-10 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-slate-400">404</p>
        <h1 className="mt-4 text-4xl font-semibold">Page not found</h1>
        <p className="mt-4 text-slate-300">
          The page you are looking for does not exist in this DTMS workspace.
        </p>
        <Link to="/login" className="btn-primary mt-8 inline-flex">
          Return to sign in
        </Link>
      </div>
    </div>
  );
}
