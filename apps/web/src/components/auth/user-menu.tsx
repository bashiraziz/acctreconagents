"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { resetAllStores } from "@/store";

export function UserMenu() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // Note: syncWithDatabase() was removed per migration guide
  // Database syncing should be handled at the API layer, not in the store

  if (isPending) {
    return (
      <div className="rounded-lg border theme-border theme-card px-3 py-2 text-sm font-medium theme-text">
        Loading...
      </div>
    );
  }

  if (!session?.user) {
    return (
      <Link
        href="/sign-in"
        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
      >
        Sign in
      </Link>
    );
  }

  const displayName = session.user.name || session.user.email;

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/settings"
        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
      >
        Settings
      </Link>
      <div
        className="max-w-[160px] truncate rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100"
        title={displayName}
      >
        {displayName}
      </div>
      <button
        onClick={async () => {
          resetAllStores(); // Clear all store state before signing out
          await signOut();
          router.refresh();
        }}
        className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-medium dark:text-rose-100 text-rose-900 hover:bg-rose-500/20 transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
