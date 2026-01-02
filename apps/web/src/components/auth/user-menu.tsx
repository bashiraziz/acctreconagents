"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { signOut, useSession } from "@/lib/auth-client";
import { useReconciliationStore } from "@/store/reconciliationStore";

export function UserMenu() {
  const { data: session, isPending } = useSession();
  const syncWithDatabase = useReconciliationStore((state) => state.syncWithDatabase);
  const router = useRouter();

  useEffect(() => {
    if (session?.user) {
      void syncWithDatabase();
    }
  }, [session?.user?.id, syncWithDatabase]);

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
        className="rounded-lg border theme-border theme-card px-4 py-2 text-sm font-medium theme-text hover:theme-muted transition-colors"
      >
        Sign in
      </Link>
    );
  }

  const displayName = session.user.name || session.user.email;

  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg border theme-border theme-card px-3 py-2 text-sm font-medium theme-text">
        {displayName}
      </div>
      <button
        onClick={async () => {
          await signOut();
          router.refresh();
        }}
        className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-100 hover:bg-rose-500/20 transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
