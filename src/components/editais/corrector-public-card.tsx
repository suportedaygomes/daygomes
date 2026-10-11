import Image from "next/image";
import type { CorrectorPublicProfile } from "@/lib/corrector/public-profile";

type CorrectorPublicCardProps = {
  corrector: CorrectorPublicProfile;
  avatarUrl: string | null;
};

export function CorrectorPublicCard({ corrector, avatarUrl }: CorrectorPublicCardProps) {
  return (
    <section className="panel-card flex gap-4">
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt=""
          width={80}
          height={80}
          unoptimized
          className="h-20 w-20 shrink-0 rounded-2xl object-cover"
        />
      ) : (
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-field text-2xl font-semibold text-purple"
          aria-hidden
        >
          {corrector.fullName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Corrigido por
        </p>
        <p className="mt-1 text-lg font-semibold">{corrector.fullName}</p>
        {corrector.bio ? (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
            {corrector.bio}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">Equipe de correção Day Gomes</p>
        )}
      </div>
    </section>
  );
}
