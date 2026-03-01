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
      <div className="badge badge-neutral px-3 py-2 text-sm normal-case tracking-normal">
        Loading...
      </div>
    );
  }

  if (!session?.user) {
    return (
      <Link
        href="/sign-in"
        className="btn btn-secondary btn-sm"
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
        className="btn btn-secondary btn-sm"
      >
        Settings
      </Link>
      <div className="rounded-lg border theme-border theme-card px-3 py-2 text-sm font-medium theme-text">
        {displayName}
      </div>
      <button
        onClick={async () => {
          resetAllStores(); // Clear all store state before signing out
          await signOut();
          router.refresh();
        }}
        className="btn btn-danger btn-sm"
      >
        Sign out
      </button>
    </div>
  );
}
