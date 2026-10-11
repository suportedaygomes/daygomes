import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { SupportRequestForm } from "@/components/support/support-request-form";

export const metadata: Metadata = {
  title: "Suporte",
  description: "Peça ajuda à equipe Day Gomes.",
};

export default function SuportePublicPage() {
  return (
    <main className="safe-screen mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-8 py-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <Link href="/login">
          <Image
            src="/icons/icon-192.png"
            alt="Day Gomes"
            width={64}
            height={64}
            className="rounded-2xl"
          />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suporte</h1>
          <p className="mt-2 text-sm text-muted">
            Conte o que aconteceu. Nossa equipe responde por e-mail ou WhatsApp.
          </p>
        </div>
      </div>

      <SupportRequestForm mode="guest" />

      <p className="text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/login" className="text-purple hover:underline">
          Entrar
        </Link>
      </p>
    </main>
  );
}
