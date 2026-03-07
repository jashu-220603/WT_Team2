import { ShieldCheck, Upload, Activity, Eye, FileText } from "lucide-react";

const features = [
  { icon: FileText, title: "Easy Complaint Registration", description: "Simple and intuitive form to register complaints with all necessary details." },
  { icon: Activity, title: "Real-Time Complaint Tracking", description: "Track your complaint status in real-time with step-by-step progress updates." },
  { icon: Upload, title: "Evidence Upload", description: "Upload photos and documents as evidence to strengthen your complaint case." },
  { icon: ShieldCheck, title: "Department-based Case Handling", description: "Complaints are routed to the right department for efficient resolution." },
  { icon: Eye, title: "Transparent Case Resolution", description: "Complete transparency in complaint handling with public accountability." },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <span className="text-sm font-semibold uppercase tracking-widest text-accent">Why Choose Us</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 font-serif">Key Features</h2>
          <div className="w-16 h-1 gold-gradient mx-auto mt-4 rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="flex items-start gap-4 p-6 rounded-xl glass-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="shrink-0 w-12 h-12 rounded-lg gov-gradient flex items-center justify-center">
                <feature.icon className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1 font-serif">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
