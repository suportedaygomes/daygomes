import type { StaffMemberDirectoryRow } from "@/lib/members/staff-member-directory";

export type StaffMemberDirectoryFilters = {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  joinedFrom: string;
  joinedTo: string;
};

export const EMPTY_STAFF_MEMBER_FILTERS: StaffMemberDirectoryFilters = {
  name: "",
  email: "",
  cpf: "",
  phone: "",
  joinedFrom: "",
  joinedTo: "",
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function parseDateInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const ms = Date.parse(`${trimmed}T00:00:00`);
    return Number.isNaN(ms) ? null : ms;
  }
  const br = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const [, d, m, y] = br;
    const ms = Date.parse(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00`);
    return Number.isNaN(ms) ? null : ms;
  }
  return null;
}

function startOfDayMs(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDayMs(ms: number) {
  const d = new Date(ms);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function filterStaffMemberDirectory(
  members: StaffMemberDirectoryRow[],
  filters: StaffMemberDirectoryFilters,
): StaffMemberDirectoryRow[] {
  const nameQ = normalizeSearchText(filters.name);
  const emailQ = normalizeSearchText(filters.email);
  const cpfQ = digitsOnly(filters.cpf);
  const phoneQ = digitsOnly(filters.phone);
  const fromMs = filters.joinedFrom ? parseDateInput(filters.joinedFrom) : null;
  const toMs = filters.joinedTo ? parseDateInput(filters.joinedTo) : null;
  const fromBound = fromMs != null ? startOfDayMs(fromMs) : null;
  const toBound = toMs != null ? endOfDayMs(toMs) : null;

  return members.filter((member) => {
    if (nameQ) {
      const name = normalizeSearchText(member.full_name ?? "");
      if (!name.includes(nameQ)) return false;
    }

    if (emailQ) {
      const email = normalizeSearchText(member.email ?? "");
      if (!email.includes(emailQ)) return false;
    }

    if (cpfQ) {
      const cpf = digitsOnly(member.cpf ?? "");
      if (!cpf.includes(cpfQ)) return false;
    }

    if (phoneQ) {
      const phone = digitsOnly(member.whatsapp ?? "");
      if (!phone.includes(phoneQ)) return false;
    }

    if (fromBound != null || toBound != null) {
      const joinedMs = member.joinedAt ? Date.parse(member.joinedAt) : NaN;
      if (Number.isNaN(joinedMs)) return false;
      if (fromBound != null && joinedMs < fromBound) return false;
      if (toBound != null && joinedMs > toBound) return false;
    }

    return true;
  });
}
