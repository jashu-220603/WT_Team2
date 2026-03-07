import { Outlet } from "react-router-dom";
import DashboardHeader from "@/components/DashboardHeader";
import { LayoutDashboard, FileText, Activity } from "lucide-react";

const navItems = [
  { path: "/officer", label: "Dashboard", icon: LayoutDashboard },
  { path: "/officer/cases", label: "Assigned Cases", icon: FileText },
  { path: "/officer/activity", label: "Activity", icon: Activity },
];

const OfficerLayout = () => (
  <div className="min-h-screen bg-background">
    <DashboardHeader title="CCMS — Officer Portal" navItems={navItems} />
    <div className="container mx-auto px-4 py-8">
      <Outlet />
    </div>
  </div>
);

export default OfficerLayout;
