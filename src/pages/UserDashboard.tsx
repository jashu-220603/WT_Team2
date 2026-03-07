import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Shield, Home, PlusCircle, FileText, LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

type Complaint = {
  id: string;
  complaint_number: string;
  category: string;
  subcategory: string;
  location: string;
  description: string;
  status: string;
  created_at: string;
};

const statusSteps = ["submitted", "under_review", "assigned", "in_progress", "resolved"];
const statusLabels: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  assigned: "Assigned to Officer",
  in_progress: "In Progress",
  resolved: "Resolved",
};

const UserDashboard = () => {
  const { user, signOut, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState(location.pathname.includes("/create") ? "create" : "complaints");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  // Form state
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", variant: "destructive" });
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          setLocationInput(data.display_name || `${latitude}, ${longitude}`);
        } catch {
          setLocationInput(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }
        setGeoLoading(false);
      },
      (err) => {
        toast({ title: "Location access denied", description: err.message, variant: "destructive" });
        setGeoLoading(false);
      }
    );
  };

  const fetchComplaints = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("complaints")
      .select("*")
      .eq("citizen_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setComplaints(data as any);
  };

  useEffect(() => {
    fetchComplaints();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { data: complaint, error } = await supabase.from("complaints").insert({
        citizen_id: user.id,
        category: category as any,
        subcategory,
        location: locationInput,
        description,
        complaint_number: "",
      }).select().single();

      if (error) throw error;

      // Upload evidence if provided
      if (evidenceFile && complaint) {
        const filePath = `${user.id}/${complaint.id}/${evidenceFile.name}`;
        const { error: uploadError } = await supabase.storage.from("evidence").upload(filePath, evidenceFile);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("evidence").getPublicUrl(filePath);
          await supabase.from("complaint_evidence").insert({
            complaint_id: complaint.id,
            file_url: urlData.publicUrl,
            file_name: evidenceFile.name,
          });
        }
      }

      toast({
        title: "Complaint Submitted!",
        description: `Your complaint ID is: ${complaint.complaint_number}`,
      });

      setCategory("");
      setSubcategory("");
      setLocationInput("");
      setDescription("");
      setEvidenceFile(null);
      setTab("complaints");
      fetchComplaints();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const subcategories: Record<string, string[]> = {
    infrastructure: ["Road", "Water", "Electricity", "Sanitation"],
    cybercrime: ["Online Fraud", "Identity Theft", "Hacking", "Cyberbullying"],
    harassment: ["Workplace", "Street", "Online", "Domestic"],
    land_issues: ["Encroachment", "Boundary Dispute", "Illegal Construction", "Land Grab"],
    other: ["Other"],
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="gov-gradient sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto flex items-center justify-between py-3 px-4">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
              <Shield className="w-4 h-4 text-accent-foreground" />
            </div>
            <span className="text-sm font-bold text-primary-foreground font-serif">CCMS - Citizen</span>
          </a>
          <nav className="flex items-center gap-1">
            {[
              { key: "home", label: "Home", icon: Home, action: () => navigate("/") },
              { key: "create", label: "Create Complaint", icon: PlusCircle, action: () => setTab("create") },
              { key: "complaints", label: "Your Complaints", icon: FileText, action: () => setTab("complaints") },
            ].map((item) => (
              <Button
                key={item.key}
                variant={tab === item.key ? "heroGold" : "ghost"}
                size="sm"
                onClick={item.action}
                className={tab === item.key ? "" : "text-primary-foreground/80 hover:text-accent hover:bg-primary-foreground/10"}
              >
                <item.icon className="w-4 h-4 mr-1 hidden sm:block" />
                <span className="hidden sm:inline">{item.label}</span>
                <item.icon className="w-4 h-4 sm:hidden" />
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={signOut} className="text-primary-foreground/80 hover:text-accent hover:bg-primary-foreground/10">
              <LogOut className="w-4 h-4" />
            </Button>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground font-serif">Welcome, {profile?.full_name || "Citizen"}</h2>
          <p className="text-muted-foreground">Manage your complaints and track their status</p>
        </div>

        {tab === "create" && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="font-serif">Create New Complaint</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={category} onValueChange={(v) => { setCategory(v); setSubcategory(""); }}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cybercrime">Cybercrime</SelectItem>
                        <SelectItem value="harassment">Harassment</SelectItem>
                        <SelectItem value="land_issues">Land Issues</SelectItem>
                        <SelectItem value="infrastructure">Infrastructure</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subcategory</Label>
                    <Select value={subcategory} onValueChange={setSubcategory} disabled={!category}>
                      <SelectTrigger><SelectValue placeholder="Select subcategory" /></SelectTrigger>
                      <SelectContent>
                        {(subcategories[category] || []).map((s) => (
                          <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Location</Label>
                  <div className="flex gap-2">
                    <Input value={locationInput} onChange={(e) => setLocationInput(e.target.value)} placeholder="Enter location" required className="flex-1" />
                    <Button type="button" variant="outline" size="sm" onClick={handleGetLocation} disabled={geoLoading} className="shrink-0">
                      {geoLoading ? "Detecting..." : "📍 Use My Location"}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your complaint in detail..." rows={5} required />
                </div>
                <div>
                  <Label>Upload Evidence (optional)</Label>
                  <Input type="file" accept="image/*,.pdf,.doc,.docx" onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)} />
                </div>
                <Button type="submit" variant="gold" className="w-full" disabled={loading || !category}>
                  {loading ? "Submitting..." : "Submit Complaint"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {tab === "complaints" && !selectedComplaint && (
          <div className="space-y-4">
            {complaints.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No complaints yet. File your first complaint.</p>
                <Button variant="gold" className="mt-4" onClick={() => setTab("create")}>Create Complaint</Button>
              </Card>
            ) : (
              complaints.map((c) => (
                <Card key={c.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedComplaint(c)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold font-serif text-foreground">{c.complaint_number}</p>
                      <p className="text-sm text-muted-foreground capitalize">{c.category.replace("_", " ")} • {c.subcategory}</p>
                      <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                      c.status === "resolved" ? "bg-green-100 text-green-800" :
                      c.status === "in_progress" ? "bg-blue-100 text-blue-800" :
                      c.status === "rejected" ? "bg-red-100 text-red-800" :
                      "bg-accent/20 text-accent-foreground"
                    }`}>
                      {statusLabels[c.status] || c.status}
                    </span>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === "complaints" && selectedComplaint && (
          <div className="max-w-2xl mx-auto">
            <Button variant="outline" size="sm" onClick={() => setSelectedComplaint(null)} className="mb-4">← Back</Button>
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">{selectedComplaint.complaint_number}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Category:</span> <span className="font-medium capitalize">{selectedComplaint.category.replace("_", " ")}</span></div>
                  <div><span className="text-muted-foreground">Subcategory:</span> <span className="font-medium capitalize">{selectedComplaint.subcategory}</span></div>
                  <div><span className="text-muted-foreground">Location:</span> <span className="font-medium">{selectedComplaint.location}</span></div>
                  <div><span className="text-muted-foreground">Filed:</span> <span className="font-medium">{new Date(selectedComplaint.created_at).toLocaleDateString()}</span></div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1">{selectedComplaint.description}</p>
                </div>

                {/* Status Tracker */}
                <div>
                  <Label className="text-muted-foreground mb-3 block">Status Tracking</Label>
                  <div className="flex items-center justify-between relative">
                    <div className="absolute top-4 left-0 right-0 h-0.5 bg-border" />
                    {statusSteps.map((step, i) => {
                      const currentIdx = statusSteps.indexOf(selectedComplaint.status);
                      const isActive = i <= currentIdx;
                      return (
                        <div key={step} className="relative z-10 flex flex-col items-center text-center flex-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            isActive ? "gold-gradient text-accent-foreground" : "bg-muted text-muted-foreground"
                          }`}>
                            {i + 1}
                          </div>
                          <span className={`text-[10px] mt-1 ${isActive ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                            {statusLabels[step]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
