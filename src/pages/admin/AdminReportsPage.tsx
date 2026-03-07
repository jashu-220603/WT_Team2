import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const statusLabels: Record<string, string> = {
  submitted: "Submitted", under_review: "Under Review", assigned: "Assigned",
  in_progress: "In Progress", resolved: "Resolved", rejected: "Rejected",
};
const COLORS = ["hsl(43, 96%, 56%)", "hsl(215, 60%, 18%)", "hsl(215, 50%, 28%)", "hsl(120, 40%, 50%)", "hsl(0, 84%, 60%)", "hsl(200, 60%, 50%)"];

const AdminReportsPage = () => {
  const [complaints, setComplaints] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("complaints").select("*").then(({ data }) => { if (data) setComplaints(data); });
  }, []);

  const statusData = Object.entries(
    complaints.reduce((acc: Record<string, number>, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name: statusLabels[name] || name, value }));

  const categoryData = Object.entries(
    complaints.reduce((acc: Record<string, number>, c) => { const cat = c.category.replace("_", " "); acc[cat] = (acc[cat] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <>
      <h2 className="text-2xl font-bold text-foreground font-serif mb-6">Analytics & Reports</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="font-serif text-base">Complaints by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
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
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis /><Tooltip />
                <Bar dataKey="value" fill="hsl(215, 60%, 18%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default AdminReportsPage;
