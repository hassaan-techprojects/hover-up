import { redirect } from "next/navigation";
import { getDashboardAdmin } from "@/lib/dashboard-admin";
import StockPlanner from "@/components/dashboard/stock-planner";

export default async function InventoryPage() {
  const auth = await getDashboardAdmin();
  if ("error" in auth) redirect("/dashboard");

  return <StockPlanner />;
}
