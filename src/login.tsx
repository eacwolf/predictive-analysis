import { useState } from "react";
import { useNavigate } from "react-router-dom";

/* ---------- TYPES ---------- */
type Mode = "login" | "signup" | "forgot";

type User = {
  name: string;
  email: string;
  password: string;
};

/* ---------- HELPERS ---------- */
const hashPassword = (password: string) => btoa(password);

const getUsers = (): User[] =>
  JSON.parse(localStorage.getItem("users") || "[]");

const saveUsers = (users: User[]) =>
  localStorage.setItem("users", JSON.stringify(users));

/* ---------- COMPONENT ---------- */
const Login = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  /* ---------- SIGN UP ---------- */
  const handleSignup = () => {
    const users = getUsers();
    if (users.find((u) => u.email === email)) {
      setMessage("User already exists");
      return;
    }

    users.push({
      name,
      email,
      password: hashPassword(password),
    });

    saveUsers(users);
    setMessage("Account created. Please sign in.");
    setMode("login");
  };

  /* ---------- LOGIN ---------- */
  const handleLogin = () => {
    const users = getUsers();
    const user = users.find(
      (u) =>
        u.email === email &&
        u.password === hashPassword(password)
    );

    if (!user) {
      setMessage("Invalid email or password");
      return;
    }

    localStorage.setItem("session", JSON.stringify(user));
    navigate("/dashboard");
  };

  /* ---------- FORGOT PASSWORD ---------- */
  const handleForgot = () => {
    const users = getUsers();
    const user = users.find((u) => u.email === email);

    if (!user) {
      setMessage("Email not found");
      return;
    }

    user.password = hashPassword("newpassword123");
    saveUsers(users);

    setMessage("Password reset to: newpassword123 (demo)");
    setMode("login");
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
