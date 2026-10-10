import type { Metadata } from "next";
import { UpdatePasswordForm } from "@/components/update-password-form";

export const metadata: Metadata = {
  title: "Nova senha",
  description: "Defina uma nova senha para sua conta Day Gomes.",
};

export default function AtualizarSenhaPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <UpdatePasswordForm />
      </div>
    </main>
  );
}
