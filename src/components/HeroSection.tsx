import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import LoginModal from "./LoginModal";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);

  const handleFileComplaint = () => {
    if (user) navigate("/dashboard/create");
    else setLoginOpen(true);
  };

  const handleTrack = () => {
    if (user) navigate("/dashboard");
    else setLoginOpen(true);
  };

  return (
    <>
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        <img src={heroBg} alt="Government buildings cityscape" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-navy-dark/75" />

        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="inline-block px-4 py-1.5 rounded-full border border-accent/50 bg-accent/10 mb-6 animate-fade-in">
            <span className="text-sm font-medium text-accent">🏛️ Official Government Portal</span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 font-serif animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Register Your Complaint Easily
          </h2>

          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Citizens can submit complaints and track their status online. Report problems related to roads, water supply, electricity, garbage, sanitation, and other public services.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Button variant="heroGold" size="lg" className="min-w-[180px]" onClick={handleFileComplaint}>
              <FileText className="w-5 h-5 mr-2" />
              File a Complaint
            </Button>
            <Button variant="hero" size="lg" className="min-w-[180px]" onClick={handleTrack}>
              <Search className="w-5 h-5 mr-2" />
              Track Complaint
            </Button>
          </div>
        </div>
      </section>
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
};

export default HeroSection;
