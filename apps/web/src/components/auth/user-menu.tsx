/**
 * User menu for authenticated users
 * Shows user info and sign out option
 */

"use client";

import { useState } from "react";
import { useSession, signOut } from "@/lib/auth-client";

export function UserMenu() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  // Don't show if not logged in
  if (!session?.user) {
    return null;
  }

  const user = session.user;
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    window.location.reload();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-2 transition hover:bg-slate-900"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-sm font-semibold text-white">
          {initials}
        </div>
        <div className="hidden text-left sm:block">
          <p className="text-sm font-medium text-white">{user.name || "User"}</p>
          <p className="text-xs text-slate-400">{user.email}</p>
        </div>
        <svg
          className={`h-4 w-4 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
            <div className="border-b border-slate-800 p-4">
              <p className="font-semibold text-white">{user.name || "User"}</p>
              <p className="mt-1 text-sm text-slate-400">{user.email}</p>
            </div>

            <div className="p-2">
              <div className="rounded-xl p-3 text-sm text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                    Authenticated
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Your mappings and history are saved to the database
                </p>
              </div>
            </div>

            <div className="border-t border-slate-800 p-2">
              <button
                onClick={handleSignOut}
                className="w-full rounded-xl px-4 py-2 text-left text-sm font-medium text-rose-400 transition hover:bg-rose-500/10"
              >
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
