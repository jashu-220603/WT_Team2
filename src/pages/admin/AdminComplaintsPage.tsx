import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const statusLabels: Record<string, string> = {
  submitted: "Submitted", under_review: "Under Review", assigned: "Assigned",
  in_progress: "In Progress", resolved: "Resolved", rejected: "Rejected",
};

const AdminComplaintsPage = () => {
  const { toast } = useToast();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [assignOfficer, setAssignOfficer] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    const [compRes, offRes] = await Promise.all([
      supabase.from("complaints").select("*").order("created_at", { ascending: false }),
      supabase.from("officers").select("*, departments(name)"),
    ]);
    if (compRes.data) setComplaints(compRes.data);
    if (offRes.data) setOfficers(offRes.data);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAssign = async () => {
    if (!selected || !assignOfficer) return;
    setLoading(true);
    try {
      const officer = officers.find((o) => o.id === assignOfficer);
      const { error } = await supabase.from("complaints").update({
        assigned_officer_id: assignOfficer,
        department_id: officer?.department_id || null,
        status: "assigned" as any,
      }).eq("id", selected.id);
      if (error) throw error;
      toast({ title: "Complaint assigned!" });
      setSelected(null);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (selected) {
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => setSelected(null)} className="mb-4">← Back</Button>
        <Card className="max-w-2xl mx-auto">
          <CardHeader><CardTitle className="font-serif">{selected.complaint_number}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Category:</span> <span className="font-medium capitalize">{selected.category.replace("_", " ")}</span></div>
              <div><span className="text-muted-foreground">Status:</span> <span className="font-medium">{statusLabels[selected.status]}</span></div>
              <div><span className="text-muted-foreground">Location:</span> <span className="font-medium">{selected.location}</span></div>
              <div><span className="text-muted-foreground">Filed:</span> <span className="font-medium">{new Date(selected.created_at).toLocaleDateString()}</span></div>
            </div>
            <p className="text-sm">{selected.description}</p>
            <div>
              <Label className="mb-2 block">Assign to Officer</Label>
              <Select value={assignOfficer} onValueChange={setAssignOfficer}>
                <SelectTrigger><SelectValue placeholder="Select officer" /></SelectTrigger>
                <SelectContent>
                  {officers.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.officer_code} — {o.departments?.name || "No Dept"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="gold" onClick={handleAssign} disabled={loading || !assignOfficer} className="w-full">
              {loading ? "Assigning..." : "Assign Officer"}
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-foreground font-serif mb-6">All Complaints</h2>
      <div className="space-y-3">
        {complaints.map((c) => (
          <Card key={c.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => { setSelected(c); setAssignOfficer(c.assigned_officer_id || ""); }}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-bold font-serif">{c.complaint_number}</p>
                <p className="text-sm text-muted-foreground capitalize">{c.category.replace("_", " ")} • {c.location}</p>
                <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  c.status === "resolved" ? "bg-green-100 text-green-800" :
                  c.status === "in_progress" ? "bg-blue-100 text-blue-800" :
                  c.assigned_officer_id ? "bg-purple-100 text-purple-800" :
                  "bg-accent/20 text-accent-foreground"
                }`}>{statusLabels[c.status]}</span>
                {!c.assigned_officer_id && <p className="text-xs text-destructive mt-1">Unassigned</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
};

export default AdminComplaintsPage;
