"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, CheckCircle, XCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

// ── Password policy ──────────────────────────────────────────────────────────

interface PolicyRule {
  id: string;
  label: string;
  test: (pw: string) => boolean;
}

const POLICY: PolicyRule[] = [
  { id: "length",   label: "At least 8 characters",       test: (p) => p.length >= 8 },
  { id: "upper",    label: "At least one uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "lower",    label: "At least one lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "number",   label: "At least one number",          test: (p) => /[0-9]/.test(p) },
  { id: "special",  label: "At least one special character (@$!%*?&)", test: (p) => /[@$!%*?&#^()_+\-=]/.test(p) },
];

function policyPassed(pw: string) {
  return POLICY.every((r) => r.test(pw));
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [done, setDone]     = useState(false);

  const isMustChange = (user as any)?.mustChangePassword;
  const matchError = confirmPw && newPw !== confirmPw;
  const canSubmit  = currentPw && policyPassed(newPw) && newPw === confirmPw;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      await api.post("/auth/change-password", {
        currentPassword: currentPw,
        newPassword: newPw,
      });
      // Update local user to clear mustChangePassword flag
      if (user) setUser({ ...user, mustChangePassword: false } as any);
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to change password. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <h2 className="text-xl font-bold text-gray-900">Password Changed!</h2>
            <p className="text-gray-500 text-center">
              Your password has been updated successfully. Redirecting you now…
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="text-center space-y-2 pb-4">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-xl">
            {isMustChange ? "Password Change Required" : "Change Password"}
          </CardTitle>
          <CardDescription>
            {isMustChange
              ? "You must set a new password before continuing. Your current password is the temporary one provided by your administrator."
              : "Update your account password. Make sure it meets the security requirements below."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current password */}
            <div className="space-y-1.5">
              <Label htmlFor="current">Current Password <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="current"
                  type={showCurrent ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="pl-9 pr-10"
                  placeholder="Enter current password"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div className="space-y-1.5">
              <Label htmlFor="new">New Password <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="new"
                  type={showNew ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="pl-9 pr-10"
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Policy checklist */}
              {newPw && (
                <div className="mt-2 space-y-1 rounded-lg bg-gray-50 border border-gray-100 p-3">
                  {POLICY.map((rule) => {
                    const ok = rule.test(newPw);
                    return (
                      <div key={rule.id} className={`flex items-center gap-2 text-xs ${ok ? "text-green-700" : "text-gray-500"}`}>
                        {ok
                          ? <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                          : <XCircle   className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                        {rule.label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm New Password <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className={`pl-9 pr-10 ${matchError ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {matchError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Passwords do not match
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full gap-2 mt-2" disabled={!canSubmit || saving}>
              {saving ? "Updating…" : "Set New Password"}
            </Button>

            {!isMustChange && (
              <Button
                type="button"
                variant="ghost"
                className="w-full text-gray-500"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
