import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { showApiError } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";

const schema = z
  .object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email("Enter a valid email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Add at least one uppercase letter")
      .regex(/\d/, "Add at least one number")
      .regex(/[^A-Za-z0-9]/, "Add at least one special character"),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

const rotatingLines = [
  "Create your secure DTMS account",
  "Start managing talent with clarity",
  "One account for your complete workflow",
  "Move faster with role-based access",
];

const visualImages = [
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=80",
];

const backgroundVideo =
  "https://assets.mixkit.co/videos/preview/mixkit-abstract-white-and-blue-waves-41735-large.mp4";

function Field({ label, type, registration, value, error, rightText, onRightClick, autoComplete }) {
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

function getStrength(password) {
  if (!password) return "";
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 1) return "weak";
  if (score <= 3) return "medium";
  return "strong";
}

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeLine, setActiveLine] = useState(0);
  const [activeImage, setActiveImage] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
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
      await registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      navigate("/login", { replace: true });
    } catch (error) {
      showApiError(error, "Unable to register");
    } finally {
      setLoading(false);
    }
  }

  const passwordStrength = getStrength(watch("password"));

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
              <h1 className="mt-5 text-4xl font-semibold leading-tight text-slate-900">Create your account</h1>
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
                src="/logo.png"
                alt="DTMS logo"
                className="h-20 w-20 rounded-[24px] object-cover shadow-[0_18px_45px_rgba(59,130,246,0.24)]"
              />
            </div>
            <p className="mt-8 text-center text-xs uppercase tracking-[0.34em] text-slate-500">DTMS Access</p>
            <h2 className="mt-4 text-center text-4xl font-semibold text-slate-900">Create Account</h2>
            <p className="mx-auto mt-3 max-w-md text-center text-sm leading-7 text-slate-600">
              Create your account with a strong password. We will send a verification link to activate DTMS access.
            </p>

            <form className="mt-10 space-y-7" onSubmit={handleSubmit(onSubmit)}>
              <Field
                label="Name"
                type="text"
                registration={register("name")}
                value={watch("name")}
                error={errors.name?.message}
                autoComplete="name"
              />
              <Field
                label="Email"
                type="email"
                registration={register("email")}
                value={watch("email")}
                error={errors.email?.message}
                autoComplete="email"
              />
              <Field
                label="Password"
                type={showPassword ? "text" : "password"}
                registration={register("password")}
                value={watch("password")}
                error={errors.password?.message}
                rightText={showPassword ? "Hide" : "Show"}
                onRightClick={() => setShowPassword((current) => !current)}
                autoComplete="new-password"
              />
              {passwordStrength ? (
                <p className="text-sm text-slate-600">
                  Password strength: <span className="font-semibold capitalize">{passwordStrength}</span>
                </p>
              ) : null}
              <Field
                label="Confirm Password"
                type={showConfirmPassword ? "text" : "password"}
                registration={register("confirmPassword")}
                value={watch("confirmPassword")}
                error={errors.confirmPassword?.message}
                rightText={showConfirmPassword ? "Hide" : "Show"}
                onRightClick={() => setShowConfirmPassword((current) => !current)}
                autoComplete="new-password"
              />

              <button
                type="submit"
                disabled={!isValid || loading}
                className="w-full rounded-2xl bg-gradient-to-r from-sky-400 via-blue-400 to-violet-400 px-6 py-4 text-base font-semibold text-white shadow-[0_18px_50px_rgba(96,165,250,0.35)] transition duration-300 hover:scale-[1.01] hover:shadow-[0_22px_60px_rgba(139,92,246,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <div className="mt-8 text-center text-sm">
              <Link to="/login" className="font-medium text-slate-600 transition hover:text-slate-900">
                Already have an account? Sign In
              </Link>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
