import { useEffect, useState } from "react";
import { AuthForm } from "@/app/components/AuthForm.jsx";
import { Dashboard } from "@/app/components/Dashboard.jsx";
import { Toaster } from "@/app/components/ui/sonner.jsx";

const SESSION_STORAGE_KEY = "campus-lnf:user-session";

const readStoredUser = () => {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    if (!parsed?.id || !parsed?.email) return null;
    return parsed;
  } catch (error) {
    console.error("Failed to restore user session:", error);
    return null;
  }
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => readStoredUser());

  const handleLogin = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!currentUser) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentUser));
  }, [currentUser]);

  return (
    <>
      {currentUser ? (
        <Dashboard
          user={currentUser}
          onLogout={handleLogout}
          onSessionUpdate={setCurrentUser}
        />
      ) : (
        <AuthForm onLogin={handleLogin} />
      )}
      <Toaster />
    </>
  );
}
