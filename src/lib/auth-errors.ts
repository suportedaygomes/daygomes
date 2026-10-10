export function translateAuthError(message: string) {
  const text = message.toLowerCase();

  if (
    text.includes("invalid login credentials") ||
    text.includes("invalid_credentials")
  ) {
    return "E-mail ou senha incorretos.";
  }

  if (text.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar.";
  }

  if (text.includes("too many requests") || text.includes("rate limit")) {
    return "Muitas tentativas. Espere um instante e tente de novo.";
  }

  if (text.includes("network") || text.includes("fetch") || text.includes("failed")) {
    return "Sem conexão. Verifique a internet e tente de novo.";
  }

  return "Não foi possível entrar. Tente novamente.";
}
