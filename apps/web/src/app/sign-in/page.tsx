"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signUp, useSession } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (session?.user) {
      router.push("/");
    }
  }, [session?.user, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "sign-in") {
        const { error: signInError } = await signIn.email({
          email: form.email,
          password: form.password,
          rememberMe: true,
        });
        if (signInError) {
          setError(signInError.message || "Invalid email or password. Please try again.");
          setIsSubmitting(false);
          return;
        }
      } else {
        const { error: signUpError } = await signUp.email({
          name: form.name,
          email: form.email,
          password: form.password,
        });
        if (signUpError) {
          setError(signUpError.message || "Failed to create account. Please try again.");
          setIsSubmitting(false);
          return;
        }
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Authentication error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Authentication failed. Please check your credentials and try again."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen theme-bg">
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
        <header className="theme-card theme-border border-b p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-300">
            Account Access
          </p>
          <h1 className="mt-2 text-3xl font-semibold theme-text">
            {mode === "sign-in" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm theme-text-muted">
            Sign in to save mappings across sessions and double your rate limits.
          </p>
        </header>

        <section className="rounded-3xl border theme-border bg-slate-950/60 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "sign-up" && (
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Name
                </span>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
                  placeholder="Your name"
                />
              </label>
            )}
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Email
              </span>
              <input
                type="email"
                required
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
                placeholder="you@company.com"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Password
              </span>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, password: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
                placeholder="********"
              />
            </label>

            {error && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              {isSubmitting
                ? "Please wait..."
                : mode === "sign-in"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <div className="mt-4 flex flex-col items-center gap-3 text-sm text-slate-400">
            {mode === "sign-in" ? (
              <Link href="/reset-password" className="font-semibold text-sky-300 hover:text-sky-200">
                Forgot your password?
              </Link>
            ) : null}
            {mode === "sign-in" ? (
              <button
                type="button"
                onClick={() => setMode("sign-up")}
                className="font-semibold text-sky-300 hover:text-sky-200"
              >
                Don&apos;t have an account? Sign up
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode("sign-in")}
                className="font-semibold text-sky-300 hover:text-sky-200"
              >
                Already have an account? Sign in
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
