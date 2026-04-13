import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../../contexts/AuthContext";
import { isAdminRole } from "../../lib/constants";
import { assetPath } from "../../lib/assetPaths";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const rotatingLines = [
  "Secure your digital talent journey",
  "Empowering skills through smart systems",
  "Your growth starts with one login",
  "Manage talent with intelligence",
];

const backgroundVideo =
  "https://assets.mixkit.co/videos/preview/mixkit-abstract-white-and-blue-waves-41735-large.mp4";
const sidePoster =
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80";

function Field({ label, type, registration, value, error, rightText, onRightClick }) {
  const filled = Boolean(value);

  return (
    <label className="block">
      <div className="relative">
        <input
          type={type}
          placeholder=" "
          autoComplete={type === "password" ? "current-password" : "email"}
          className="peer h-16 w-full border-0 border-b border-slate-300 bg-transparent px-0 pb-3 pt-6 text-base text-slate-900 outline-none transition duration-300 placeholder:text-transparent focus:border-sky-500"
          {...registration}
        />
        <span
          className={`pointer-events-none absolute left-0 transition-all duration-300 ${
            filled
              ? "top-1 text-xs uppercase tracking-[0.22em] text-slate-500"
              : "top-5 text-sm text-slate-400 peer-focus:top-1 peer-focus:text-xs peer-focus:uppercase peer-focus:tracking-[0.22em] peer-focus:text-slate-500"
          }`}
        >
          {label}
        </span>
        {rightText ? (
          <button
            type="button"
            onClick={onRightClick}
            className="absolute right-0 top-5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            {rightText}
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-sm text-rose-500">{error}</p> : null}
    </label>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverMessage, setServerMessage] = useState("");
  const [activeLine, setActiveLine] = useState(0);
  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const emailValue = watch("email");
  const passwordValue = watch("password");

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLine((current) => (current + 1) % rotatingLines.length);
    }, 3400);
    return () => clearInterval(interval);
  }, []);

  async function onSubmit(values) {
    setLoading(true);
    setServerMessage("");
    try {
      const response = await login(values);
      navigate(isAdminRole(response.user.role) ? "/admin-dashboard" : "/user-dashboard", { replace: true });
    } catch (error) {
      setServerMessage(error.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#eef4ff]">
      <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline>
        <source src={backgroundVideo} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.84),rgba(233,243,255,0.70),rgba(214,229,255,0.82))]" />
      <div className="absolute inset-0 backdrop-blur-[6px]" />

      <div className="relative mx-auto grid min-h-screen max-w-7xl gap-6 px-5 py-5 lg:grid-cols-[1.08fr_0.92fr] lg:px-10 lg:py-8">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative hidden overflow-hidden rounded-[34px] border border-white/70 bg-white/55 shadow-[0_24px_80px_rgba(148,163,184,0.25)] lg:block"
        >
          <video
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster={sidePoster}
          >
            <source src={backgroundVideo} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(235,244,255,0.14),rgba(15,23,42,0.34))]" />

          <div className="absolute left-8 top-8 right-8 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 rounded-full border border-white/70 bg-white/55 px-4 py-2 backdrop-blur-xl">
              <img src={assetPath("logo.png")} alt="DTMS logo" className="h-9 w-9 rounded-xl object-cover shadow-md" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">DTMS</p>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">AI Login Space</p>
              </div>
            </div>
            <div className="rounded-[22px] border border-white/65 bg-white/45 px-4 py-3 text-right backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Access Status</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Secure session ready</p>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-10">
            <div className="max-w-xl rounded-[30px] border border-white/70 bg-white/40 p-8 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.34em] text-slate-500">Digital Talent Management System</p>
              <h1 className="mt-5 text-4xl font-semibold leading-tight text-slate-900">
                AI-assisted access for modern digital talent teams
              </h1>
              <div className="mt-6 min-h-[60px]">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={rotatingLines[activeLine]}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.4 }}
                    className="text-lg text-slate-700"
                  >
                    {rotatingLines[activeLine]}
                  </motion.p>
                </AnimatePresence>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/65 bg-white/45 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Identity</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Verified access</p>
                </div>
                <div className="rounded-2xl border border-white/65 bg-white/45 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Workflow</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Talent synced</p>
                </div>
                <div className="rounded-2xl border border-white/65 bg-white/45 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Security</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Protected sign-in</p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="flex items-center justify-center">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="w-full max-w-xl rounded-[30px] border border-white/80 bg-white/68 p-8 shadow-[0_30px_90px_rgba(148,163,184,0.28)] backdrop-blur-2xl sm:p-10"
          >
            <div className="flex justify-center">
              <img src={assetPath("logo.png")} alt="DTMS logo" className="h-16 w-16 rounded-2xl object-cover shadow-[0_14px_36px_rgba(59,130,246,0.22)]" />
            </div>
            <p className="mt-8 text-center text-xs uppercase tracking-[0.34em] text-slate-500">DTMS Access</p>
            <h2 className="mt-4 text-center text-4xl font-semibold text-slate-900">Sign In</h2>
            <p className="mx-auto mt-3 max-w-md text-center text-sm leading-7 text-slate-600">
              Continue with your registered account. If you are not registered yet, create an account to continue.
            </p>

            <form className="mt-10 space-y-7" onSubmit={handleSubmit(onSubmit)}>
              <Field
                label="Email"
                type="email"
                registration={register("email")}
                value={emailValue}
                error={errors.email?.message}
              />
              <Field
                label="Password"
                type={showPassword ? "text" : "password"}
                registration={register("password")}
                value={passwordValue}
                error={errors.password?.message}
                rightText={showPassword ? "Hide" : "Show"}
                onRightClick={() => setShowPassword((current) => !current)}
              />

              {serverMessage ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {serverMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={!isValid || loading}
                className="w-full rounded-2xl bg-gradient-to-r from-sky-400 via-blue-400 to-violet-400 px-6 py-4 text-base font-semibold text-white shadow-[0_18px_50px_rgba(96,165,250,0.35)] transition duration-300 hover:scale-[1.01] hover:shadow-[0_22px_60px_rgba(139,92,246,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="mt-8 flex flex-col gap-3 text-center text-sm sm:flex-row sm:items-center sm:justify-between">
              <Link to="/forgot-password" className="font-medium text-slate-600 transition hover:text-slate-900">
                Forgot Password?
              </Link>
              <Link to="/register" className="font-medium text-slate-600 transition hover:text-slate-900">
                Create Account
              </Link>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
