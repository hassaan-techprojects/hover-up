import { redirect } from "next/navigation";

export default function DashboardLoginRedirect() {
  redirect("/account/login?callbackUrl=%2Fdashboard");
}
