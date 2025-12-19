const sources = [
  { name: "AWS S3", desc: "Unstructured resumes & files" },
  { name: "MySQL", desc: "Structured hiring data" },
  { name: "PostgreSQL", desc: "Analytics-ready datasets" },
  { name: "MongoDB", desc: "Semi-structured documents" },
];

const DataConnect = () => {
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>Connect Data Source</h1>
        <p style={styles.subtitle}>
          Convert your raw data into structured analytics-ready format
        </p>

        <div style={styles.grid}>
          {sources.map((s) => (
            <div key={s.name} style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>{s.name}</h3>
              </div>
              <p style={styles.cardDesc}>{s.desc}</p>
              <button style={styles.button}>Connect</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DataConnect;

/* ---------- STYLES ---------- */
const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f0f2f5",
    display: "flex",
    justifyContent: "center",
    padding: "40px 20px",
  },

  container: {
    width: "100%",
    maxWidth: "1100px",
    background: "#ffffff",
    padding: "32px",
    borderRadius: "12px",
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  },

  title: {
    fontSize: "26px",
    fontWeight: 600,
    marginBottom: "6px",
  },

  subtitle: {
    fontSize: "14px",
    color: "#666",
    marginBottom: "28px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "24px",
  },

  card: {
    background: "#f9fafb",
    borderRadius: "10px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },

  cardHeader: {
    marginBottom: "10px",
  },

  cardTitle: {
    fontSize: "18px",
    fontWeight: 600,
    margin: 0,
  },

  cardDesc: {
    fontSize: "14px",
    color: "#555",
    marginBottom: "20px",
    flexGrow: 1,
  },

  button: {
    alignSelf: "flex-start",
    padding: "8px 16px",
    background: "#1877f2",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
  },
};
