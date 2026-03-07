import { Shield, Phone, Mail, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="gov-gradient py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center">
                <Shield className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="text-primary-foreground font-bold font-serif">CCMS</span>
            </div>
            <p className="text-sm text-primary-foreground/65 leading-relaxed">
              An initiative by the Government of India to provide transparent and efficient complaint resolution for citizens.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-accent mb-4 uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2">
              {["Home", "File Complaint", "Track Status", "Features", "Contact"].map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-primary-foreground/65 hover:text-accent transition-colors">{link}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-accent mb-4 uppercase tracking-wider">Contact Info</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-primary-foreground/65">
                <Phone className="w-4 h-4 text-accent" /> +91 1800-XXX-XXXX (Toll Free)
              </li>
              <li className="flex items-center gap-2 text-sm text-primary-foreground/65">
                <Mail className="w-4 h-4 text-accent" /> support@complaints.gov.in
              </li>
              <li className="flex items-center gap-2 text-sm text-primary-foreground/65">
                <MapPin className="w-4 h-4 text-accent" /> 123 Government Complex, New Delhi
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-accent mb-4 uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2">
              {["Privacy Policy", "Terms of Service", "RTI Act", "Accessibility"].map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-primary-foreground/65 hover:text-accent transition-colors">{link}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 pt-6 text-center">
          <p className="text-xs text-primary-foreground/50">
            © {new Date().getFullYear()} Citizen Complaint Management System — Government of India. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
