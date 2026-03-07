import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const statusLabels: Record<string, string> = {
  submitted: "Submitted", under_review: "Under Review", assigned: "Assigned",
  in_progress: "In Progress", resolved: "Resolved", rejected: "Rejected",
};

const OfficerDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [officerInfo, setOfficerInfo] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: officer } = await supabase.from("officers").select("*, departments(name)").eq("user_id", user.id).single();
      setOfficerInfo(officer);
      if (officer) {
        const { data } = await supabase.from("complaints").select("*").eq("assigned_officer_id", officer.id).order("created_at", { ascending: false });
        if (data) setComplaints(data);
      }
    };
    fetch();
  }, [user]);

  const stats = {
    total: complaints.length,
    inProgress: complaints.filter((c) => c.status === "in_progress").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
    pending: complaints.filter((c) => ["submitted", "under_review", "assigned"].includes(c.status)).length,
  };

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground font-serif">Officer Dashboard</h2>
        <p className="text-muted-foreground">
          {officerInfo ? `${officerInfo.officer_code} • ${officerInfo.departments?.name || "Unassigned"}` : "Loading..."}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Cases", value: stats.total, color: "bg-primary text-primary-foreground" },
          { label: "Pending", value: stats.pending, color: "bg-accent text-accent-foreground" },
          { label: "In Progress", value: stats.inProgress, color: "bg-blue-500 text-white" },
          { label: "Resolved", value: stats.resolved, color: "bg-green-600 text-white" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-3xl font-bold font-serif ${s.color} rounded-lg py-2`}>{s.value}</p>
              <p className="text-sm text-muted-foreground mt-2">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <h3 className="text-lg font-bold font-serif mb-3">Recent Cases</h3>
      <div className="space-y-3">
        {complaints.slice(0, 5).map((c) => (
          <Card key={c.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/officer/cases/${c.id}`)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-bold font-serif">{c.complaint_number}</p>
                <p className="text-sm text-muted-foreground capitalize">{c.category.replace("_", " ")} • {c.location}</p>
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
        {complaints.length === 0 && (
          <Card className="p-8 text-center"><p className="text-muted-foreground">No cases assigned yet.</p></Card>
        )}
      </div>
    </>
  );
};

export default OfficerDashboardPage;
