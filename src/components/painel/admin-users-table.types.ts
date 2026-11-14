import type { UserRole } from "@/lib/roles";

export type AdminUserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  cpf: string | null;
  role: UserRole;
};