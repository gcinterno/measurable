"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { useI18n } from "@/components/providers/LanguageProvider";
import { isAbortError, isAuthError } from "@/lib/api";
import { deleteAccount } from "@/lib/api/auth";
import { fetchCurrentUser } from "@/lib/api/me";
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

const LOGO_CROP_SIZE = 512;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("The file could not be read."));
    reader.readAsDataURL(file);
  });
}

function loadImageDimensions(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => reject(new Error("The image could not be loaded."));
    image.src = src;
  });
}

async function buildCroppedLogo(input: {
  src: string;
  width: number;
  height: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
}) {
  const image = new Image();
  image.src = input.src;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("The image could not be loaded."));
  });

  const canvas = document.createElement("canvas");
  canvas.width = LOGO_CROP_SIZE;
  canvas.height = LOGO_CROP_SIZE;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available.");
  }

  const minDimension = Math.min(input.width, input.height);
  const cropSize = minDimension / input.zoom;
  const maxX = Math.max(0, input.width - cropSize);
  const maxY = Math.max(0, input.height - cropSize);
  const sourceX = Math.min(Math.max(input.offsetX, 0), maxX);
  const sourceY = Math.min(Math.max(input.offsetY, 0), maxY);

  context.clearRect(0, 0, LOGO_CROP_SIZE, LOGO_CROP_SIZE);
  context.drawImage(
    image,
    sourceX,
    sourceY,
    cropSize,
    cropSize,
    0,
    0,
    LOGO_CROP_SIZE,
    LOGO_CROP_SIZE
  );

  return canvas.toDataURL("image/png");
}

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
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropSource, setCropSource] = useState("");
  const [cropSourceWidth, setCropSourceWidth] = useState(0);
  const [cropSourceHeight, setCropSourceHeight] = useState(0);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffsetX, setCropOffsetX] = useState(0);
  const [cropOffsetY, setCropOffsetY] = useState(0);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteReason, setDeleteReason] = useState<(typeof deletionReasons)[number] | "">("");
  const [deleteDetails, setDeleteDetails] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const cropDragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originOffsetX: number;
    originOffsetY: number;
  } | null>(null);

  const cropMinDimension = useMemo(
    () => Math.min(cropSourceWidth || 0, cropSourceHeight || 0),
    [cropSourceHeight, cropSourceWidth]
  );
  const cropVisibleSize = cropMinDimension > 0 ? cropMinDimension / cropZoom : 0;
  const cropMaxX = Math.max(0, cropSourceWidth - cropVisibleSize);
  const cropMaxY = Math.max(0, cropSourceHeight - cropVisibleSize);
  const cropPreviewScale = cropVisibleSize > 0 ? 240 / cropVisibleSize : 1;
  const cropPreviewImageStyle =
    cropSourceWidth > 0 && cropSourceHeight > 0
      ? {
          width: `${cropSourceWidth * cropPreviewScale}px`,
          height: `${cropSourceHeight * cropPreviewScale}px`,
          maxWidth: "none",
          transform: `translate(${-cropOffsetX * cropPreviewScale}px, ${-cropOffsetY * cropPreviewScale}px)`,
        }
      : undefined;

  function clampCropOffsets(nextOffsetX: number, nextOffsetY: number, nextZoom = cropZoom) {
    const nextVisibleSize = cropMinDimension > 0 ? cropMinDimension / nextZoom : 0;
    const nextMaxX = Math.max(0, cropSourceWidth - nextVisibleSize);
    const nextMaxY = Math.max(0, cropSourceHeight - nextVisibleSize);

    return {
      offsetX: Math.min(Math.max(nextOffsetX, 0), nextMaxX),
      offsetY: Math.min(Math.max(nextOffsetY, 0), nextMaxY),
    };
  }

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
        const localCachedLogoUrl =
          preferences.logoSource === "manual" ? preferences.logoDataUrl || "" : "";
        setWorkspace(currentWorkspace);
        setBrandNameDraft(currentWorkspace.name || preferences.brandName);
        setLogoUrlDraft(backendLogoUrl || localCachedLogoUrl || "");
        preferences.updatePreferences({
          brandName: currentWorkspace.name || preferences.brandName,
          displayName: currentWorkspace.name || preferences.displayName,
          logoDataUrl: backendLogoUrl || localCachedLogoUrl || "",
          logoSource: backendLogoUrl ? "workspace" : localCachedLogoUrl ? "manual" : "",
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

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const dimensions = await loadImageDimensions(dataUrl);
      const minDimension = Math.min(dimensions.width, dimensions.height);

      setCropSource(dataUrl);
      setCropSourceWidth(dimensions.width);
      setCropSourceHeight(dimensions.height);
      setCropZoom(1);
      setCropOffsetX(Math.max(0, (dimensions.width - minDimension) / 2));
      setCropOffsetY(Math.max(0, (dimensions.height - minDimension) / 2));
      setCropModalOpen(true);
      setSaved("");
      event.target.value = "";
    } catch (error) {
      console.error("settings logo file error:", error);
    }
  }

  async function handleApplyLogoCrop() {
    if (!cropSource || !cropSourceWidth || !cropSourceHeight) {
      return;
    }

    try {
      const dataUrl = await buildCroppedLogo({
        src: cropSource,
        width: cropSourceWidth,
        height: cropSourceHeight,
        zoom: cropZoom,
        offsetX: cropOffsetX,
        offsetY: cropOffsetY,
      });

      setLogoUrlDraft(dataUrl);
      preferences.updatePreferences({ logoDataUrl: dataUrl, logoSource: "manual" });
      setCropModalOpen(false);
      setSaved("");
    } catch (error) {
      console.error("settings logo crop error:", error);
      setSaved("");
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
      logoSource: logoUrlDraft ? "manual" : "",
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
        logoSource: updatedWorkspace.branding?.logoUrl ? "workspace" : "",
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
        className="grid max-w-full gap-6 overflow-x-hidden"
      >
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
            {messages.settings.setupBrand}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {messages.settings.brandAssets}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            {messages.settings.brandAssetsDescription}
          </p>

          <div className="mt-8">
            <div className="min-w-0 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
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
                            preferences.updatePreferences({
                              logoDataUrl: "",
                              logoSource: "",
                            });
                            setSaved("");

                            try {
                              setSavingWorkspace(true);
                              const updatedUser = await updateCurrentUser({ logoUrl: null });
                              setUser(updatedUser);
                              setLogoUrlDraft(updatedUser.branding?.logoUrl || "");
                              preferences.updatePreferences({
                                logoDataUrl: updatedUser.branding?.logoUrl || "",
                                logoSource: updatedUser.branding?.logoUrl ? "manual" : "",
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
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
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

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
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
      {cropModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,17,31,0.52)] px-4 py-4 sm:px-6">
          <div className="w-full max-w-[720px] rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_22px_56px_rgba(15,23,42,0.22)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {messages.settings.adjustLogo}
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  {messages.settings.adjustLogoDescription}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div className="flex flex-col items-center rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <div
                  className="relative h-[240px] w-[240px] cursor-grab overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] active:cursor-grabbing"
                  onPointerDown={(event) => {
                    if (!cropSource) {
                      return;
                    }

                    cropDragStateRef.current = {
                      pointerId: event.pointerId,
                      startX: event.clientX,
                      startY: event.clientY,
                      originOffsetX: cropOffsetX,
                      originOffsetY: cropOffsetY,
                    };

                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    const dragState = cropDragStateRef.current;

                    if (!dragState || dragState.pointerId !== event.pointerId || !cropVisibleSize) {
                      return;
                    }

                    const deltaX = (event.clientX - dragState.startX) / cropPreviewScale;
                    const deltaY = (event.clientY - dragState.startY) / cropPreviewScale;
                    const nextOffsets = clampCropOffsets(
                      dragState.originOffsetX - deltaX,
                      dragState.originOffsetY - deltaY
                    );

                    setCropOffsetX(nextOffsets.offsetX);
                    setCropOffsetY(nextOffsets.offsetY);
                  }}
                  onPointerUp={(event) => {
                    if (cropDragStateRef.current?.pointerId === event.pointerId) {
                      cropDragStateRef.current = null;
                    }

                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                      event.currentTarget.releasePointerCapture(event.pointerId);
                    }
                  }}
                  onPointerCancel={(event) => {
                    if (cropDragStateRef.current?.pointerId === event.pointerId) {
                      cropDragStateRef.current = null;
                    }

                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                      event.currentTarget.releasePointerCapture(event.pointerId);
                    }
                  }}
                >
                  {cropSource ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cropSource}
                      alt="Logo crop preview"
                      className="absolute left-0 top-0 object-cover"
                      style={cropPreviewImageStyle}
                    />
                  ) : null}
                </div>
                <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                  Drag the logo to reposition it inside the crop area.
                </p>
              </div>

              <div className="space-y-5">
                <label className="block">
                  <span className="text-sm font-medium text-slate-950">
                    {messages.settings.zoom}
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={cropZoom}
                    onChange={(event) => {
                      const nextZoom = Number(event.target.value);
                      const currentVisibleSize = cropMinDimension / cropZoom;
                      const currentCenterX = cropOffsetX + currentVisibleSize / 2;
                      const currentCenterY = cropOffsetY + currentVisibleSize / 2;
                      const nextVisibleSize = cropMinDimension / nextZoom;
                      const nextOffsets = clampCropOffsets(
                        currentCenterX - nextVisibleSize / 2,
                        currentCenterY - nextVisibleSize / 2,
                        nextZoom
                      );
                      setCropZoom(nextZoom);
                      setCropOffsetX(nextOffsets.offsetX);
                      setCropOffsetY(nextOffsets.offsetY);
                    }}
                    className="mt-3 w-full accent-sky-600"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCropModalOpen(false)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                {messages.settings.cancel}
              </button>
              <button
                type="button"
                onClick={() => void handleApplyLogoCrop()}
                disabled={savingWorkspace}
                className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {messages.settings.applyLogo}
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
