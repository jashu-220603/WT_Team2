import { Shield, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface DashboardHeaderProps {
  title: string;
  navItems: NavItem[];
}

const DashboardHeader = ({ title, navItems }: DashboardHeaderProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="gov-gradient sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto flex items-center justify-between py-3 px-4">
        <a href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
            <Shield className="w-4 h-4 text-accent-foreground" />
          </div>
          <span className="text-sm font-bold text-primary-foreground font-serif">{title}</span>
        </a>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant={isActive ? "heroGold" : "ghost"}
                size="sm"
                onClick={() => navigate(item.path)}
                className={isActive ? "" : "text-primary-foreground/80 hover:text-accent hover:bg-primary-foreground/10"}
              >
                <item.icon className="w-4 h-4 mr-1" />
                {item.label}
              </Button>
            );
          })}
          <Button variant="ghost" size="sm" onClick={signOut} className="text-primary-foreground/80 hover:text-accent hover:bg-primary-foreground/10">
            <LogOut className="w-4 h-4" />
          </Button>
        </nav>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-primary-foreground hover:bg-primary-foreground/10"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {mobileOpen && (
        <nav className="md:hidden border-t border-primary-foreground/10 pb-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                className={`w-full flex items-center gap-2 px-6 py-3 text-sm transition-colors ${
                  isActive ? "text-accent bg-primary-foreground/10" : "text-primary-foreground/85 hover:text-accent hover:bg-primary-foreground/5"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
          <div className="px-6 py-2">
            <Button variant="hero" size="sm" onClick={signOut} className="w-full">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
};

export default DashboardHeader;
