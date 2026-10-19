# E-mails do Supabase Auth (Day Gomes)

Templates em HTML para colar no **Supabase Dashboard** → **Authentication** → **Email Templates**.

## Logo nos e-mails (logo nova + fundo branco)

1. Coloque a arte mestre em `public/logonova.PNG` (a mesma do login).
2. Gere os PNGs:

```bash
node scripts/strip-logonova-background.mjs
node scripts/prepare-email-logo.mjs
```

Isso cria `public/logonova-email.png` (fundo branco, sem cortes na foto/texto).

3. Faça **deploy** do site e confira no navegador:
   - `https://daygomes.com.br/logonova-email.png`
4. Os e-mails da **plataforma (Resend)** — senha na compra, reenvio admin, etc. — usam `src/lib/email/transactional-layout.ts` (mesma URL após o deploy).
5. Os e-mails de **recuperação de senha** vêm do **Supabase**: copie o HTML atualizado de cada arquivo abaixo para o painel (o Supabase **não** lê esta pasta automaticamente).

## Antes de colar no Supabase

1. Em **Authentication** → **URL Configuration**, defina **Site URL** (ex.: `https://daygomes.com.br`) e inclua em **Redirect URLs**:
   - `https://daygomes.com.br/login/atualizar-senha`
   - `http://localhost:3000/login/atualizar-senha` (desenvolvimento)

## Variáveis do Supabase

| Template no painel | Arquivo | Variável principal |
|--------------------|---------|-------------------|
| Reset password | `reset-password.html` | `{{ .ConfirmationURL }}` |
| Confirm signup | `confirm-signup.html` | `{{ .ConfirmationURL }}` |
| Magic link | `magic-link.html` | `{{ .ConfirmationURL }}` |
| Change email address | `change-email.html` | `{{ .ConfirmationURL }}` |
| Invite user | `invite-user.html` | `{{ .ConfirmationURL }}` |

Copie **só o conteúdo HTML** de cada arquivo no campo **Body** do template correspondente.

## Assuntos sugeridos (Subject)

| Template | Subject |
|----------|---------|
| Reset password | `Redefinir sua senha — Day Gomes` |
| Confirm signup | `Confirme seu e-mail — Day Gomes` |
| Magic link | `Seu link de acesso — Day Gomes` |
| Change email | `Confirmar novo e-mail — Day Gomes` |
| Invite user | `Você foi convidado — Day Gomes` |

## Remetente

Configure em **Authentication** → **SMTP Settings** (ou use o e-mail padrão do Supabase) com remetente alinhado ao projeto, ex.: `Day Gomes <acesso@daygomes.com.br>`.
