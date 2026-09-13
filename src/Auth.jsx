import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "./api";
import "./Auth.css";

export default function Auth({ onAuthenticated }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = mode === "login" ? await login(email, password) : await register(email, password);
      localStorage.setItem("task-manager-token", result.token);
      onAuthenticated(result.user);
      navigate("/tasks");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-container">
      <p className="auth-kicker">TASK MANAGER ACCESS</p>
      <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
      <p className="auth-copy">Use your account to keep your task workspace private.</p>
      <form className="auth-form" onSubmit={submit}>
        <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <button type="submit" disabled={busy}>{busy ? "Please wait..." : mode === "login" ? "Log in" : "Register"}</button>
      </form>
      <button className="auth-switch" type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
        {mode === "login" ? "Need an account? Register" : "Already registered? Log in"}
      </button>
    </main>
  );
}