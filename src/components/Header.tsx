import { useState } from "react";
import { Shield, Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import LoginModal from "./LoginModal";

const navLinks = [
  { label: "Home", href: "#" },
  { label: "About Us", href: "#about" },
  { label: "Features", href: "#features" },
  { label: "Contact", href: "#contact" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();

  const handleDashboard = () => {
    if (roles.includes("admin")) navigate("/admin");
    else if (roles.includes("officer")) navigate("/officer");
    else navigate("/dashboard");
  };

  return (
    <>
      <header className="gov-gradient sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto flex items-center justify-between py-3 px-4">
          <a href="/" className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent">
              <Shield className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-sm md:text-base font-bold text-primary-foreground leading-tight font-serif">
                Citizen Complaint Management Portal
              </h1>
              <p className="text-[10px] md:text-xs text-primary-foreground/70">
                Government of India
              </p>
            </div>
          </a>

          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-3 py-2 text-sm text-primary-foreground/85 hover:text-accent transition-colors rounded-md hover:bg-primary-foreground/10"
              >
                {link.label}
              </a>
            ))}
            {user ? (
              <div className="flex items-center gap-2 ml-2">
                <Button variant="heroGold" size="sm" onClick={handleDashboard}>
                  Dashboard
                </Button>
                <Button variant="hero" size="sm" onClick={signOut}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button variant="heroGold" size="sm" className="ml-2" onClick={() => setLoginOpen(true)}>
                Login / Signup
              </Button>
            )}
          </nav>

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X /> : <Menu />}
          </Button>
        </div>

        {mobileOpen && (
          <nav className="lg:hidden border-t border-primary-foreground/10 pb-4">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block px-6 py-3 text-sm text-primary-foreground/85 hover:text-accent hover:bg-primary-foreground/5 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            {user ? (
              <div className="px-6 py-2 flex gap-2">
                <Button variant="heroGold" size="sm" onClick={handleDashboard} className="flex-1">
                  Dashboard
                </Button>
                <Button variant="hero" size="sm" onClick={signOut}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="px-6 py-2">
                <Button variant="heroGold" size="sm" className="w-full" onClick={() => { setLoginOpen(true); setMobileOpen(false); }}>
                  Login / Signup
                </Button>
              </div>
            )}
          </nav>
        )}
      </header>
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
};

export default Header;
