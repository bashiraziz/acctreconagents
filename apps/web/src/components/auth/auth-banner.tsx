/**
 * Authentication banner for anonymous users
 * Shows "Sign in to save your work" prompt
 */

"use client";

import { useState } from "react";
import { useSession, signIn, signUp } from "@/lib/auth-client";

export function AuthBanner() {
  const { data: session } = useSession();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Don't show banner if user is logged in
  if (session?.user) {
    return null;
  }

  return (
    <>
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
              ⚠️
            </div>
            <div>
              <p className="font-semibold text-amber-100">
                Sign in to save your work
              </p>
              <p className="mt-1 text-sm text-amber-200/80">
                Your column mappings and reconciliation history will be lost when you close
                this tab. Sign in to sync across devices and save your preferences.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAuthModal(true)}
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-400"
          >
            Sign In
          </button>
        </div>
      </div>

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </>
  );
}

function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "signup") {
        await signUp.email({
          email,
          password,
          name,
        });
      } else {
        await signIn.email({
          email,
          password,
        });
      }

      // Success - close modal
      onClose();
      window.location.reload(); // Reload to sync with database
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">
            {mode === "signin" ? "Sign In" : "Create Account"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div>
              <label className="text-sm font-medium text-slate-300">
                Name
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/50 p-3 text-white focus:border-sky-400 focus:outline-none"
                  placeholder="Your name"
                />
              </label>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-300">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/50 p-3 text-white focus:border-sky-400 focus:outline-none"
                placeholder="you@example.com"
              />
            </label>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/50 p-3 text-white focus:border-sky-400 focus:outline-none"
                placeholder="••••••••"
              />
            </label>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-sky-500 px-4 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {loading
              ? "Loading..."
              : mode === "signin"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-sm text-sky-400 hover:text-sky-300"
          >
            {mode === "signin"
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
