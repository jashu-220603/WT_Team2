import { UserPlus, ClipboardCheck, UserCheck, Wrench, CheckCircle } from "lucide-react";

const steps = [
  { icon: UserPlus, title: "Citizen Submits Complaint", description: "Register and submit your public complaint with all details and evidence." },
  { icon: ClipboardCheck, title: "Admin Reviews Complaint", description: "The admin reviews the submitted complaint for validity and details." },
  { icon: UserCheck, title: "Complaint Assigned to Officer", description: "Admin assigns a responsible officer from the relevant department." },
  { icon: Wrench, title: "Officer Investigates Case", description: "The assigned officer investigates and works to resolve the issue." },
  { icon: CheckCircle, title: "Complaint Resolved & Citizen Notified", description: "Once resolved, the citizen is notified with the resolution details." },
];

const HowItWorksSection = () => {
  return (
    <section id="about" className="py-20 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <span className="text-sm font-semibold uppercase tracking-widest text-accent">Process</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 font-serif">How It Works</h2>
          <div className="w-16 h-1 gold-gradient mx-auto mt-4 rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
          <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-border" />
          {steps.map((step, i) => (
            <div key={step.title} className="relative text-center animate-fade-in" style={{ animationDelay: `${i * 0.12}s` }}>
              <div className="relative z-10 w-24 h-24 mx-auto mb-5 rounded-full gov-gradient flex items-center justify-center shadow-lg border-4 border-background">
                <step.icon className="w-10 h-10 text-accent" />
              </div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-8 h-8 rounded-full gold-gradient flex items-center justify-center text-sm font-bold text-accent-foreground shadow z-20">
                {i + 1}
              </div>
              <h3 className="text-sm font-bold text-foreground mb-2 font-serif">{step.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
