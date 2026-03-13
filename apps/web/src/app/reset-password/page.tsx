"use client";

export const dynamic = "force-dynamic";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { requestPasswordReset, resetPassword } from "@/lib/auth-client";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const errorParam = searchParams.get("error");
  const isResetMode = Boolean(token);

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"info" | "success" | "error">("info");

  const messageAlertClass =
    messageTone === "error"
      ? "alert alert-danger"
      : messageTone === "success"
        ? "alert alert-success"
        : "alert alert-info";

  const handleRequestReset = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("submitting");
    setMessage(null);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await requestPasswordReset({ email, redirectTo });
      if (error) {
        setMessage(error.message || "Unable to request a reset link. Please try again.");
        setMessageTone("error");
        setStatus("idle");
        return;
      }
      setMessage("If the email is registered, a reset link has been sent.");
      setMessageTone("success");
      setStatus("success");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Unable to request a reset link. Please try again."
      );
      setMessageTone("error");
      setStatus("idle");
    }
  };

  const handleResetPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      setMessageTone("error");
      return;
    }

    setStatus("submitting");
    setMessage(null);

    try {
      const { error } = await resetPassword({ token, newPassword });
      if (error) {
        setMessage(error.message || "Unable to reset password. Please try again.");
        setMessageTone("error");
        setStatus("idle");
        return;
      }
      setMessage("Password updated. You can now sign in.");
      setMessageTone("success");
      setStatus("success");
      router.push("/sign-in");
      router.refresh();
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Unable to reset password. Please try again."
      );
      setMessageTone("error");
      setStatus("idle");
    }
  };

  return (
    <div className="min-h-screen theme-bg">
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
        <header className="theme-card theme-border border-b p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] theme-text-muted">
            Account Access
          </p>
          <h1 className="mt-2 text-3xl font-semibold theme-text">
            {isResetMode ? "Set a new password" : "Reset your password"}
          </h1>
          <p className="mt-2 text-sm theme-text-muted">
            {isResetMode
              ? "Choose a new password for your account."
              : "We will email a reset link to the address on file."}
          </p>
        </header>

        <section className="rounded-3xl border theme-border theme-card p-6">
          {errorParam ? (
            <div className="alert alert-danger text-sm">
              Reset link is invalid or expired. Please request a new link.
            </div>
          ) : null}

          {isResetMode ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] theme-text-muted">
                  New password
                </span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="mt-2 w-full rounded-xl border theme-border theme-muted px-3 py-2 text-sm theme-text focus:outline-none"
                  placeholder="********"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] theme-text-muted">
                  Confirm password
                </span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-2 w-full rounded-xl border theme-border theme-muted px-3 py-2 text-sm theme-text focus:outline-none"
                  placeholder="********"
                />
              </label>

              {message && (
                <div className={`${messageAlertClass} text-sm`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="btn btn-primary btn-md w-full disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status === "submitting" ? "Updating..." : "Update password"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] theme-text-muted">
                  Email
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-xl border theme-border theme-muted px-3 py-2 text-sm theme-text focus:outline-none"
                  placeholder="you@company.com"
                />
              </label>

              {message && (
                <div className={`${messageAlertClass} text-sm`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="btn btn-primary btn-md w-full disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status === "submitting" ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}

          <div className="mt-4 text-center text-sm theme-text-muted">
            <BackButton href="/sign-in" label="Back to sign in" />
          </div>
        </section>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen theme-bg" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
