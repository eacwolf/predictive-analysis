import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import axios from "axios";

const Navbar = () => {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<'login'|'signup'|'forgot'>('login');

  const location = useLocation();
  const isAuthPage = location && location.pathname === "/login";

  const refreshSession = () => {
    try {
      const s = localStorage.getItem("session");
      if (s) {
        const u = JSON.parse(s);
        setSessionEmail(u?.email || null);
      } else {
        setSessionEmail(null);
      }
    } catch {
      setSessionEmail(null);
    }
  };

  useEffect(() => {
    // defer initial refresh to avoid synchronous setState inside effect
    setTimeout(() => refreshSession(), 0);
    const onStorage = () => refreshSession();
    const onAuthChanged = () => refreshSession();
    const onAuthMode = (e: Event) => setAuthMode(((e as CustomEvent)?.detail as 'login'|'signup'|'forgot') || 'login');
    window.addEventListener("storage", onStorage);
    window.addEventListener("authChanged", onAuthChanged);
    window.addEventListener('authMode', onAuthMode as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("authChanged", onAuthChanged);
      window.removeEventListener('authMode', onAuthMode as EventListener);
    };
  }, []);

  // Also refresh session when route/location changes (login -> /connect-db)
  useEffect(() => {
    // defer to avoid synchronous state update inside effect body
    setTimeout(() => refreshSession(), 0);
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("session");
    // remove axios default header if set
    try {
      delete axios.defaults.headers.common["Authorization"];
    } catch {
      // ignore
    }
    setSessionEmail(null);
    setMenuOpen(false);
    // notify other components (and other tabs) that auth changed
    window.dispatchEvent(new Event('authChanged'));
    navigate("/login");
  };

  return (
    <header style={styles.header}>
      <h2 style={styles.logo}>Predictive Hiring</h2>

      <nav style={styles.nav}>
        {!sessionEmail && (
          <>
            {!isAuthPage ? (
              <NavLink to="/login" style={styles.link}>
                Login
              </NavLink>
            ) : (
              <button
                onClick={() => {
                  window.dispatchEvent(new Event('authToggle'));
                }}
                style={styles.link}
              >
                {authMode === 'login' ? 'Create account' : 'Login'}
              </button>
            )}
          </>
        )}

        {!isAuthPage && (
          <>
            <NavLink to="/connect-db" style={styles.link}>
              Connect DB
            </NavLink>
            <NavLink to="/dashboard" style={styles.link}>
              Dashboard
            </NavLink>
          </>
        )}

        {sessionEmail && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen((s) => !s)}
              style={styles.userBtn}
            >
              <span style={{ marginRight: 8 }}>{sessionEmail}</span>
              <span style={{ fontSize: 12 }}>▾</span>
            </button>
            {menuOpen && (
              <div style={styles.menu}>
                <div style={styles.menuItem} onClick={handleLogout}>
                  Logout
                </div>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;

const styles: Record<string, CSSProperties> = {
  header: {
    height: "64px",
    borderBottom: "1px solid #000",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    background: "#fff",
  },
  logo: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#111",
    margin: 0,
  },
  nav: {
    display: "flex",
    gap: "18px",
    alignItems: "center",
  },
  link: {
    textDecoration: "none",
    color: "#222",
    fontSize: "14px",
    fontWeight: 600,
    padding: "6px 8px",
    borderRadius: 0,
    cursor: "pointer",
    background: "transparent",
  },
  userBtn: {
    background: "transparent",
    border: "none",
    padding: "6px 8px",
    borderRadius: 0,
    cursor: "pointer",
    color: "#222",
    fontWeight: 600,
  },
  menu: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    background: "#fff",
    boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
    borderRadius: 8,
    padding: "6px",
    minWidth: 140,
    zIndex: 1000,
  },
  menuItem: {
    padding: "8px 12px",
    cursor: "pointer",
    borderRadius: 6,
  },
};
