"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";

type Organization = {
  id: string;
  name: string;
  isDefault: boolean;
  defaultMateriality?: number | null;
  defaultPrompt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function SettingsPage() {
  const { data: session, isPending } = useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [defaultsId, setDefaultsId] = useState<string | null>(null);
  const [defaultMateriality, setDefaultMateriality] = useState<number | "">("");
  const [defaultPrompt, setDefaultPrompt] = useState("");

  const defaultOrg = useMemo(
    () => organizations.find((org) => org.isDefault),
    [organizations]
  );

  useEffect(() => {
    if (!session?.user) return;
    void loadOrganizations();
  }, [session?.user]);

  const loadOrganizations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/user/organizations");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message ?? "Failed to load organizations");
      }
      setOrganizations(data.organizations ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load organizations");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/user/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message ?? "Failed to create organization");
      }
      setNewName("");
      await loadOrganizations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMakeDefault = async (orgId: string) => {
    setBusyId(orgId);
    setError(null);
    try {
      const response = await fetch(`/api/user/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ makeDefault: true }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message ?? "Failed to set default organization");
      }
      setOrganizations((prev) =>
        prev.map((org) =>
          org.id === orgId
            ? { ...org, isDefault: true }
            : { ...org, isDefault: false }
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set default organization");
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = (org: Organization) => {
    setEditingId(org.id);
    setEditingName(org.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const startDefaultsEdit = (org: Organization) => {
    setDefaultsId(org.id);
    setDefaultMateriality(
      typeof org.defaultMateriality === "number" ? org.defaultMateriality : ""
    );
    setDefaultPrompt(org.defaultPrompt ?? "");
  };

  const cancelDefaultsEdit = () => {
    setDefaultsId(null);
    setDefaultMateriality("");
    setDefaultPrompt("");
  };

  const saveDefaults = async () => {
    if (!defaultsId) return;
    setBusyId(defaultsId);
    setError(null);
    try {
      const response = await fetch(`/api/user/organizations/${defaultsId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultMateriality:
            defaultMateriality === "" ? null : Number(defaultMateriality),
          defaultPrompt: defaultPrompt.trim() || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message ?? "Failed to update defaults");
      }
      setOrganizations((prev) =>
        prev.map((org) => (org.id === defaultsId ? data.organization : org))
      );
      cancelDefaultsEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update defaults");
    } finally {
      setBusyId(null);
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const name = editingName.trim();
    if (!name) return;
    setBusyId(editingId);
    setError(null);
    try {
      const response = await fetch(`/api/user/organizations/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message ?? "Failed to rename organization");
      }
      setOrganizations((prev) =>
        prev.map((org) => (org.id === editingId ? data.organization : org))
      );
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename organization");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (orgId: string) => {
    setBusyId(orgId);
    setError(null);
    try {
      const response = await fetch(`/api/user/organizations/${orgId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message ?? "Failed to delete organization");
      }
      await loadOrganizations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete organization");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen theme-bg">
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <header className="theme-card theme-border rounded-3xl border p-6">
          <div className="flex flex-col gap-2">
            <Link
              href="/"
              className="text-sm font-medium text-amber-500 hover:text-amber-400"
            >
              ← Back to console
            </Link>
            <h1 className="text-2xl font-bold theme-text sm:text-3xl">
              Settings
            </h1>
            <p className="text-sm theme-text-muted">
              Manage organization names for report headers.
            </p>
          </div>
        </header>

        <section className="theme-card theme-border rounded-3xl border p-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold theme-text">
                Organization Names
              </h2>
              <p className="text-sm theme-text-muted">
                The default organization appears above the report title. Optional for anonymous users.
              </p>
            </div>

            {isPending && (
              <div className="text-sm theme-text-muted">Checking session…</div>
            )}

            {!isPending && !session?.user && (
              <div className="rounded-xl border theme-border theme-muted p-4 text-sm theme-text-muted">
                Sign in to manage organization names. Anonymous runs won’t show an organization header.
                <div className="mt-3">
                  <Link
                    href="/sign-in"
                    className="rounded-lg border theme-border theme-card px-3 py-2 text-sm font-medium theme-text transition-colors hover:theme-muted"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            )}

            {session?.user && (
              <>
                {error && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label className="text-xs font-medium uppercase theme-text-muted">
                      New organization name
                    </label>
                    <input
                      value={newName}
                      onChange={(event) => setNewName(event.target.value)}
                      className="mt-2 w-full rounded-xl border theme-border theme-card px-3 py-2 text-sm theme-text"
                      placeholder="e.g., Rowshni Holdings"
                    />
                  </div>
                  <button
                    onClick={handleCreate}
                    disabled={isSaving || !newName.trim()}
                    className="rounded-xl border border-amber-500/60 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Add organization"}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs theme-text-muted">
                  <span>
                    {loading
                      ? "Loading organizations..."
                      : `${organizations.length} organization${organizations.length === 1 ? "" : "s"}`}
                  </span>
                  {defaultOrg && (
                    <span className="rounded-full border theme-border theme-muted px-2 py-0.5">
                      Default: {defaultOrg.name}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {organizations.map((org) => (
                    <div
                      key={org.id}
                      className="rounded-2xl border theme-border theme-muted p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        {editingId === org.id ? (
                          <input
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            className="w-full rounded-lg border theme-border theme-card px-3 py-2 text-sm theme-text"
                          />
                        ) : (
                          <div className="text-base font-semibold theme-text">
                            {org.name}
                          </div>
                        )}
                        <div className="mt-1 text-xs theme-text-muted">
                          {org.isDefault ? "Default organization" : "Not default"}
                        </div>
                        <div className="mt-3 text-xs theme-text-muted">
                          <div>
                            Default materiality:{" "}
                            {typeof org.defaultMateriality === "number"
                              ? `$${org.defaultMateriality.toFixed(2)}`
                              : "Not set"}
                          </div>
                          <div className="mt-1">
                            Default prompt: {org.defaultPrompt?.trim() ? "Set" : "Not set"}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                          {editingId === org.id ? (
                            <>
                              <button
                                onClick={saveEdit}
                                disabled={busyId === org.id || !editingName.trim()}
                                className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-100 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="rounded-lg border theme-border theme-card px-3 py-1.5 text-xs font-medium theme-text"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              {!org.isDefault && (
                                <button
                                  onClick={() => handleMakeDefault(org.id)}
                                  disabled={busyId === org.id}
                                  className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-100 disabled:opacity-50"
                                >
                                  Set default
                                </button>
                              )}
                              <button
                                onClick={() => startEdit(org)}
                                className="rounded-lg border theme-border theme-card px-3 py-1.5 text-xs font-medium theme-text"
                              >
                                Rename
                              </button>
                              <button
                                onClick={() => startDefaultsEdit(org)}
                                className="rounded-lg border theme-border theme-card px-3 py-1.5 text-xs font-medium theme-text"
                              >
                                Defaults
                              </button>
                              <button
                                onClick={() => handleDelete(org.id)}
                                disabled={busyId === org.id}
                                className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-100 disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {defaultsId === org.id && (
                        <div className="mt-4 rounded-xl border theme-border theme-muted p-3">
                          <p className="text-xs font-semibold uppercase theme-text-muted">
                            Defaults for this organization
                          </p>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <label className="text-xs font-medium uppercase theme-text-muted">
                              Materiality Threshold
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={defaultMateriality}
                                onChange={(event) =>
                                  setDefaultMateriality(
                                    event.target.value === ""
                                      ? ""
                                      : Number(event.target.value)
                                  )
                                }
                                className="mt-2 w-full rounded-lg border theme-border theme-card px-3 py-2 text-sm theme-text"
                                placeholder="50"
                              />
                            </label>
                            <label className="text-xs font-medium uppercase theme-text-muted">
                              Default prompt
                              <textarea
                                value={defaultPrompt}
                                onChange={(event) => setDefaultPrompt(event.target.value)}
                                className="mt-2 w-full rounded-lg border theme-border theme-card px-3 py-2 text-sm theme-text"
                                rows={3}
                                placeholder="Reconcile accounts for month-end close"
                              />
                            </label>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              onClick={saveDefaults}
                              disabled={busyId === org.id}
                              className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-100 disabled:opacity-50"
                            >
                              Save defaults
                            </button>
                            <button
                              onClick={cancelDefaultsEdit}
                              className="rounded-lg border theme-border theme-card px-3 py-1.5 text-xs font-medium theme-text"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
