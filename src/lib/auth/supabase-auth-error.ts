import type { AuthError } from "@supabase/supabase-js";

export function formatSupabaseAuthError(error: AuthError | null | undefined) {
  if (!error) return "unknown";
  const parts = [error.message];
  if (error.status) parts.push(`status=${error.status}`);
  if (error.code) parts.push(`code=${error.code}`);
  return parts.join(" | ");
}

export function isAuthEmailAlreadyRegistered(error: AuthError | null | undefined) {
  const message = (error?.message ?? "").toLowerCase();
  return (
    message.includes("already") ||
    message.includes("registered") ||
    message.includes("exists") ||
    error?.code === "email_exists"
  );
}
