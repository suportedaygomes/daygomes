import Link from "next/link";

export function LegalFooterLinks({ className = "" }: { className?: string }) {
  return (
    <nav
      className={`flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted ${className}`}
      aria-label="Documentos legais"
    >
      <Link href="/termos" className="hover:text-purple hover:underline">
        Termos de Uso
      </Link>
      <Link href="/privacidade" className="hover:text-purple hover:underline">
        Privacidade
      </Link>
      <Link href="/cookies" className="hover:text-purple hover:underline">
        Cookies
      </Link>
    </nav>
  );
}
