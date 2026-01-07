import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

/* ---------- TYPES ---------- */
type Mode = "login" | "signup" | "forgot";

type User = {
  id?: number;
  name: string;
  email: string;
};

/* ---------- COMPONENT ---------- */
const Login = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    setMessage("");
  }, [mode]);

  // Notify Navbar about current auth mode and respond to toggle events
  useEffect(() => {
    try { window.dispatchEvent(new CustomEvent('authMode', { detail: mode })); } catch (e) {}
    const onToggle = () => setMode((m) => (m === 'login' ? 'signup' : 'login'));
    window.addEventListener('authToggle', onToggle);
    return () => {
      window.removeEventListener('authToggle', onToggle);
    };
  }, [mode]);

  // If a token exists in localStorage, set default Authorization header for axios
  const existingToken = localStorage.getItem("token");
  if (existingToken) axios.defaults.headers.common["Authorization"] = `Bearer ${existingToken}`;

  /* ---------- SIGN UP ---------- */
  const handleSignup = async () => {
    if (!email || !password) {
      setMessage("email and password required");
      return;
    }

    try {
      const resp = await axios.post("http://localhost:5000/api/signup", { name, email, password });
      if (resp.data && resp.data.ok) {
        setMessage("Account created. Please sign in.");
        setMode("login");
      } else if (resp.data && resp.data.error) {
        setMessage(String(resp.data.error));
      }
    } catch (e: any) {
      setMessage(e?.response?.data?.error || e.message || "Signup failed");
    }
  };

  /* ---------- LOGIN ---------- */
  const handleLogin = async () => {
    if (!email || !password) {
      setMessage("email and password required");
      return;
    }

    try {
      const resp = await axios.post("http://localhost:5000/api/login", { email, password });
      if (resp.data && resp.data.ok && resp.data.user) {
        const u: User = resp.data.user;
        const token = resp.data.token;
        localStorage.setItem("session", JSON.stringify(u));
        if (token) {
          localStorage.setItem("token", token);
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        }
        try { window.dispatchEvent(new Event('authChanged')); } catch (e) {}
        navigate("/connect-db");
      } else {
        setMessage(resp.data?.error || "Invalid credentials");
      }
    } catch (e: any) {
      setMessage(e?.response?.data?.error || e.message || "Login failed");
    }
  };

  /* ---------- FORGOT PASSWORD ---------- */
  const handleForgot = async () => {
    if (!email) {
      setMessage("email required");
      return;
    }

    try {
      const resp = await axios.post("http://localhost:5000/api/forgot-password", { email });
      if (resp.data && resp.data.ok) {
        // Try to extract a clear-text password from response
        let newPassword: string | null = null;
        if (resp.data.password) {
          newPassword = String(resp.data.password);
        } else if (typeof resp.data.message === 'string') {
          // message format: "Password reset to: newpassword123"
          const m = resp.data.message as string;
          const parts = m.split(":");
          if (parts.length > 1) {
            newPassword = parts.slice(1).join(":").trim();
          }
        }

        if (newPassword) {
          setMessage(`Password reset — new password: ${newPassword}`);
          setPassword(newPassword);
          setMode("login");
          // attempt to copy to clipboard for convenience (best-effort)
          try {
            if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(newPassword);
              setMessage(`Password reset — new password copied to clipboard`);
            }
          } catch (e) {
            // ignore clipboard errors
          }
        } else {
          setMessage(String(resp.data.message || "Password reset (check email)"));
          setMode("login");
        }
      } else {
        setMessage(resp.data?.error || "Reset failed");
      }
    } catch (e: any) {
      setMessage(e?.response?.data?.error || e.message || "Reset failed");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>
          {mode === "signup"
            ? "Create Account"
            : mode === "forgot"
            ? "Reset Password"
            : "Welcome Back"}
        </h2>

        <p style={styles.subtitle}>
          {mode === "login"
            ? "Sign in to continue"
            : mode === "signup"
            ? "Create a new account"
            : "Reset your password"}
        </p>

        {message && <div style={styles.message}>{message}</div>}

        {mode === "signup" && (
          <input
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
          />
        )}

        <input
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />

        {mode !== "forgot" && (
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />
        )}

        <button
          style={styles.button}
          onClick={
            mode === "signup"
              ? handleSignup
              : mode === "forgot"
              ? handleForgot
              : handleLogin
          }
        >
          {mode === "signup"
            ? "Create Account"
            : mode === "forgot"
            ? "Reset Password"
            : "Sign In"}
        </button>

        <div style={styles.links}>
          {mode === "login" && (
            <>
              <span onClick={() => setMode("forgot")}>
                Forgot password?
              </span>
              <span onClick={() => setMode("signup")}>
                Create account
              </span>
            </>
          )}

          {mode !== "login" && (
            <span onClick={() => setMode("login")}>
              Back to sign in
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;

/* ---------- STYLES ---------- */
const styles: { [key: string]: React.CSSProperties } = {
  page: {
    height: "100vh",
    background: "linear-gradient(135deg, #e9edf3, #f7f9fc)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    width: "380px",
    background: "#fff",
    padding: "32px",
    borderRadius: "12px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
    display: "flex",
    flexDirection: "column",
  },

  title: {
    marginBottom: "6px",
    textAlign: "center",
    fontWeight: 600,
  },

  subtitle: {
    textAlign: "center",
    fontSize: "14px",
    color: "#666",
    marginBottom: "20px",
  },

  message: {
    background: "#f1f3f5",
    padding: "8px",
    borderRadius: "6px",
    fontSize: "13px",
    marginBottom: "12px",
    textAlign: "center",
  },

  input: {
    height: "46px",
    marginBottom: "14px",
    padding: "0 12px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "14px",
  },

  button: {
    height: "46px",
    background: "#1877f2",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "6px",
  },

  links: {
    marginTop: "18px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontSize: "13px",
    color: "#1877f2",
    textAlign: "center",
    cursor: "pointer",
  },
};
