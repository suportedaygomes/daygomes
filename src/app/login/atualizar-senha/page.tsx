import type { Metadata } from "next";
import { UpdatePasswordForm } from "@/components/update-password-form";
import { SITE_DISPLAY_NAME } from "@/lib/legal/site";

export const metadata: Metadata = {
  title: "Nova senha",
  description: `Defina uma nova senha para sua conta ${SITE_DISPLAY_NAME}.`,
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
