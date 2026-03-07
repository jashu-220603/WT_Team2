import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

const OfficerActivityPage = () => {
  const { user } = useAuth();
  const [remarks, setRemarks] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("complaint_remarks")
        .select("*, complaints(complaint_number)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setRemarks(data);
    };
    fetch();
  }, [user]);

  return (
    <>
      <h2 className="text-2xl font-bold text-foreground font-serif mb-6">Recent Activity</h2>
      <div className="space-y-3">
        {remarks.length === 0 ? (
          <Card className="p-8 text-center"><p className="text-muted-foreground">No activity yet.</p></Card>
        ) : remarks.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4">
              <p className="font-semibold font-serif text-sm">{(r as any).complaints?.complaint_number}</p>
              <p className="text-sm mt-1">{r.remark}</p>
              <p className="text-xs text-muted-foreground mt-2">{new Date(r.created_at).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
};

export default OfficerActivityPage;
