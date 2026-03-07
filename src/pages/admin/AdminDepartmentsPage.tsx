import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

const AdminDepartmentsPage = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("departments").select("*"),
      supabase.from("officers").select("id, department_id"),
    ]).then(([deptRes, offRes]) => {
      if (deptRes.data) setDepartments(deptRes.data);
      if (offRes.data) setOfficers(offRes.data);
    });
  }, []);

  return (
    <>
      <h2 className="text-2xl font-bold text-foreground font-serif mb-6">Departments</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((d) => (
          <Card key={d.id}>
            <CardContent className="p-4">
              <p className="font-bold font-serif">{d.name}</p>
              <p className="text-sm text-muted-foreground">{d.description}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Officers: {officers.filter((o) => o.department_id === d.id).length}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
};

export default AdminDepartmentsPage;
