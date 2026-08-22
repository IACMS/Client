import { Outlet } from "react-router-dom";
import PortalTopNav from "@/components/portal/PortalTopNav";
import PortalSidebar from "@/components/portal/PortalSidebar";
import { SidebarProvider } from "@/context/SidebarContext";

/** Shell for `/agencies` and agency profile routes — matches cases portal chrome. */
export default function AgenciesLayout() {
  return (
    <SidebarProvider>
      <div className="bg-surface text-on-surface min-h-screen">
        <PortalTopNav />
        <div className="flex">
          <PortalSidebar variant="cases" />
          <div className="flex-1 md:ml-64 w-full min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
