import { escapeHtml } from "@/lib/email/escape-html";
import { SITE_DISPLAY_NAME } from "@/lib/legal/site";

const DEFAULT_SITE = "https://daygomes.com.br";
/** Logo para e-mail (`public/logonova-email.png`, gerada por scripts/prepare-email-logo.mjs). */
const EMAIL_LOGO_FILE = "logonova-email.png";
/** Dimensões de `logonova-email.png` (após `prepare-email-logo.mjs`). */
const EMAIL_LOGO_NATURAL_WIDTH = 2024;
const EMAIL_LOGO_NATURAL_HEIGHT = 825;
/** Largura de exibição (~22rem do login); a URL serve o PNG em resolução cheia. */
const EMAIL_LOGO_DISPLAY_WIDTH = 336;
const EMAIL_LOGO_DISPLAY_HEIGHT = Math.round(
  (EMAIL_LOGO_DISPLAY_WIDTH * EMAIL_LOGO_NATURAL_HEIGHT) / EMAIL_LOGO_NATURAL_WIDTH,
);

const EMAIL_PAGE_BG = "#07070a";
const EMAIL_CARD_BG = "#16161c";

export function transactionalLogoUrl(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? DEFAULT_SITE;
  return `${site}/${EMAIL_LOGO_FILE}`;
}

/** Marcação da logo para clientes de e-mail (Resend, etc.). */
export function transactionalEmailLogoImg(): string {
  const logoUrl = transactionalLogoUrl();
  const w = EMAIL_LOGO_DISPLAY_WIDTH;
  const h = EMAIL_LOGO_DISPLAY_HEIGHT;
  const img = `<img src="${escapeHtml(logoUrl)}" width="${w}" height="${h}" alt="${escapeHtml(SITE_DISPLAY_NAME)}" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;width:${w}px;max-width:100%;height:auto;" />`;
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
    <tr>
      <td align="center" bgcolor="#ffffff" style="background-color:#ffffff;border-radius:14px;padding:14px 18px;">
        ${img}
      </td>
    </tr>
  </table>`;
}

/** Abertura HTML compartilhada (Supabase Auth e layout transacional). */
export function transactionalEmailPageOpen(title?: string): string {
  const titleTag = title ? `<title>${escapeHtml(title)}</title>` : "";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  ${titleTag}
  <style>
    :root { color-scheme: dark; supported-color-schemes: dark; }
    body, table, td { background-color: ${EMAIL_PAGE_BG} !important; }
  </style>
</head>
<body bgcolor="${EMAIL_PAGE_BG}" style="margin:0;padding:0;background-color:${EMAIL_PAGE_BG};-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${EMAIL_PAGE_BG}" style="background-color:${EMAIL_PAGE_BG};">
    <tr>
      <td align="center" bgcolor="${EMAIL_PAGE_BG}" style="padding:32px 16px 40px;background-color:${EMAIL_PAGE_BG};">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;">
          <tr>
            <td align="center" bgcolor="${EMAIL_PAGE_BG}" style="padding-bottom:24px;background-color:${EMAIL_PAGE_BG};">
              ${transactionalEmailLogoImg()}
            </td>
          </tr>`;
}

export function transactionalEmailPageClose(): string {
  return `        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function transactionalEmailCardOpen(): string {
  return `<tr>
            <td bgcolor="${EMAIL_CARD_BG}" style="background-color:${EMAIL_CARD_BG};border:1px solid #2a2a32;border-radius:16px;padding:32px 28px;">`;
}

export function transactionalEmailCardClose(): string {
  return `            </td>
          </tr>
          <tr>
            <td align="center" bgcolor="${EMAIL_PAGE_BG}" style="padding-top:24px;background-color:${EMAIL_PAGE_BG};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#6f6a64;">
              ${escapeHtml(SITE_DISPLAY_NAME)} · <a href="https://daygomes.com.br" style="color:#ab5fd0;text-decoration:none;">daygomes.com.br</a><br />
              <a href="mailto:acesso@daygomes.com.br" style="color:#ab5fd0;text-decoration:none;">acesso@daygomes.com.br</a>
            </td>
          </tr>`;
}

export function transactionalPrimaryButton(href: string, label: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
    <tr>
      <td align="center" style="border-radius:10px;background-color:#8e3ebe;">
        <a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

export function transactionalQuoteBlock(text: string): string {
  return `<p style="margin:16px 0;padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#e8e4df;background-color:#121216;border:1px solid rgba(255,255,255,0.08);border-radius:10px;">${escapeHtml(text)}</p>`;
}

type BuildTransactionalEmailInput = {
  eyebrow: string;
  title: string;
  /** HTML seguro já montado (textos dinâmicos devem usar escapeHtml antes). */
  bodyHtml: string;
  button?: { href: string; label: string };
  footerNote?: string;
};

/** Layout escuro do site + logo nova em cartão branco (logonova-email.png). */
export function buildTransactionalEmail(input: BuildTransactionalEmailInput): string {
  const button = input.button
    ? transactionalPrimaryButton(input.button.href, input.button.label)
    : "";
  const footerNote = input.footerNote
    ? `<p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#8a847d;">${input.footerNote}</p>`
    : "";

  return `${transactionalEmailPageOpen()}
          ${transactionalEmailCardOpen()}
              <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#ab5fd0;">${escapeHtml(input.eyebrow)}</p>
              <h1 style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.3;font-weight:700;color:#f6f3ef;">${escapeHtml(input.title)}</h1>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#b7b1aa;">
                ${input.bodyHtml}
              </div>
              ${button}
              ${footerNote}
          ${transactionalEmailCardClose()}
${transactionalEmailPageClose()}`;
}
