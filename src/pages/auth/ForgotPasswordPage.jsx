import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { showApiError } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { assetPath } from "../../lib/assetPaths";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
});

const rotatingLines = [
  "Recover your account securely",
  "Reset access in a few steps",
  "Protect your DTMS workspace",
  "Get back to work quickly",
];

const visualImages = [
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=80",
];

const backgroundVideo =
  "https://assets.mixkit.co/videos/preview/mixkit-abstract-white-and-blue-waves-41735-large.mp4";

function Field({ label, type, registration, value, error, autoComplete }) {
  const filled = Boolean(value);

  return (
    <label className="block">
      <div className="relative">
        <input
          type={type}
          placeholder=" "
          autoComplete={autoComplete}
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
      </div>
      {error ? <p className="mt-2 text-sm text-rose-500">{error}</p> : null}
    </label>
  );
}

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeLine, setActiveLine] = useState(0);
  const [activeImage, setActiveImage] = useState(0);

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { email: "" },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLine((current) => (current + 1) % rotatingLines.length);
    }, 3400);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveImage((current) => (current + 1) % visualImages.length);
    }, 5200);
    return () => clearInterval(interval);
  }, []);

  async function onSubmit(values) {
    setLoading(true);
    try {
      await forgotPassword({ email: values.email });
    } catch (error) {
      showApiError(error, "Unable to start password recovery");
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
          <AnimatePresence mode="wait">
            <motion.img
              key={visualImages[activeImage]}
              src={visualImages[activeImage]}
              alt="Modern workspace scene"
              className="h-full w-full object-cover"
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.01 }}
              transition={{ duration: 0.7 }}
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(235,244,255,0.16),rgba(15,23,42,0.22))]" />
          <div className="absolute inset-x-0 bottom-0 p-10">
            <div className="max-w-lg rounded-[28px] border border-white/70 bg-white/40 p-8 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.34em] text-slate-500">Digital Talent Management System</p>
              <h1 className="mt-5 text-4xl font-semibold leading-tight text-slate-900">Forgot password</h1>
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
              <img
                src={assetPath("logo.png")}
                alt="DTMS logo"
                className="h-20 w-20 rounded-[24px] object-cover shadow-[0_18px_45px_rgba(59,130,246,0.24)]"
              />
            </div>
            <p className="mt-8 text-center text-xs uppercase tracking-[0.34em] text-slate-500">DTMS Access</p>
            <h2 className="mt-4 text-center text-4xl font-semibold text-slate-900">Forgot Password</h2>
            <p className="mx-auto mt-3 max-w-md text-center text-sm leading-7 text-slate-600">
              Enter your account email to receive a secure reset link. In development, email preview appears in server logs.
            </p>

            <form className="mt-10 space-y-7" onSubmit={handleSubmit(onSubmit)}>
              <Field
                label="Email"
                type="email"
                registration={register("email")}
                value={watch("email")}
                error={errors.email?.message}
                autoComplete="email"
              />

              <button
                type="submit"
                disabled={!isValid || loading}
                className="w-full rounded-2xl bg-gradient-to-r from-sky-400 via-blue-400 to-violet-400 px-6 py-4 text-base font-semibold text-white shadow-[0_18px_50px_rgba(96,165,250,0.35)] transition duration-300 hover:scale-[1.01] hover:shadow-[0_22px_60px_rgba(139,92,246,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>

            <div className="mt-8 text-center text-sm">
              <Link to="/login" className="font-medium text-slate-600 transition hover:text-slate-900">
                Return to Sign In
              </Link>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
