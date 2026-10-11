import Image from "next/image";

type CorrectorPublicInlineProps = {
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
};

export function CorrectorPublicInline({
  fullName,
  avatarUrl,
  bio,
}: CorrectorPublicInlineProps) {
  return (
    <div className="mt-3 flex gap-3 border-t border-white/10 pt-3">
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt=""
          width={48}
          height={48}
          unoptimized
          className="h-12 w-12 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-field text-sm font-semibold text-purple"
          aria-hidden
        >
          {fullName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Corrigido por
        </p>
        <p className="font-medium">{fullName}</p>
        {bio ? (
          <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted">{bio}</p>
        ) : null}
      </div>
    </div>
  );
}
