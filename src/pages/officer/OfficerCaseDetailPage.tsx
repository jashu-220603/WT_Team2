import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";

const statusLabels: Record<string, string> = {
  submitted: "Submitted", under_review: "Under Review", assigned: "Assigned",
  in_progress: "In Progress", resolved: "Resolved", rejected: "Rejected",
};

const OfficerCaseDetailPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { caseId } = useParams();
  const [complaint, setComplaint] = useState<any>(null);
  const [newStatus, setNewStatus] = useState("");
  const [remark, setRemark] = useState("");
  const [remarks, setRemarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!caseId) return;
    const fetch = async () => {
      const { data } = await supabase.from("complaints").select("*").eq("id", caseId).single();
      if (data) { setComplaint(data); setNewStatus(data.status); }
      const { data: remarksData } = await supabase.from("complaint_remarks").select("*").eq("complaint_id", caseId).order("created_at", { ascending: true });
      if (remarksData) setRemarks(remarksData);
    };
    fetch();
  }, [caseId]);

  const handleUpdateStatus = async () => {
    if (!complaint || !newStatus) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("complaints").update({ status: newStatus as any }).eq("id", complaint.id);
      if (error) throw error;
      if (remark.trim()) {
        await supabase.from("complaint_remarks").insert({ complaint_id: complaint.id, user_id: user!.id, remark: remark.trim() });
      }
      toast({ title: "Status updated!" });
      navigate("/officer/cases");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!complaint) return <p className="text-muted-foreground">Loading case...</p>;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => navigate("/officer/cases")} className="mb-4">← Back to Cases</Button>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="font-serif">{complaint.complaint_number}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Category:</span> <span className="font-medium capitalize">{complaint.category.replace("_", " ")}</span></div>
            <div><span className="text-muted-foreground">Status:</span> <span className="font-medium">{statusLabels[complaint.status]}</span></div>
            <div><span className="text-muted-foreground">Location:</span> <span className="font-medium">{complaint.location}</span></div>
            <div><span className="text-muted-foreground">Filed:</span> <span className="font-medium">{new Date(complaint.created_at).toLocaleDateString()}</span></div>
          </div>
          <div><Label className="text-muted-foreground">Description</Label><p className="text-sm mt-1">{complaint.description}</p></div>

          <div>
            <Label>Update Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Add Remark</Label>
            <Textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Add investigation notes..." rows={3} />
          </div>

          <Button variant="gold" onClick={handleUpdateStatus} disabled={loading} className="w-full">
            {loading ? "Updating..." : "Update Status"}
          </Button>

          {remarks.length > 0 && (
            <div className="mt-4">
              <Label className="text-muted-foreground">Remarks History</Label>
              <div className="space-y-2 mt-2">
                {remarks.map((r) => (
                  <div key={r.id} className="p-3 bg-muted rounded-lg text-sm">
                    <p>{r.remark}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default OfficerCaseDetailPage;
