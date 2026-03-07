import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

const AdminOfficersPage = () => {
  const [officers, setOfficers] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("officers").select("*, departments(name)").then(({ data }) => {
      if (data) setOfficers(data);
    });
  }, []);

  return (
    <>
      <h2 className="text-2xl font-bold text-foreground font-serif mb-6">Registered Officers</h2>
      {officers.length === 0 ? (
        <Card className="p-8 text-center"><p className="text-muted-foreground">No officers registered yet.</p></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {officers.map((o) => (
            <Card key={o.id}>
              <CardContent className="p-4">
                <p className="font-bold font-serif">{o.officer_code}</p>
                <p className="text-sm text-muted-foreground">{o.departments?.name || "No Department"}</p>
                <p className="text-xs text-muted-foreground">Joined: {new Date(o.created_at).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
};

export default AdminOfficersPage;
