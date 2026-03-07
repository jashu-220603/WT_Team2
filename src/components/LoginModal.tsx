import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User, Shield, Briefcase } from "lucide-react";

type RoleTab = "user" | "officer" | "admin";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LoginModal = ({ open, onOpenChange }: LoginModalProps) => {
  const [roleTab, setRoleTab] = useState<RoleTab>("user");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [officerDept, setOfficerDept] = useState("");
  const [adminId, setAdminId] = useState("");

  const resetFields = () => {
    setEmail(""); setPassword(""); setFullName("");
    setOfficerId(""); setOfficerDept(""); setAdminId("");
  };

  const handleUserAuth = async () => {
    setLoading(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: "Account created!", description: "Please check your email to verify your account." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Welcome back!" });
        onOpenChange(false);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleOfficerAuth = async () => {
    setLoading(true);
    try {
      const officerEmail = `${officerId.toLowerCase()}@officer.local`;
      if (isSignup) {
        if (!officerDept) {
          toast({ title: "Error", description: "Please select a department", variant: "destructive" });
          setLoading(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: officerEmail, password,
          options: { data: { full_name: officerId, is_officer: true, department: officerDept, officer_code: officerId } },
        });
        if (error) throw error;
        if (data.user) {
          await supabase.rpc("register_officer", {
            _user_id: data.user.id,
            _officer_code: officerId,
            _department_id: officerDept,
          });
        }
        toast({ title: "Officer account created!", description: "Check email to verify." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: officerEmail, password });
        if (error) throw error;
        toast({ title: "Welcome, Officer!" });
        onOpenChange(false);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAuth = async () => {
    setLoading(true);
    try {
      const adminEmail = `${adminId.toLowerCase()}@admin.local`;
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: adminEmail, password,
          options: { data: { full_name: adminId, is_admin: true } },
        });
        if (error) throw error;
        if (data.user) {
          await supabase.rpc("register_admin", { _user_id: data.user.id });
        }
        toast({ title: "Admin account created!", description: "Check email to verify." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: adminEmail, password });
        if (error) throw error;
        toast({ title: "Welcome, Admin!" });
        onOpenChange(false);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roleTab === "user") handleUserAuth();
    else if (roleTab === "officer") handleOfficerAuth();
    else handleAdminAuth();
  };

  const roles: { key: RoleTab; label: string; icon: any }[] = [
    { key: "user", label: "Citizen", icon: User },
    { key: "officer", label: "Officer", icon: Briefcase },
    { key: "admin", label: "Admin", icon: Shield },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center font-serif text-xl">
            {isSignup ? "Create Account" : "Sign In"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 justify-center mb-4">
          {roles.map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={roleTab === key ? "default" : "outline"}
              size="sm"
              onClick={() => { setRoleTab(key); resetFields(); }}
              className="flex-1"
            >
              <Icon className="w-4 h-4 mr-1" />
              {label}
            </Button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {roleTab === "user" && (
            <>
              {isSignup && (
                <div>
                  <Label>Full Name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Enter your full name" />
                </div>
              )}
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your@email.com" />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} />
              </div>
            </>
          )}

          {roleTab === "officer" && (
            <>
              <div>
                <Label>Officer ID</Label>
                <Input value={officerId} onChange={(e) => setOfficerId(e.target.value)} required placeholder="e.g. OFF-001" />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} />
              </div>
              {isSignup && (
                <div>
                  <Label>Department</Label>
                  <DepartmentSelect value={officerDept} onChange={setOfficerDept} />
                </div>
              )}
            </>
          )}

          {roleTab === "admin" && (
            <>
              <div>
                <Label>Admin ID</Label>
                <Input value={adminId} onChange={(e) => setAdminId(e.target.value)} required placeholder="e.g. ADM-001" />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} />
              </div>
            </>
          )}

          <Button type="submit" className="w-full" variant="gold" disabled={loading}>
            {loading ? "Please wait..." : isSignup ? "Create Account" : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            className="text-accent font-semibold hover:underline"
            onClick={() => { setIsSignup(!isSignup); resetFields(); }}
          >
            {isSignup ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </DialogContent>
    </Dialog>
  );
};

const DepartmentSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchDepts = async () => {
      const { data } = await supabase.from("departments").select("id, name");
      if (data) setDepartments(data);
    };
    fetchDepts();
  }, []);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select department" />
      </SelectTrigger>
      <SelectContent>
        {departments.map((d) => (
          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default LoginModal;
