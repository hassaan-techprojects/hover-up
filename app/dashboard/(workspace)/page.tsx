import {
  IndianRupee,
  ShoppingBag,
  Package,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
} from "lucide-react";

const stats = [
  {
    title: "Total Revenue",
    value: "₹0",
    change: "0%",
    description: "Compared to previous period",
    icon: IndianRupee,
  },
  {
    title: "Total Orders",
    value: "0",
    change: "0%",
    description: "Compared to previous period",
    icon: ShoppingBag,
  },
  {
    title: "Total Products",
    value: "0",
    change: "0%",
    description: "Products in your catalogue",
    icon: Package,
  },
  {
    title: "Total Customers",
    value: "0",
    change: "0%",
    description: "Registered customers",
    icon: Users,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-[#a18c75]">
            YOUR STORE AT A GLANCE
          </p>
          <h2 className="mt-2 font-[var(--font-playfair)] text-3xl text-[#111111] sm:text-4xl">
            Welcome back.
          </h2>
          <p className="mt-2 text-sm text-[#817b72]">
            Here&apos;s what&apos;s happening with your store today.
          </p>
        </div>

        <button className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#111111] px-4 text-xs font-medium text-white transition hover:bg-[#b99a76] hover:text-[#111111]">
          <Plus size={15} />
          Quick action
        </button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-2xl border border-[#ebe6de] bg-white p-5 transition duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#817b72]">{stat.title}</p>
                <div className="rounded-xl bg-[#f5f1eb] p-2.5 text-[#92785e]">
                  <Icon size={18} strokeWidth={1.7} />
                </div>
              </div>

              <p className="mt-5 text-2xl font-semibold tracking-tight text-[#111111]">
                {stat.value}
              </p>

              <div className="mt-3 flex items-center gap-1.5">
                <ArrowUpRight size={13} className="text-[#a18c75]" />
                <span className="text-[10px] text-[#a18c75]">
                  {stat.change}
                </span>
                <span className="text-[10px] text-[#aaa39a]">
                  {stat.description}
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-[#ebe6de] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#111111]">
                Sales overview
              </h3>
              <p className="mt-1 text-xs text-[#999187]">
                Your store revenue will appear here.
              </p>
            </div>

            <select className="rounded-lg border border-[#eae6df] bg-white px-3 py-2 text-xs text-[#55514b] outline-none">
              <option>Last 30 days</option>
              <option>Last 7 days</option>
              <option>Last 90 days</option>
              <option>Last 6 months</option>
              <option>Last year</option>
            </select>
          </div>

          <div className="mt-7 flex h-[220px] items-center justify-center rounded-xl border border-dashed border-[#e8e1d7] bg-[#fcfbf9]">
            <div className="text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#f1ece4] text-[#9b846a]">
                <IndianRupee size={20} />
              </div>
              <p className="mt-3 text-xs font-medium text-[#625b52]">
                Sales chart will appear here
              </p>
              <p className="mt-1 text-[10px] text-[#aaa39a]">
                Connect your store data to view sales performance.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#ebe6de] bg-white p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-[#111111]">
            Recent activity
          </h3>
          <p className="mt-1 text-xs text-[#999187]">
            The latest updates from your store.
          </p>

          <div className="flex h-[220px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#f1ece4] text-[#9b846a]">
                <ShoppingBag size={19} />
              </div>
              <p className="mt-3 text-xs font-medium text-[#625b52]">
                No recent activity
              </p>
              <p className="mt-1 text-[10px] text-[#aaa39a]">
                New orders and updates will show here.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#ebe6de] bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#111111]">
              Store setup
            </h3>
            <p className="mt-1 text-xs text-[#999187]">
              Your dashboard is ready for the next steps.
            </p>
          </div>
          <Package size={20} className="text-[#a18c75]" />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            "Add your first product",
            "Create product categories",
            "Upload your homepage banner",
          ].map((item, index) => (
            <div
              key={item}
              className="rounded-xl bg-[#faf8f5] p-4"
            >
              <span className="text-[10px] tracking-[0.15em] text-[#a18c75]">
                STEP 0{index + 1}
              </span>
              <p className="mt-2 text-xs font-medium text-[#33302c]">
                {item}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
