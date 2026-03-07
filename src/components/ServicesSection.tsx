import { FileText, Search, Gavel, Upload } from "lucide-react";

const services = [
  {
    icon: FileText,
    title: "Submit Complaint",
    description: "File your grievance online with detailed information and supporting documents.",
  },
  {
    icon: Search,
    title: "Track Complaint Status",
    description: "Monitor the real-time progress of your submitted complaints with tracking ID.",
  },
  {
    icon: Gavel,
    title: "Government Action",
    description: "View actions taken by government officers on reported public issues.",
  },
  {
    icon: Upload,
    title: "Evidence Upload",
    description: "Attach photos, videos, and documents as evidence for stronger complaints.",
  },
];

const ServicesSection = () => {
  return (
    <section id="services" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <span className="text-sm font-semibold uppercase tracking-widest text-accent">
            Our Services
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 font-serif">
            What We Offer
          </h2>
          <div className="w-16 h-1 gold-gradient mx-auto mt-4 rounded-full" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, i) => (
            <div
              key={service.title}
              className="group glass-card rounded-xl p-6 text-center hover:shadow-xl hover:-translate-y-2 transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="w-16 h-16 mx-auto mb-5 rounded-xl gov-gradient flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <service.icon className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2 font-serif">
                {service.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
