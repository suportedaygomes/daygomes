import Image from "next/image";
import type { CorrectorDirectoryEntry } from "@/lib/corrector/directory";

type CorrectorDirectoryCardProps = {
  corrector: CorrectorDirectoryEntry;
  avatarUrl: string | null;
};

export function CorrectorDirectoryCard({
  corrector,
  avatarUrl,
}: CorrectorDirectoryCardProps) {
  return (
    <article className="panel-card">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={96}
            height={96}
            unoptimized
            className="h-24 w-24 shrink-0 rounded-2xl object-cover"
          />
        ) : (
          <div
            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-field text-3xl font-semibold text-purple"
            aria-hidden
          >
            {corrector.fullName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight">{corrector.fullName}</h2>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">E-mail</dt>
              <dd className="font-medium">
                {corrector.email ? (
                  <a href={`mailto:${corrector.email}`} className="text-purple hover:underline">
                    {corrector.email}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Idade</dt>
              <dd className="font-medium">
                {corrector.age != null ? `${corrector.age} anos` : "—"}
              </dd>
            </div>
          </dl>

          <div className="mt-4">
            <p className="text-sm text-muted">Descrição</p>
            {corrector.bio ? (
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{corrector.bio}</p>
            ) : (
              <p className="mt-1 text-sm text-muted">Ainda sem apresentação cadastrada.</p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
