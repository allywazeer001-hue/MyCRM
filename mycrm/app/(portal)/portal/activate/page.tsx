"use client";
import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { usePortalAuthStore } from "@/store/portal-auth.store";
import { portalApi } from "@/lib/portal-api";
import { Eye, EyeOff, Loader2, Shield, Check, X } from "lucide-react";

interface PasswordPolicy {
  minPasswordLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
}

interface PolicyRule {
  label: string | ((policy: PasswordPolicy) => string);
  test: (pw: string, policy: PasswordPolicy) => boolean;
  active: (policy: PasswordPolicy) => boolean;
}

const RULES: PolicyRule[] = [
  {
    label: (p: PasswordPolicy) => `At least ${p.minPasswordLength} characters`,
    test: (pw: string, p: PasswordPolicy) => pw.length >= p.minPasswordLength,
    active: () => true,
  },
  {
    label: "One uppercase letter (A–Z)",
    test: (pw) => /[A-Z]/.test(pw),
    active: (p) => p.requireUppercase,
  },
  {
    label: "One lowercase letter (a–z)",
    test: (pw) => /[a-z]/.test(pw),
    active: (p) => p.requireLowercase,
  },
  {
    label: "One number (0–9)",
    test: (pw) => /[0-9]/.test(pw),
    active: (p) => p.requireNumber,
  },
  {
    label: "One special character",
    test: (pw) => /[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?]/.test(pw),
    active: (p) => p.requireSpecial,
  },
];

function strength(pw: string, policy: PasswordPolicy): number {
  const active = RULES.filter((r) => r.active(policy));
  const passed = active.filter((r) => r.test(pw, policy)).length;
  return active.length === 0 ? 0 : Math.round((passed / active.length) * 100);
}

function StrengthBar({ value }: { value: number }) {
  const color = value < 40 ? "bg-red-400" : value < 75 ? "bg-yellow-400" : "bg-green-400";
  const label = value < 40 ? "Weak" : value < 75 ? "Fair" : value < 100 ? "Good" : "Strong";
  return (
    <div className="space-y-1">
      <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-300`}
          style={{ width: `${value}%` }}
        />
      </div>
      {value > 0 && <p className={`text-xs ${color.replace("bg-", "text-")}`}>{label}</p>}
    </div>
  );
}

export default function ActivatePage() {
  const router = useRouter();
  const { requiresPasswordChange, changeToken, pendingUser, activate, isLoading, clearActivationState } =
    usePortalAuthStore();

  const [policy, setPolicy] = useState<PasswordPolicy>({
    minPasswordLength: 8, requireUppercase: true, requireLowercase: true,
    requireNumber: true, requireSpecial: false,
  });
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!requiresPasswordChange || !changeToken) {
      router.replace("/portal/login");
      return;
    }
    // Fetch password policy
    portalApi.get("/portal/auth/password-policy").then((r) => setPolicy(r.data)).catch(() => {});
  }, [requiresPasswordChange, changeToken, router]);

  const activeRules = RULES.filter((r) => r.active(policy));
  const pwStrength = strength(newPw, policy);
  const allRulesMet = activeRules.every((r) => r.test(newPw, policy));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!allRulesMet) {
      setError("Password does not meet the requirements listed below.");
      return;
    }
    if (newPw !== confirmPw) {
      setError("Passwords do not match.");
      return;
    }
    if (!changeToken) {
      setError("Session expired. Please sign in again.");
      return;
    }

    try {
      await activate(changeToken, newPw);
      router.replace("/portal/dashboard");
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (Array.isArray(msg)) setError(msg.join(". "));
      else setError(msg || "Failed to update password. Please try again.");
    }
  };

  if (!requiresPasswordChange) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-amber-300" />
          </div>
          <h1 className="text-2xl font-bold text-white text-center">Security Update Required</h1>
          <p className="text-indigo-300 text-sm mt-2 text-center max-w-xs">
            For security reasons, you must update your password before continuing.
          </p>
        </div>

        {/* User info */}
        {pendingUser && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-semibold text-white shrink-0">
              {pendingUser.firstName?.[0]}{pendingUser.lastName?.[0]}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{pendingUser.firstName} {pendingUser.lastName}</p>
              <p className="text-xs text-indigo-300">{pendingUser.email}</p>
            </div>
            <span className="ml-auto text-xs px-2 py-0.5 bg-amber-400/20 text-amber-300 rounded-full border border-amber-400/30 font-medium">
              Pending Activation
            </span>
          </div>
        )}

        {/* Form card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/20 border border-red-400/30 text-red-200 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            {/* New password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-indigo-200">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  required
                  placeholder="Create a strong password"
                  className="w-full px-4 py-2.5 pr-10 bg-white/10 border border-white/20 rounded-xl text-white placeholder-indigo-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-300 hover:text-white"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPw && <StrengthBar value={pwStrength} />}
            </div>

            {/* Confirm password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-indigo-200">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  required
                  placeholder="Repeat your new password"
                  className="w-full px-4 py-2.5 pr-10 bg-white/10 border border-white/20 rounded-xl text-white placeholder-indigo-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-300 hover:text-white"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPw && newPw !== confirmPw && (
                <p className="text-xs text-red-300">Passwords do not match</p>
              )}
              {confirmPw && newPw === confirmPw && (
                <p className="text-xs text-green-300">Passwords match</p>
              )}
            </div>

            {/* Password requirements */}
            <div className="bg-white/5 rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium text-indigo-300 uppercase tracking-wide mb-2">Password Requirements</p>
              {activeRules.map((rule, i) => {
                const met = newPw ? rule.test(newPw, policy) : false;
                const label = typeof rule.label === "function" ? rule.label(policy) : rule.label;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      met ? "bg-green-400/30 text-green-300" : newPw ? "bg-red-400/30 text-red-300" : "bg-white/10 text-white/30"
                    }`}>
                      {met ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                    </div>
                    <span className={`text-xs ${
                      met ? "text-green-300" : newPw ? "text-red-300" : "text-indigo-400"
                    }`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={isLoading || !allRulesMet || newPw !== confirmPw}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors text-sm"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Activate Account & Continue
            </button>
          </form>

          <button
            onClick={() => { clearActivationState(); router.replace("/portal/login"); }}
            className="mt-4 w-full text-center text-xs text-indigo-400 hover:text-indigo-200 transition-colors"
          >
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
