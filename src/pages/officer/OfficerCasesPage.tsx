import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const statusLabels: Record<string, string> = {
  submitted: "Submitted", under_review: "Under Review", assigned: "Assigned",
  in_progress: "In Progress", resolved: "Resolved", rejected: "Rejected",
};

const OfficerCasesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: officer } = await supabase.from("officers").select("id").eq("user_id", user.id).single();
      if (officer) {
        const { data } = await supabase.from("complaints").select("*").eq("assigned_officer_id", officer.id).order("created_at", { ascending: false });
        if (data) setComplaints(data);
      }
    };
    fetch();
  }, [user]);

  return (
    <>
      <h2 className="text-2xl font-bold text-foreground font-serif mb-6">Assigned Cases</h2>
      <div className="space-y-3">
        {complaints.length === 0 ? (
          <Card className="p-8 text-center"><p className="text-muted-foreground">No cases assigned yet.</p></Card>
        ) : complaints.map((c) => (
          <Card key={c.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/officer/cases/${c.id}`)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-bold font-serif">{c.complaint_number}</p>
                <p className="text-sm text-muted-foreground capitalize">{c.category.replace("_", " ")} • {c.location}</p>
                <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                c.status === "resolved" ? "bg-green-100 text-green-800" :
                c.status === "in_progress" ? "bg-blue-100 text-blue-800" :
                "bg-accent/20 text-accent-foreground"
              }`}>
                {statusLabels[c.status]}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
};

export default OfficerCasesPage;
