"use client";

import { useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { usePreferencesStore } from "@/lib/store/preferences-store";

const timezoneOptions = [
  "America/Mexico_City",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
];

const languageOptions = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
];

export default function SettingsPage() {
  const preferences = usePreferencesStore();
  const [saved, setSaved] = useState("");

  async function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
      reader.readAsDataURL(file);
    });

    preferences.updatePreferences({ logoDataUrl: dataUrl });
    setSaved("");
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    preferences.updatePreferences({
      displayName: preferences.displayName.trim() || "Alex Lane",
    });
    setSaved("Cambios guardados.");
  }

  return (
    <AppShell>
      <form
        onSubmit={handleSave}
        className="grid gap-6"
      >
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
            Preferences
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Configuracion del espacio
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Personaliza el nombre visible, el logotipo, idioma, zona horaria y el modo visual de la plataforma.
          </p>

          <div className="mt-8 grid gap-6">
            <label className="block">
              <span className="text-sm font-medium text-slate-950">
                Nombre visible
              </span>
              <input
                type="text"
                value={preferences.displayName}
                onChange={(event) => {
                  preferences.updatePreferences({ displayName: event.target.value });
                  setSaved("");
                }}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="Nombre del usuario o equipo"
              />
            </label>

            <div>
              <span className="text-sm font-medium text-slate-950">
                Logotipo
              </span>
              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                  {preferences.logoDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preferences.logoDataUrl}
                      alt="Logo preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-slate-400">
                      Logo
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                    Subir logotipo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoChange}
                    />
                  </label>
                  {preferences.logoDataUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        preferences.updatePreferences({ logoDataUrl: "" });
                        setSaved("");
                      }}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Quitar logo
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-950">
                  Zona horaria
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
                  Idioma
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
                Apariencia
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
                    Modo claro
                  </p>
                  <p className="mt-2 text-sm leading-6 opacity-80">
                    Mantiene la interfaz luminosa actual.
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
                    Modo oscuro
                  </p>
                  <p className="mt-2 text-sm leading-6 opacity-80">
                    Aplica fondo oscuro y texto claro al contenido principal.
                  </p>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Guardar cambios
            </button>
            {saved ? (
              <p className="text-sm text-emerald-600">{saved}</p>
            ) : (
              <p className="text-sm text-slate-500">
                Los cambios se guardan localmente en esta sesion del navegador.
              </p>
            )}
          </div>
        </section>
      </form>
    </AppShell>
  );
}
