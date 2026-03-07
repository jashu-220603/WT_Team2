import { Outlet } from "react-router-dom";
import DashboardHeader from "@/components/DashboardHeader";
import { LayoutDashboard, FileText, Users, Building, BarChart3 } from "lucide-react";

const navItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/complaints", label: "Complaints", icon: FileText },
  { path: "/admin/officers", label: "Officers", icon: Users },
  { path: "/admin/departments", label: "Departments", icon: Building },
  { path: "/admin/reports", label: "Reports", icon: BarChart3 },
];

const AdminLayout = () => (
  <div className="min-h-screen bg-background">
    <DashboardHeader title="CCMS — Admin Portal" navItems={navItems} />
    <div className="container mx-auto px-4 py-8">
      <Outlet />
    </div>
  </div>
);

export default AdminLayout;
