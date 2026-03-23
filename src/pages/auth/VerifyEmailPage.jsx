import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AuthCard from "../../components/auth/AuthCard";
import AuthShell from "../../components/layout/AuthShell";
import { showApiError } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";

export default function VerifyEmailPage() {
  const { verifyEmail } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { token } = useParams();

  useEffect(() => {
    async function runVerification() {
      if (!token) return;

      setLoading(true);
      try {
        await verifyEmail(token);
        setSuccess(true);
      } catch (error) {
        showApiError(error, "Unable to verify email");
      } finally {
        setLoading(false);
      }
    }

    runVerification();
  }, [token, verifyEmail]);

  return (
    <AuthShell
      eyebrow="Verification"
      title="Confirm your email and unlock the DTMS dashboard."
      description="Email verification keeps access secure and ensures only trusted users move into the talent workspace."
    >
      <AuthCard>
        <p className="text-xs uppercase tracking-[0.32em] text-cyan-100/80">Email Verification</p>
        <h2 className="mt-4 text-3xl font-semibold text-white">Verify your email</h2>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          {loading
            ? "Processing your secure verification link."
            : success
              ? "Your email has been verified successfully."
              : "We are validating your verification link."}
        </p>

        <div className="mt-8 space-y-3">
          <Link to="/login" className="btn-primary w-full">
            Go to Sign In
          </Link>
          <Link to="/register" className="btn-secondary w-full">
            Create another account
          </Link>
        </div>
      </AuthCard>
    </AuthShell>
  );
}
