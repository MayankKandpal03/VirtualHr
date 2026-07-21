import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "./store/authStore";
import { authApi, getErrorMessage } from "./api/client";
import AuthPage from "./pages/AuthPage";
import JobsPage from "./pages/JobsPage";
import JobDetailPage from "./pages/JobDetailPage";
import "./App.css";

function TopBar({ user, onLogout }) {
  return (
    <header className="topbar">
      <div className="topbar-brand">VirtualHR</div>
      <div className="topbar-user">
        <span>
          {user.username} · {user.email}
        </span>
        <button type="button" className="btn-ghost" onClick={onLogout}>
          Log out
        </button>
      </div>
    </header>
  );
}

function App() {
  const { user, setSession, clearSession, isBootstrapped, setBootstrapped } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [bootError, setBootError] = useState("");

  // On every load, try to mint a fresh access token from the httpOnly refresh
  // cookie — this is what makes the session survive a page reload without
  // storing the access token itself anywhere persistent.
  useEffect(() => {
    let cancelled = false;
    authApi
      .refresh()
      .then((data) => {
        if (!cancelled) setSession(data.user, data.accessToken);
      })
      .catch((err) => {
        if (!cancelled) {
          clearSession();
          // No refresh cookie yet is the normal state for a first-time visitor —
          // only surface an error if this looks like a real connectivity problem.
          if (!err.response) setBootError(getErrorMessage(err));
        }
      })
      .finally(() => {
        if (!cancelled) setBootstrapped();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore — clearing the local session regardless
    } finally {
      clearSession();
      queryClient.clear();
      setSelectedJobId(null);
    }
  };

  if (!isBootstrapped) {
    return (
      <div className="boot-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage bootError={bootError} />;
  }

  return (
    <div className="app-shell">
      <TopBar user={user} onLogout={handleLogout} />
      <main className="app-main">
        {selectedJobId ? (
          <JobDetailPage jobId={selectedJobId} onBack={() => setSelectedJobId(null)} />
        ) : (
          <JobsPage onSelectJob={setSelectedJobId} />
        )}
      </main>
    </div>
  );
}

export default App;
