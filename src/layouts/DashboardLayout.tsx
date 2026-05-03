import { Outlet } from "react-router-dom";
import PortalTopNav from "@/components/portal/PortalTopNav";
import PortalSidebar from "@/components/portal/PortalSidebar";

/** Shell for `/dashboard`: same portal top nav + sidebar as cases (design consistency). */
export default function DashboardLayout() {
  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen">
      <PortalTopNav />
      <div className="flex">
        <PortalSidebar variant="dashboard" />
        <div className="flex-1 md:ml-64 w-full min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
