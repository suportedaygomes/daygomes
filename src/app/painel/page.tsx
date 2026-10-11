import { AdminDashboard } from "@/components/painel/admin-dashboard";
import { CorrectorDashboard } from "@/components/painel/corrector-dashboard";
import { MemberDashboard } from "@/components/painel/member-dashboard";
import { getCurrentProfile, getDisplayName } from "@/lib/auth/profile";
import { getAdminDashboardStats } from "@/lib/admin/dashboard-stats";
import { getCorrectorDashboardStats } from "@/lib/corrector/dashboard-stats";
import { getMemberDashboardStats } from "@/lib/member/dashboard-stats";

export const dynamic = "force-dynamic";

export default async function PainelHomePage() {
  const { user, profile } = await getCurrentProfile();

  if (!user || !profile) {
    return null;
  }

  const name = getDisplayName(user, profile);
  const firstName = name.split(/\s+/)[0] ?? name;

  if (profile.role === "corretor") {
    const stats = await getCorrectorDashboardStats(user.id);
    return <CorrectorDashboard firstName={firstName} stats={stats} />;
  }

  if (profile.role === "membro") {
    const stats = await getMemberDashboardStats(user.id);
    return <MemberDashboard firstName={firstName} stats={stats} />;
  }

  if (profile.role === "admin") {
    const stats = await getAdminDashboardStats(user.id);
    return <AdminDashboard firstName={firstName} stats={stats} />;
  }

  return null;
}
