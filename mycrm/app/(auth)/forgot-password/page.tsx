"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2, ShieldQuestion } from "lucide-react";
import { api } from "@/lib/api";
import { BRAND } from "@/lib/core-brand";

type Question = { key: string; label: string };
type Step = "email" | "questions" | "reset" | "done";

function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <rect x="2" y="2" width="12" height="12" rx="3" fill="currentColor" opacity="0.9" />
      <rect x="18" y="2" width="12" height="12" rx="3" fill="currentColor" opacity="0.7" />
      <rect x="2" y="18" width="12" height="12" rx="3" fill="currentColor" opacity="0.7" />
      <rect x="18" y="18" width="12" height="12" rx="3" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

const inputClass = [
  "w-full h-11 px-4 rounded-xl border text-sm bg-white",
  "placeholder:text-gray-300 outline-none",
  "transition-all duration-150",
  "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
  "border-gray-200 hover:border-gray-300",
].join(" ");

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);

  const [email, setEmail] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/recovery/start", { email });
      setChallengeId(data.challengeId);
      setQuestions(data.questions);
      setAnswers({});
      setStep("questions");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/recovery/verify", { challengeId, answers });
      setResetToken(data.resetToken);
      setStep("reset");
    } catch (err: any) {
      const msg: string = err?.response?.data?.message || "Verification failed. Please try again.";
      setError(msg);
      const match = msg.match(/(\d+) attempt/);
      setAttemptsRemaining(match ? parseInt(match[1], 10) : null);
      if (msg.toLowerCase().includes("locked") || msg.toLowerCase().includes("no attempts remaining")) {
        setLocked(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/recovery/reset", { challengeId, resetToken, newPassword });
      setStep("done");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not reset password. Please start over.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-white p-6">
      <div className="w-full max-w-[420px]">

        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-brand rounded-xl flex items-center justify-center">
            <LogoMark size={18} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">{BRAND.name}</span>
        </div>

        <div className="mb-6">
          <h1 className="text-[26px] font-extrabold text-gray-900 tracking-tight leading-tight">
            Recover your account
          </h1>
          <p className="text-gray-400 text-sm mt-1.5">
            {step === "email" && "Enter your email to get started."}
            {step === "questions" && "Answer the security questions below to verify it's you."}
            {step === "reset" && "Choose a new password for your account."}
            {step === "done" && "Your password has been reset."}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-red-50 border border-red-200 mb-4">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {step === "email" && (
          <form onSubmit={handleStart} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-800">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl text-sm font-bold tracking-wide bg-[#111827] text-white hover:bg-[#1f2937] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</> : "Continue"}
            </button>
          </form>
        )}

        {step === "questions" && (
          <form onSubmit={handleVerify} className="space-y-4">
            {questions.map((q) => (
              <div key={q.key} className="space-y-1.5">
                <label htmlFor={q.key} className="flex items-start gap-1.5 text-sm font-semibold text-gray-800">
                  <ShieldQuestion className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                  {q.label}
                </label>
                <input
                  id={q.key}
                  type="text"
                  required
                  value={answers[q.key] || ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
                  className={inputClass}
                />
              </div>
            ))}
            {!locked && (
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl text-sm font-bold tracking-wide bg-[#111827] text-white hover:bg-[#1f2937] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : "Verify answers"}
              </button>
            )}
            {attemptsRemaining !== null && attemptsRemaining > 0 && !locked && (
              <p className="text-xs text-amber-600 text-center">{attemptsRemaining} attempt{attemptsRemaining === 1 ? "" : "s"} remaining</p>
            )}
            {locked && (
              <p className="text-xs text-gray-500 text-center">
                Contact an administrator to unlock your account and reset your password.
              </p>
            )}
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-green-50 border border-green-200">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-600" />
              <span className="text-sm text-green-700">Identity verified. Set a new password below.</span>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-800">
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                required
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-800">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl text-sm font-bold tracking-wide bg-[#111827] text-white hover:bg-[#1f2937] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Reset password"}
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-green-50 border border-green-200">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-600" />
              <span className="text-sm text-green-700">Your password has been reset. You can now sign in.</span>
            </div>
            <button
              onClick={() => router.push("/login")}
              className="w-full h-11 rounded-xl text-sm font-bold tracking-wide bg-[#111827] text-white hover:bg-[#1f2937]"
            >
              Go to sign in
            </button>
          </div>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/login" className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
            Back to sign in
          </Link>
        </p>

      </div>
    </div>
  );
}
