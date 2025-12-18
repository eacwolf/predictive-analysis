import { NavLink } from "react-router-dom";

const Navbar = () => {
  return (
    <header style={styles.header}>
      <h2 style={styles.logo}>Predictive Hiring</h2>

      <nav style={styles.nav}>
        <NavLink to="/login" style={styles.link}>
          Login
        </NavLink>
        <NavLink to="/connect-db" style={styles.link}>
          Connect DB
        </NavLink>
        <NavLink to="/dashboard" style={styles.link}>
          Dashboard
        </NavLink>
      </nav>
    </header>
  );
};

export default Navbar;

const styles: any = {
  header: {
    height: "70px",
    borderBottom: "1px solid #000",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 40px",
  },
  logo: {
    fontSize: "20px",
    fontWeight: 700,
  },
  nav: {
    display: "flex",
    gap: "30px",
  },
  link: {
    textDecoration: "none",
    color: "#000",
    fontSize: "14px",
    fontWeight: 500,
  },
};
