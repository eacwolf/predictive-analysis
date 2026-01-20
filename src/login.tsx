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

type ValidationError = {
  field: string;
  message: string;
};

/* ---------- VALIDATION HELPERS ---------- */
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password: string): string[] => {
  const errors: string[] = [];
  if (password.length < 8) errors.push("Password must be at least 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("Password must contain uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("Password must contain lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("Password must contain number");
  if (!/[!@#$%^&*]/.test(password)) errors.push("Password must contain special character (!@#$%^&*)");
  return errors;
};

const validateName = (name: string): string | null => {
  if (name.trim().length < 1) return "Name cannot be empty";
  if (name.length > 50) return "Name must be less than 50 characters";
  return null;
};

/* ---------- COMPONENT ---------- */
const Login = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    setMessage("");
    setValidationErrors([]);
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
    const errors: ValidationError[] = [];

    // Validate first name
    const firstNameError = validateName(firstName);
    if (firstNameError) errors.push({ field: "firstName", message: `First name: ${firstNameError}` });

    // Validate last name
    const lastNameError = validateName(lastName);
    if (lastNameError) errors.push({ field: "lastName", message: `Last name: ${lastNameError}` });

    // Validate email
    if (!email) {
      errors.push({ field: "email", message: "Email is required" });
    } else if (!validateEmail(email)) {
      errors.push({ field: "email", message: "Please enter a valid email address" });
    }

    // Validate password
    if (!password) {
      errors.push({ field: "password", message: "Password is required" });
    } else {
      const passwordErrors = validatePassword(password);
      if (passwordErrors.length > 0) {
        errors.push({ field: "password", message: passwordErrors.join("; ") });
      }
    }

    // Validate confirm password
    if (!confirmPassword) {
      errors.push({ field: "confirmPassword", message: "Please confirm your password" });
    } else if (password !== confirmPassword) {
      errors.push({ field: "confirmPassword", message: "Passwords do not match" });
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      setMessage("");
      return;
    }

    setValidationErrors([]);

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const resp = await axios.post("http://localhost:5000/api/signup", { 
        name: fullName, 
        email, 
        password 
      });
      if (resp.data && resp.data.ok) {
        setMessage("Account created. Please sign in.");
        setFirstName("");
        setLastName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
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

        {validationErrors.length > 0 && (
          <div style={styles.errorBox}>
            {validationErrors.map((err) => (
              <div key={err.field} style={styles.errorText}>
                • {err.message}
              </div>
            ))}
          </div>
        )}

        {mode === "signup" && (
          <>
            <div style={styles.nameRow}>
              <input
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={styles.nameInput}
              />
              <input
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={styles.nameInput}
              />
            </div>
          </>
        )}

        <input
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />

        {mode !== "forgot" && (
          <div style={styles.passwordWrapper}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.passwordInput}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </button>
          </div>
        )}

        {mode === "signup" && (
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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

  errorBox: {
    background: "#ffebee",
    border: "1px solid #ef5350",
    padding: "12px",
    borderRadius: "6px",
    marginBottom: "12px",
  },

  errorText: {
    color: "#c62828",
    fontSize: "12px",
    lineHeight: "1.5",
  },

  input: {
    height: "46px",
    marginBottom: "14px",
    padding: "0 12px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "14px",
  },

  passwordInput: {
    height: "46px",
    padding: "0 12px 0 12px",
    paddingRight: "45px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "14px",
    width: "100%",
    boxSizing: "border-box" as const,
  },

  nameRow: {
    display: "flex",
    gap: "10px",
    marginBottom: "14px",
  },

  nameInput: {
    flex: 1,
    height: "46px",
    padding: "0 12px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "14px",
  },

  passwordWrapper: {
    position: "relative",
    marginBottom: "14px",
    display: "flex",
    alignItems: "center",
  },

  eyeButton: {
    position: "absolute",
    right: "12px",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#666",
    transition: "color 0.2s ease",
  } as React.CSSProperties,

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
