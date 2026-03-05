import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs.jsx";
import { supabase } from "../../supabase";

const AUTH_UI_STORAGE_KEY = "campus-lnf:auth-ui";

const readAuthUiState = () => {
  if (typeof window === "undefined") return {};

  try {
    const saved = window.localStorage.getItem(AUTH_UI_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error("Failed to restore auth state:", error);
    return {};
  }
};

const persistAuthUiState = (state) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(AUTH_UI_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to persist auth state:", error);
  }
};

export function AuthForm({ onLogin }) {
  const [storedAuthUi] = useState(() => readAuthUiState());
  const [loginEmail, setLoginEmail] = useState(() => storedAuthUi.loginEmail ?? "");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupStudentId, setSignupStudentId] = useState("");
  const [signupContact, setSignupContact] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [activeTab, setActiveTab] = useState(() => storedAuthUi.activeTab ?? "login");
  const [status, setStatus] = useState(null);

  useEffect(() => {
    persistAuthUiState({ activeTab, loginEmail });
  }, [activeTab, loginEmail]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setStatus(null);

    try {
      const { data, error } = await supabase.rpc("user_login", {
        user_email: loginEmail,
        user_password: loginPassword,
      });

      if (error) {
        setStatus({ type: "error", message: error.message });
        return;
      }

      if (data && data.length > 0 && data[0].success) {
        try {
          const profileRes = await fetch(`http://localhost:3000/api/users/${data[0].user_id}`);
          const profileData = profileRes.ok ? await profileRes.json() : {};
          onLogin({
            id: data[0].user_id,
            email: loginEmail.trim(),
            name: profileData.name || "",
          });
        } catch {
          onLogin({
            id: data[0].user_id,
            email: loginEmail.trim(),
            name: "",
          });
        }
      } else {
        setStatus({
          type: "error",
          message: data && data.length > 0 ? data[0].message : "Invalid email or password.",
        });
      }
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setStatus(null);

    if (!signupEmail || !signupName || !signupStudentId || !signupContact || !signupPassword) {
      setStatus({ type: "error", message: "All fields are required." });
      return;
    }

    const parsedStudentId = Number.parseInt(signupStudentId, 10);
    if (Number.isNaN(parsedStudentId)) {
      setStatus({ type: "error", message: "Student ID must be a valid number." });
      return;
    }

    const parsedContact = Number.parseInt(signupContact, 10);
    if (Number.isNaN(parsedContact)) {
      setStatus({ type: "error", message: "Contact number must be a valid number." });
      return;
    }

    try {
      const { error } = await supabase.rpc("user_signup", {
        user_name: signupName.trim(),
        user_contact: parsedContact,
        user_email: signupEmail.trim(),
        user_student_id: parsedStudentId,
        user_password: signupPassword,
      });

      if (error) {
        setStatus({ type: "error", message: error.message });
        return;
      }

      setSignupName("");
      setSignupEmail("");
      setSignupStudentId("");
      setSignupContact("");
      setSignupPassword("");
      setStatus({ type: "success", message: "Signup complete. You can log in now." });
      setActiveTab("login");
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-36px_rgba(12,30,66,0.45)] sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Campus Lost & Found</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in to continue</p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(nextTab) => {
            setActiveTab(nextTab);
            setStatus(null);
          }}
        >
          <TabsList className="grid h-11 w-full grid-cols-2 rounded-lg bg-slate-100 p-1">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="pt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="student@university.edu"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  required
                />
              </div>

              {status && (
                <p
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    status.type === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {status.message}
                </p>
              )}

              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="pt-4">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Full Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Jane Doe"
                  value={signupName}
                  onChange={(event) => setSignupName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="student@university.edu"
                  value={signupEmail}
                  onChange={(event) => setSignupEmail(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="signup-contact">Contact Number</Label>
                  <Input
                    id="signup-contact"
                    type="number"
                    placeholder="e.g. 1712345678"
                    value={signupContact}
                    onChange={(event) => setSignupContact(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-student-id">Student ID</Label>
                  <Input
                    id="signup-student-id"
                    type="number"
                    placeholder="e.g. 20231234"
                    value={signupStudentId}
                    onChange={(event) => setSignupStudentId(event.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={signupPassword}
                  onChange={(event) => setSignupPassword(event.target.value)}
                  required
                />
              </div>

              {status && (
                <p
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    status.type === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {status.message}
                </p>
              )}

              <Button type="submit" className="w-full">
                Create Account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
