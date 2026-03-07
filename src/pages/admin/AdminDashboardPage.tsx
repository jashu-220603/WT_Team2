import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const statusLabels: Record<string, string> = {
  submitted: "Submitted", under_review: "Under Review", assigned: "Assigned",
  in_progress: "In Progress", resolved: "Resolved", rejected: "Rejected",
};
const COLORS = ["hsl(43, 96%, 56%)", "hsl(215, 60%, 18%)", "hsl(215, 50%, 28%)", "hsl(120, 40%, 50%)", "hsl(0, 84%, 60%)", "hsl(200, 60%, 50%)"];

const AdminDashboardPage = () => {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [officerCount, setOfficerCount] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const [compRes, offRes] = await Promise.all([
        supabase.from("complaints").select("*").order("created_at", { ascending: false }),
        supabase.from("officers").select("id"),
      ]);
      if (compRes.data) setComplaints(compRes.data);
      if (offRes.data) setOfficerCount(offRes.data.length);
    };
    fetch();
  }, []);

  const statusData = Object.entries(
    complaints.reduce((acc: Record<string, number>, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name: statusLabels[name] || name, value }));

  const categoryData = Object.entries(
    complaints.reduce((acc: Record<string, number>, c) => { const cat = c.category.replace("_", " "); acc[cat] = (acc[cat] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const stats = {
    total: complaints.length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
    pending: complaints.filter((c) => !["resolved", "rejected"].includes(c.status)).length,
    officers: officerCount,
  };

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground font-serif">Admin Dashboard</h2>
        <p className="text-muted-foreground">Manage complaints, officers, and departments</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Complaints", value: stats.total, color: "bg-primary text-primary-foreground" },
          { label: "Pending", value: stats.pending, color: "bg-accent text-accent-foreground" },
          { label: "Resolved", value: stats.resolved, color: "bg-green-600 text-white" },
          { label: "Officers", value: stats.officers, color: "bg-blue-500 text-white" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-3xl font-bold font-serif ${s.color} rounded-lg py-2`}>{s.value}</p>
              <p className="text-sm text-muted-foreground mt-2">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="font-serif text-base">Complaints by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-serif text-base">Complaints by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis /><Tooltip />
                <Bar dataKey="value" fill="hsl(43, 96%, 56%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default AdminDashboardPage;
