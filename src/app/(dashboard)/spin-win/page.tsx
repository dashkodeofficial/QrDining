import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth";
import { can, ROLE_HOME } from "@/lib/permissions";

export default async function SpinWinIndex() {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/login");

  if (can(staff.role, "spin.manage")) {
    redirect("/spin-win/vouchers");
  } else if (can(staff.role, "spin.play")) {
    redirect("/spin-win/wheel");
  } else {
    redirect(ROLE_HOME[staff.role]);
  }
}
