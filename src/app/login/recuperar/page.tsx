import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { SITE_DISPLAY_NAME } from "@/lib/legal/site";

export const metadata: Metadata = {
  title: "Recuperar senha",
  description: `Recupere o acesso à sua conta ${SITE_DISPLAY_NAME}.`,
};

export default function RecuperarSenhaPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
