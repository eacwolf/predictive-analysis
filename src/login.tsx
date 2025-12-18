import { useState } from "react";
import { useNavigate } from "react-router-dom";

/* ---------- TYPES ---------- */
type Mode = "login" | "signup" | "forgot";

type User = {
  name: string;
  email: string;
  password: string; // hashed
};

/* ---------- HELPERS ---------- */
const hashPassword = (password: string) =>
  btoa(password); // demo hash (replace with bcrypt on backend)

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

    setMessage(
      "Password reset to: newpassword123 (demo only)"
    );
    setMode("login");
  };

  return (
    <div style={styles.page}>
      <div style={styles.box}>
        <h1>
          {mode === "signup"
            ? "Create account"
            : mode === "forgot"
            ? "Reset password"
            : "Sign in"}
        </h1>

        <p style={{ minHeight: "20px" }}>{message}</p>

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
            ? "Create account"
            : mode === "forgot"
            ? "Reset password"
            : "Continue"}
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
    height: "calc(100vh - 70px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  box: {
    width: "360px",
    display: "flex",
    flexDirection: "column",
  },

  input: {
    height: "48px",
    marginBottom: "14px",
    padding: "0 14px",
    border: "1px solid #000",
  },

  button: {
    height: "48px",
    background: "#000",
    color: "#fff",
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: "16px",
  },

  links: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontSize: "13px",
    textDecoration: "underline",
    cursor: "pointer",
  },
};
