"use client";

import { FormEvent, useMemo, useState } from "react";
import { updateBirthDate } from "@/app/actions/profile";
import { createClient } from "@/lib/supabase/client";
import { formatCpf } from "@/lib/cpf";
import { ROLE_LABELS, type UserRole } from "@/lib/roles";

type ProfileSettingsFormProps = {
  email: string;
  fullName: string;
  cpf: string | null;
  role: UserRole;
  birthDate: string | null;
  avatarUrl: string | null;
};

export function ProfileSettingsForm({
  email,
  fullName,
  cpf,
  role,
  birthDate,
  avatarUrl,
}: ProfileSettingsFormProps) {
  const [birthDateValue, setBirthDateValue] = useState(birthDate ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [birthMessage, setBirthMessage] = useState("");
  const [birthError, setBirthError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [avatarMessage, setAvatarMessage] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [pendingBirth, setPendingBirth] = useState(false);
  const [pendingPassword, setPendingPassword] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState(false);
  const [preview, setPreview] = useState<string | null>(avatarUrl);

  const cpfLabel = useMemo(
    () => (cpf ? formatCpf(cpf) : "Não informado"),
    [cpf],
  );

  async function onBirthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBirthError("");
    setBirthMessage("");
    setPendingBirth(true);

    const result = await updateBirthDate(birthDateValue || null);
    if (!result.ok) {
      setBirthError(result.message);
    } else {
      setBirthMessage(result.message);
    }
    setPendingBirth(false);
  }

  async function onPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (password.length < 8) {
      setPasswordError("Use pelo menos 8 caracteres na nova senha.");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("As senhas não coincidem.");
      return;
    }

    setPendingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setPasswordError("Não foi possível alterar a senha.");
      setPendingPassword(false);
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setPasswordMessage("Senha atualizada com sucesso.");
    setPendingPassword(false);
  }

  async function onAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setAvatarError("");
    setAvatarMessage("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarError("Use JPG, PNG ou WebP.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("A imagem deve ter até 2 MB.");
      return;
    }

    setPendingAvatar(true);

    const formData = new FormData();
    formData.set("file", file);

    const response = await fetch("/api/profile/avatar", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; avatarUrl?: string; error?: string }
      | null;

    if (!response.ok || !payload?.ok || !payload.avatarUrl) {
      setAvatarError(payload?.error ?? "Não foi possível enviar a foto.");
      setPendingAvatar(false);
      return;
    }

    setPreview(payload.avatarUrl);
    setAvatarMessage("Foto de perfil atualizada.");
    setPendingAvatar(false);
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="panel-card">
        <h2 className="panel-title">Dados da conta</h2>
        <dl className="mt-4 grid gap-3 text-sm">
          <div>
            <dt className="text-muted">Nome</dt>
            <dd className="font-medium">{fullName}</dd>
          </div>
          <div>
            <dt className="text-muted">E-mail</dt>
            <dd className="font-medium">{email}</dd>
          </div>
          <div>
            <dt className="text-muted">CPF</dt>
            <dd className="font-medium">{cpfLabel}</dd>
          </div>
          <div>
            <dt className="text-muted">Tipo</dt>
            <dd className="font-medium">{ROLE_LABELS[role]}</dd>
          </div>
        </dl>
      </section>

      <section className="panel-card">
        <h2 className="panel-title">Foto de perfil</h2>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Sua foto de perfil"
              className="h-24 w-24 rounded-2xl object-cover"
            />
          ) : (
            <div className="grid h-24 w-24 place-items-center rounded-2xl border border-white/10 bg-field text-sm text-muted">
              Sem foto
            </div>
          )}
          <label className="btn-secondary cursor-pointer">
            {pendingAvatar ? "Enviando..." : "Escolher foto"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={pendingAvatar}
              onChange={onAvatarChange}
            />
          </label>
        </div>
        {avatarError ? <p role="alert" className="alert-error mt-3">{avatarError}</p> : null}
        {avatarMessage ? <p role="status" className="alert-success mt-3">{avatarMessage}</p> : null}
      </section>

      <section className="panel-card">
        <h2 className="panel-title">Data de nascimento</h2>
        <form onSubmit={onBirthSubmit} className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-2 text-sm font-medium">
            Data
            <input
              type="date"
              value={birthDateValue}
              onChange={(event) => setBirthDateValue(event.target.value)}
              className="field-input"
            />
          </label>
          <button type="submit" disabled={pendingBirth} className="btn-primary sm:min-w-40">
            {pendingBirth ? "Salvando..." : "Salvar data"}
          </button>
        </form>
        {birthError ? <p role="alert" className="alert-error mt-3">{birthError}</p> : null}
        {birthMessage ? <p role="status" className="alert-success mt-3">{birthMessage}</p> : null}
      </section>

      <section className="panel-card">
        <h2 className="panel-title">Alterar senha</h2>
        <form onSubmit={onPasswordSubmit} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Nova senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field-input"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Confirmar nova senha
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="field-input"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          {passwordError ? <p role="alert" className="alert-error">{passwordError}</p> : null}
          {passwordMessage ? <p role="status" className="alert-success">{passwordMessage}</p> : null}
          <button type="submit" disabled={pendingPassword} className="btn-primary">
            {pendingPassword ? "Salvando..." : "Atualizar senha"}
          </button>
        </form>
      </section>
    </div>
  );
}
