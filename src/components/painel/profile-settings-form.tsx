"use client";

import { FormEvent, useMemo, useState } from "react";
import { updateBirthDate, updateProfileBio, updateWhatsapp } from "@/app/actions/profile";
import { formatWhatsappDisplay } from "@/lib/support/validate";
import { createClient } from "@/lib/supabase/client";
import { formatCpf } from "@/lib/cpf";
import { ROLE_LABELS, type UserRole } from "@/lib/roles";

type ProfileSettingsFormProps = {
  email: string;
  fullName: string;
  cpf: string | null;
  role: UserRole;
  birthDate: string | null;
  whatsapp: string | null;
  bio: string | null;
  avatarUrl: string | null;
};

export function ProfileSettingsForm({
  email,
  fullName,
  cpf,
  role,
  birthDate,
  whatsapp,
  bio,
  avatarUrl,
}: ProfileSettingsFormProps) {
  const isMember = role === "membro";
  const isStaff = role === "corretor" || role === "admin";
  const [birthDateValue, setBirthDateValue] = useState(birthDate ?? "");
  const [whatsappValue, setWhatsappValue] = useState(whatsapp ? formatWhatsappDisplay(whatsapp) : "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [birthMessage, setBirthMessage] = useState("");
  const [birthError, setBirthError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [avatarMessage, setAvatarMessage] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [whatsappError, setWhatsappError] = useState("");
  const [bioValue, setBioValue] = useState(bio ?? "");
  const [bioMessage, setBioMessage] = useState("");
  const [bioError, setBioError] = useState("");
  const [pendingBio, setPendingBio] = useState(false);
  const [pendingWhatsapp, setPendingWhatsapp] = useState(false);
  const [pendingBirth, setPendingBirth] = useState(false);
  const [pendingPassword, setPendingPassword] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState(false);
  const [preview, setPreview] = useState<string | null>(avatarUrl);

  const cpfLabel = useMemo(
    () => (cpf ? formatCpf(cpf) : "Não informado"),
    [cpf],
  );

  async function onBioSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBioError("");
    setBioMessage("");
    setPendingBio(true);

    const result = await updateProfileBio(bioValue);
    if (!result.ok) {
      setBioError(result.message);
    } else {
      setBioMessage(result.message);
    }
    setPendingBio(false);
  }

  async function onWhatsappSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWhatsappError("");
    setWhatsappMessage("");
    setPendingWhatsapp(true);

    const result = await updateWhatsapp(whatsappValue);
    if (!result.ok) {
      setWhatsappError(result.message);
    } else {
      setWhatsappMessage(result.message);
    }
    setPendingWhatsapp(false);
  }

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
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <section className="panel-card h-full">
        <h2 className="panel-title">Dados da conta</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
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
        {isStaff ? (
          <p className="mt-2 text-sm text-muted">
            Sua foto aparece na correção e na página &quot;Corretores&quot; do painel dos alunos.
          </p>
        ) : null}
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
      </div>

      {isStaff ? (
        <section className="panel-card">
          <h2 className="panel-title">Apresentação profissional</h2>
          <p className="mt-2 text-sm text-muted">
            Formação, experiência e especialidades. Os alunos veem isso na correção e em
            Corretores.
          </p>
          <form onSubmit={onBioSubmit} className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Sobre você
              <textarea
                className="field-input min-h-36 resize-y py-3"
                value={bioValue}
                onChange={(event) => setBioValue(event.target.value)}
                placeholder="Ex.: Pedagoga, especialista em redação para concursos há 10 anos..."
                maxLength={2000}
              />
            </label>
            <p className="text-xs text-muted">{bioValue.length}/2000 caracteres</p>
            {bioError ? <p role="alert" className="alert-error">{bioError}</p> : null}
            {bioMessage ? <p role="status" className="alert-success">{bioMessage}</p> : null}
            <button type="submit" disabled={pendingBio} className="btn-primary btn-sm w-fit">
              {pendingBio ? "Salvando..." : "Salvar apresentação"}
            </button>
          </form>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      {isMember ? (
      <section className="panel-card h-full">
        <h2 className="panel-title">WhatsApp</h2>
        <p className="mt-2 text-sm text-muted">
          Usado no suporte e para contato da equipe sobre seus envios.
        </p>
        <form onSubmit={onWhatsappSubmit} className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-2 text-sm font-medium">
            Número com DDD
            <input
              type="tel"
              value={whatsappValue}
              onChange={(event) => setWhatsappValue(event.target.value)}
              className="field-input"
              placeholder="(11) 99999-9999"
            />
          </label>
          <button type="submit" disabled={pendingWhatsapp} className="btn-primary sm:min-w-40">
            {pendingWhatsapp ? "Salvando..." : "Salvar WhatsApp"}
          </button>
        </form>
        {whatsappError ? <p role="alert" className="alert-error mt-3">{whatsappError}</p> : null}
        {whatsappMessage ? <p role="status" className="alert-success mt-3">{whatsappMessage}</p> : null}
      </section>
      ) : null}

      {(isMember || isStaff) ? (
      <section className="panel-card h-full">
        <h2 className="panel-title">Data de nascimento</h2>
        {isStaff ? (
          <p className="mt-2 text-sm text-muted">
            Usada para exibir sua idade na página Corretores (visível só para alunos).
          </p>
        ) : null}
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
      ) : null}

      <section className={`panel-card h-full ${isStaff && !isMember ? "" : "lg:col-span-2"}`}>
        <h2 className="panel-title">Alterar senha</h2>
        <form onSubmit={onPasswordSubmit} className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
          {passwordError ? <p role="alert" className="alert-error">{passwordError}</p> : null}
          {passwordMessage ? <p role="status" className="alert-success">{passwordMessage}</p> : null}
          <button type="submit" disabled={pendingPassword} className="btn-primary w-fit">
            {pendingPassword ? "Salvando..." : "Atualizar senha"}
          </button>
        </form>
      </section>
      </div>
    </div>
  );
}
