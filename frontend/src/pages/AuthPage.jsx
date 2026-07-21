import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { authApi, getErrorMessage } from "../api/client";

const emptyForm = { email: "", username: "", password: "", companyName: "", phone: "" };

function AuthPage({ bootError }) {
  const setSession = useAuthStore((s) => s.setSession);
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data =
        mode === "login"
          ? await authApi.login({ email: form.email, password: form.password })
          : await authApi.register(form);
      setSession(data.user, data.accessToken);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>VirtualHR</h1>
        <p className="auth-subtitle">
          {mode === "login" ? "Log in to your account" : "Create your HR account"}
        </p>

        {(error || bootError) && <div className="alert alert-error">{error || bootError}</div>}

        <label>
          Email
          <input type="email" required value={form.email} onChange={update("email")} autoComplete="email" />
        </label>

        {mode === "register" && (
          <>
            <label>
              Username
              <input required value={form.username} onChange={update("username")} autoComplete="username" />
            </label>
            <label>
              Company name
              <input required value={form.companyName} onChange={update("companyName")} />
            </label>
            <label>
              Phone
              <input required value={form.phone} onChange={update("phone")} autoComplete="tel" />
            </label>
          </>
        )}

        <label>
          Password
          <input
            type="password"
            required
            value={form.password}
            onChange={update("password")}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </label>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
        </button>

        <button
          type="button"
          className="btn-link"
          onClick={() => {
            setError("");
            setForm(emptyForm);
            setMode(mode === "login" ? "register" : "login");
          }}
        >
          {mode === "login" ? "Need an account? Register" : "Already have an account? Log in"}
        </button>
      </form>
    </div>
  );
}

export default AuthPage;
