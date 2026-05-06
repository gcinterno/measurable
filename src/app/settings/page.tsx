"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { useI18n } from "@/components/providers/LanguageProvider";
import { isAbortError, isAuthError } from "@/lib/api";
import { deleteAccount } from "@/lib/api/auth";
import { fetchCurrentUser, updateCurrentUser } from "@/lib/api/me";
import { fetchWorkspace, updateWorkspace } from "@/lib/api/workspaces";
import { startLogoutInProgress } from "@/lib/auth/session";
import { useAuthStore } from "@/lib/store/auth-store";
import { usePreferencesStore } from "@/lib/store/preferences-store";
import { getActiveWorkspaceId } from "@/lib/workspace/session";
import type { User } from "@/types/auth";
import type { Workspace } from "@/types/workspace";

const timezoneOptions = [
  "America/Mexico_City",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
];

const languageOptions = [
  { value: "es", label: "Spanish" },
  { value: "en", label: "English" },
];

const deletionReasons = [
  "Too expensive",
  "Missing features",
  "Hard to use",
  "No longer needed",
  "Switching tools",
  "Privacy concerns",
  "Other",
] as const;

export default function SettingsPage() {
  const router = useRouter();
  const { messages } = useI18n();
  const preferences = usePreferencesStore();
  const logout = useAuthStore((state) => state.logout);
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [brandNameDraft, setBrandNameDraft] = useState(preferences.brandName);
  const [logoUrlDraft, setLogoUrlDraft] = useState(preferences.logoDataUrl);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [saved, setSaved] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteReason, setDeleteReason] = useState<(typeof deletionReasons)[number] | "">("");
  const [deleteDetails, setDeleteDetails] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadUser() {
      try {
        const currentUser = await fetchCurrentUser({ signal: controller.signal });

        if (!active) {
          return;
        }

        setUser(currentUser);
        const backendLogoUrl = currentUser.branding?.logoUrl || "";

        if (backendLogoUrl) {
          setLogoUrlDraft(backendLogoUrl);
          preferences.updatePreferences({ logoDataUrl: backendLogoUrl });
        }
      } catch (error) {
        if (!isAbortError(error) && !isAuthError(error)) {
          console.error("settings current user error:", error);
        }
      }
    }

    async function loadWorkspace() {
      const workspaceId = getActiveWorkspaceId();

      if (!workspaceId) {
        setLoadingWorkspace(false);
        return;
      }

      try {
        const currentWorkspace = await fetchWorkspace(workspaceId, {
          signal: controller.signal,
        });

        if (!active) {
          return;
        }

        const backendLogoUrl = currentWorkspace.branding?.logoUrl || "";
        const localCachedLogoUrl = preferences.logoDataUrl || "";
        setWorkspace(currentWorkspace);
        setBrandNameDraft(currentWorkspace.name || preferences.brandName);
        setLogoUrlDraft((current) => current || backendLogoUrl || localCachedLogoUrl || "");
        preferences.updatePreferences({
          brandName: currentWorkspace.name || preferences.brandName,
          displayName: currentWorkspace.name || preferences.displayName,
          logoDataUrl: backendLogoUrl || localCachedLogoUrl || "",
        });
      } catch (error) {
        if (!isAbortError(error) && !isAuthError(error)) {
          console.error("settings workspace error:", error);
        }
      } finally {
        if (active) {
          setLoadingWorkspace(false);
        }
      }
    }

    void Promise.all([loadUser(), loadWorkspace()]);

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  async function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("The file could not be read."));
      reader.readAsDataURL(file);
    });

    setLogoUrlDraft(dataUrl);
    preferences.updatePreferences({ logoDataUrl: dataUrl });
    setSaved("");

    const workspaceId = getActiveWorkspaceId();

    try {
      setSavingWorkspace(true);
      const updatedUser = await updateCurrentUser({ logoUrl: dataUrl });
      setUser(updatedUser);
      setLogoUrlDraft(updatedUser.branding?.logoUrl || dataUrl);
      preferences.updatePreferences({
        logoDataUrl: updatedUser.branding?.logoUrl || dataUrl,
      });
      setSaved(messages.settings.changesSaved);
    } catch (error) {
      if (!isAbortError(error) && !isAuthError(error)) {
        console.error("settings logo upload error:", error);
      }
      setSaved("");
    } finally {
      setSavingWorkspace(false);
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const workspaceId = getActiveWorkspaceId();
    const nextBrandName = brandNameDraft.trim() || "Measurable";

    preferences.updatePreferences({
      brandName: nextBrandName,
      displayName: nextBrandName,
      logoDataUrl: logoUrlDraft,
    });

    if (!workspaceId) {
      setSaved(messages.settings.changesSaved);
      return;
    }

    try {
      setSavingWorkspace(true);
      const updatedWorkspace = await updateWorkspace(workspaceId, {
        name: nextBrandName,
        logoUrl: logoUrlDraft || null,
      });

      setWorkspace(updatedWorkspace);
      setBrandNameDraft(updatedWorkspace.name || nextBrandName);
      setLogoUrlDraft(updatedWorkspace.branding?.logoUrl || "");
      preferences.updatePreferences({
        brandName: updatedWorkspace.name || nextBrandName,
        displayName: updatedWorkspace.name || nextBrandName,
        logoDataUrl: updatedWorkspace.branding?.logoUrl || "",
      });
      setSaved(messages.settings.changesSaved);
    } catch (error) {
      if (!isAbortError(error) && !isAuthError(error)) {
        console.error("settings workspace update error:", error);
      }
      setSaved("");
    } finally {
      setSavingWorkspace(false);
    }
  }

  function openDeleteModal() {
    setDeleteModalOpen(true);
    setDeleteStep(1);
    setDeleteReason("");
    setDeleteDetails("");
    setDeleteConfirmation("");
    setDeleteError("");
  }

  function closeDeleteModal() {
    if (deleteSubmitting) {
      return;
    }

    setDeleteModalOpen(false);
    setDeleteStep(1);
    setDeleteError("");
    setDeleteConfirmation("");
  }

  async function handleDeleteAccount() {
    if (!deleteReason || deleteConfirmation !== "Eliminar") {
      return;
    }

    setDeleteSubmitting(true);
    setDeleteError("");

    try {
      await deleteAccount({
        reason: deleteReason,
        details: deleteDetails.trim(),
        confirmation: "Eliminar",
      });

      startLogoutInProgress();
      logout();
      router.replace("/login?accountDeleted=1");
    } catch {
      setDeleteError("We could not delete your account right now. Please try again.");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  return (
    <AppShell>
      <>
      <form
        onSubmit={handleSave}
        className="grid gap-6"
      >
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
            {messages.settings.setupBrand}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {messages.settings.brandAssets}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            {messages.settings.brandAssetsDescription}
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <label className="block">
                <span className="text-sm font-medium text-slate-950">
                  {messages.settings.brandName}
                </span>
                <input
                  type="text"
                  value={brandNameDraft}
                  onChange={(event) => {
                    setBrandNameDraft(event.target.value);
                    setSaved("");
                  }}
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  placeholder={messages.settings.brandNamePlaceholder}
                />
              </label>

              <div className="mt-6">
                <span className="text-sm font-medium text-slate-950">
                  {messages.settings.brandLogo}
                </span>
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[28px] border border-slate-200 bg-white">
                    {logoUrlDraft ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoUrlDraft}
                        alt="Brand logo preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-slate-400">
                        {messages.settings.logoPlaceholder}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm leading-6 text-slate-500">
                      {messages.settings.logoRecommendation}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                        {messages.settings.uploadLogo}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoChange}
                        />
                      </label>
                      {logoUrlDraft ? (
                        <button
                          type="button"
                          onClick={async () => {
                            setLogoUrlDraft("");
                            preferences.updatePreferences({ logoDataUrl: "" });
                            setSaved("");

                            try {
                              setSavingWorkspace(true);
                              const updatedUser = await updateCurrentUser({ logoUrl: null });
                              setUser(updatedUser);
                              setLogoUrlDraft(updatedUser.branding?.logoUrl || "");
                              preferences.updatePreferences({
                                logoDataUrl: updatedUser.branding?.logoUrl || "",
                              });
                              setSaved(messages.settings.changesSaved);
                            } catch (error) {
                              if (!isAbortError(error) && !isAuthError(error)) {
                                console.error("settings logo remove error:", error);
                              }
                              setSaved("");
                            } finally {
                              setSavingWorkspace(false);
                            }
                          }}
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          {messages.settings.removeLogo}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] p-6 text-white shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">
                {messages.settings.brandPreview}
              </p>
              <div className="mt-6 overflow-hidden rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_35%),linear-gradient(145deg,#07111f_0%,#0f172a_52%,#111827_100%)] p-6 shadow-[0_18px_40px_rgba(2,6,23,0.45)]">
                <div className="flex items-start justify-between gap-6">
                  <div className="max-w-[16rem]">
                    <p className="text-[0.72rem] font-medium uppercase tracking-[0.28em] text-sky-300">
                      Report preview
                    </p>
                    <h3 className="mt-4 text-[2rem] font-semibold leading-[0.95] tracking-[-0.05em] text-white">
                      Reporte resultados EJEMPLO
                    </h3>
                    <div className="mt-4 h-px w-20 bg-gradient-to-r from-sky-300 via-white/70 to-transparent" />
                    <p className="mt-4 text-sm leading-6 text-slate-300">
                      Asi se vera tu logotipo en la portada del reporte.
                    </p>
                    <p className="mt-4 text-[0.72rem] font-medium uppercase tracking-[0.22em] text-sky-300">
                      {brandNameDraft || "Measurable"}
                    </p>
                  </div>

                  <div className="flex min-h-[220px] flex-1 items-center justify-end">
                    {logoUrlDraft ? (
                      <div className="flex max-w-[260px] items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={logoUrlDraft}
                          alt="Brand logo report preview"
                          className="max-h-[220px] w-auto object-contain object-right"
                        />
                      </div>
                    ) : (
                      <div className="flex h-[220px] w-[220px] items-center justify-center rounded-[28px] border border-dashed border-white/15 bg-white/5 text-center">
                        <p className="max-w-[140px] text-sm font-medium leading-6 text-slate-300">
                          {messages.settings.logoPlaceholder}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
            {messages.settings.profile}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {messages.settings.profileInformation}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            {messages.settings.profileInformationDescription}
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-950">
                {messages.settings.officialEmail}
              </span>
              <input
                type="text"
                readOnly
                value={user?.email || messages.settings.notAvailable}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-950">
                {messages.settings.officialPhone}
              </span>
              <input
                type="text"
                readOnly
                value={user?.phone || messages.settings.notAvailable}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-950">
                {messages.settings.userName}
              </span>
              <input
                type="text"
                readOnly
                value={user?.name || messages.settings.notAvailable}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
              />
            </label>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
            {messages.settings.preferences}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {messages.settings.workspaceSettings}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            {messages.settings.workspaceSettingsDescription}
          </p>

          <div className="mt-8 grid gap-6">
            <div className="grid gap-6 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-950">
                  {messages.settings.timezone}
                </span>
                <select
                  value={preferences.timezone}
                  onChange={(event) => {
                    preferences.updatePreferences({ timezone: event.target.value });
                    setSaved("");
                  }}
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                >
                  {timezoneOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-950">
                  {messages.settings.language}
                </span>
                <select
                  value={preferences.language}
                  onChange={(event) => {
                    preferences.updatePreferences({ language: event.target.value });
                    setSaved("");
                  }}
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                >
                  {languageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <span className="text-sm font-medium text-slate-950">
                {messages.settings.appearance}
              </span>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <button
                    type="button"
                    onClick={() => {
                    preferences.updatePreferences({ theme: "light" });
                    setSaved("");
                  }}
                  className={`rounded-[24px] border px-5 py-5 text-left transition ${
                    preferences.theme === "light"
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-950 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.18em]">
                    {messages.settings.lightMode}
                  </p>
                  <p className="mt-2 text-sm leading-6 opacity-80">
                    {messages.settings.lightModeDescription}
                  </p>
                </button>
                <button
                    type="button"
                    onClick={() => {
                    preferences.updatePreferences({ theme: "dark" });
                    setSaved("");
                  }}
                  className={`rounded-[24px] border px-5 py-5 text-left transition ${
                    preferences.theme === "dark"
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-950 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.18em]">
                    {messages.settings.darkMode}
                  </p>
                  <p className="mt-2 text-sm leading-6 opacity-80">
                    {messages.settings.darkModeDescription}
                  </p>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={savingWorkspace || loadingWorkspace}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {savingWorkspace ? "Saving..." : messages.settings.saveChanges}
            </button>
            {saved ? (
              <p className="text-sm text-emerald-600">{saved}</p>
            ) : (
              <p className="text-sm text-slate-500">
                {messages.settings.localSessionSave}
              </p>
            )}
          </div>
        </section>

        <div className="flex justify-center pt-2 sm:justify-start">
          <button
            type="button"
            onClick={openDeleteModal}
            className="inline-flex items-center justify-center rounded-[16px] border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-500/15"
          >
            Eliminar cuenta
          </button>
        </div>
      </form>
      {deleteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,17,31,0.52)] px-4 py-4 sm:px-6">
          <div className="w-[calc(100%-32px)] max-w-[420px] max-h-[85vh] overflow-y-auto rounded-[16px] border border-[var(--border-soft)] bg-white p-5 shadow-[0_18px_48px_rgba(7,17,31,0.18)] sm:p-6">
            {deleteStep === 1 ? (
              <>
                <h3 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                  Eliminar cuenta
                </h3>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  Permanently delete your Measurable account, reports, integrations, and saved settings. This action cannot be undone.
                </p>
                <p className="mt-5 text-sm font-medium text-[var(--text-primary)]">
                  Why are you deleting your account?
                </p>
                <div className="mt-4 space-y-2.5">
                  {deletionReasons.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => {
                        setDeleteReason(reason);
                        setDeleteError("");
                      }}
                      className={`w-full rounded-[14px] border px-3.5 py-3 text-left transition ${
                        deleteReason === reason
                          ? "border-[var(--measurable-blue)] bg-[rgba(23,73,255,0.05)]"
                          : "border-[var(--border-soft)] bg-white hover:border-[var(--border-blue-soft)] hover:bg-[var(--surface-soft)]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {reason}
                        </span>
                        <span
                          className={`flex h-4.5 w-4.5 shrink-0 rounded-full border ${
                            deleteReason === reason
                              ? "border-[var(--measurable-blue)] bg-[var(--measurable-blue)]"
                              : "border-[var(--border-soft)] bg-white"
                          }`}
                        />
                      </div>
                    </button>
                  ))}
                </div>

                <label className="mt-5 block">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    Optional feedback
                  </span>
                  <textarea
                    value={deleteDetails}
                    onChange={(event) => setDeleteDetails(event.target.value)}
                    rows={3}
                    className="brand-input mt-3 w-full px-4 py-3"
                    placeholder="Optional feedback"
                  />
                </label>

                {deleteError ? (
                  <p className="mt-4 text-sm text-red-600">{deleteError}</p>
                ) : null}

                <div className="mt-6 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    className="rounded-[16px] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm font-semibold text-[var(--navy-900)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!deleteReason}
                    onClick={() => setDeleteStep(2)}
                    className="rounded-[16px] bg-[var(--measurable-blue)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--measurable-blue-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                  Confirm deletion
                </h3>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  Type <span className="font-semibold text-red-600">Eliminar</span> to permanently delete your account.
                </p>

                <label className="mt-5 block">
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(event) => {
                      setDeleteConfirmation(event.target.value);
                      setDeleteError("");
                    }}
                    className="brand-input mt-3 w-full px-4 py-3"
                    placeholder="Eliminar"
                  />
                </label>

                {deleteError ? (
                  <p className="mt-4 text-sm text-red-600">{deleteError}</p>
                ) : null}

                <div className="mt-6 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={deleteSubmitting}
                    onClick={() => {
                      setDeleteStep(1);
                      setDeleteError("");
                    }}
                    className="rounded-[16px] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm font-semibold text-[var(--navy-900)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={deleteSubmitting || deleteConfirmation !== "Eliminar"}
                    onClick={() => void handleDeleteAccount()}
                    className="rounded-[16px] bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deleteSubmitting ? "Deleting..." : "Permanently delete"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
      </>
    </AppShell>
  );
}
